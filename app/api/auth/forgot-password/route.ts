import { NextResponse } from "next/server"
import sql from "@/lib/db"
import { hashPassword } from "@/lib/auth"
import nodemailer from "nodemailer"

// Configure nodemailer with environment variables
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: process.env.SMTP_PORT === "465", // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
})

export async function POST(req: Request) {
    try {
        const { action, email, otp, newPassword } = await req.json()

        if (action === "send-otp") {
            // 1. Check if admin exists
            const admins = await sql("SELECT email FROM admins WHERE email = $1", [email])
            if (admins.length === 0) {
                return NextResponse.json({ message: "No account found with this email" }, { status: 404 })
            }

            // 2. Generate 6-digit OTP
            const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString()
            const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes expiry

            // 3. Store OTP in admins table
            await sql(
                "UPDATE admins SET reset_otp = $1, otp_expires_at = $2 WHERE email = $3",
                [generatedOtp, expiresAt, email]
            )

            // 4. Send Email
            const mailOptions = {
                from: process.env.SMTP_FROM,
                to: email,
                subject: "Verification Code - Smart Attendance Recovery",
                html: `
          <div style="font-family: sans-serif; max-width: 500px; margin: auto; padding: 25px; border: 1px solid #eef2f6; border-radius: 20px; background-color: #ffffff; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);">
            <h2 style="color: #0f172a; text-align: center; font-size: 24px; font-weight: 800; margin-bottom: 8px;">SMART ATTENDANCE</h2>
            <p style="color: #64748b; text-align: center; font-size: 14px; margin-bottom: 24px;">Security Verification Portal</p>
            <p style="color: #475569; font-size: 15px; line-height: 1.6;">You requested a password reset. Please use the following one-time password to verify your account identity:</p>
            <div style="text-align: center; margin: 35px 0;">
              <span style="font-size: 38px; font-weight: 900; letter-spacing: 12px; color: #3b82f6; background: #f8fafc; padding: 15px 30px; border-radius: 12px; border: 2px solid #e2e8f0; display: inline-block;">${generatedOtp}</span>
            </div>
            <p style="font-size: 13px; color: #94a3b8; text-align: center; margin-top: 24px;">This code will expire in 10 minutes. If you did not request this, please ignore this message.</p>
            <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #f1f5f9; text-align: center;">
              <p style="font-size: 12px; color: #cbd5e1;">&copy; 2026 ASISTENDANCE. Abra State Institute of Sciences and Technology.</p>
            </div>
          </div>
        `,
            }

            await transporter.sendMail(mailOptions)

            return NextResponse.json({ message: "OTP sent successfully" })
        }

        if (action === "verify-otp") {
            const rows = await sql(
                "SELECT email FROM admins WHERE email = $1 AND reset_otp = $2 AND otp_expires_at > NOW()",
                [email, otp]
            )

            if (rows.length === 0) {
                return NextResponse.json({ message: "Invalid or expired OTP" }, { status: 400 })
            }

            return NextResponse.json({ message: "OTP verified correctly" })
        }

        if (action === "reset-password") {
            // 1. Verify OTP one last time
            const rows = await sql(
                "SELECT email FROM admins WHERE email = $1 AND reset_otp = $2 AND otp_expires_at > NOW()",
                [email, otp]
            )

            if (rows.length === 0) {
                return NextResponse.json({ message: "Verification session expired" }, { status: 401 })
            }

            // 2. Hash and update
            const hashed = await hashPassword(newPassword)
            await sql(
                "UPDATE admins SET password_hash = $1, reset_otp = NULL, otp_expires_at = NULL WHERE email = $2",
                [hashed, email]
            )

            return NextResponse.json({ message: "Password updated successfully" })
        }

        return NextResponse.json({ message: "Invalid action" }, { status: 400 })
    } catch (error: any) {
        console.error("Forgot Password Error:", error)
        return NextResponse.json({ message: error.message || "Internal server error" }, { status: 500 })
    }
}
