import { hashPassword } from "@/lib/auth"
import sql from "@/lib/db"
import { cookies } from "next/headers"
import crypto from "crypto"
import nodemailer from "nodemailer"

async function checkSuperAdmin() {
    try {
        const cookieStore = await cookies()
        const sessionToken = cookieStore.get("admin_session")?.value

        if (!sessionToken) return false

        const adminId = parseInt(sessionToken)
        if (isNaN(adminId)) return false

        const result = await sql("SELECT role FROM admins WHERE id = $1", [adminId])
        return result.length > 0 && result[0].role === 'superadmin'
    } catch (error) {
        console.error("Error checking super admin:", error)
        return false
    }
}

export async function GET() {
    if (!(await checkSuperAdmin())) {
        return Response.json({ message: "Unauthorized" }, { status: 403 })
    }

    try {
        const admins = await sql("SELECT id, username, full_name, email, role FROM admins ORDER BY full_name")
        return Response.json(admins)
    } catch (error) {
        console.error("Error fetching admins:", error)
        return Response.json({ message: "Error fetching admins" }, { status: 500 })
    }
}

export async function POST(request: Request) {
    if (!(await checkSuperAdmin())) {
        return Response.json({ message: "Unauthorized" }, { status: 403 })
    }

    try {
        const { username, full_name, email, password, role } = await request.json()

        if (!username || !full_name || !email || !role) {
            return Response.json({ message: "Missing required fields" }, { status: 400 })
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(email)) {
            return Response.json({ message: "Invalid email format" }, { status: 400 })
        }

        // Validate role
        const validRoles = ["superadmin", "fine_manager", "receipt_manager", "student_registrar"]
        if (!validRoles.includes(role)) {
            return Response.json({ message: "Invalid role" }, { status: 400 })
        }

        // Check if user already exists
        const existingUser = await sql("SELECT id FROM admins WHERE username = $1 OR email = $2", [username, email])
        if (existingUser.length > 0) {
            return Response.json({ message: "Username or email already registered" }, { status: 409 })
        }

        // If password not provided, generate a secure random password
        const generatedPassword = password && password.trim().length > 0 ? password : crypto.randomBytes(8).toString("hex")

        const passwordHash = await hashPassword(generatedPassword)

        await sql("INSERT INTO admins (username, email, password_hash, full_name, role) VALUES ($1, $2, $3, $4, $5)", [username, email, passwordHash, full_name, role])

        // Attempt to send email with credentials if SMTP config is present
        try {
            const host = process.env.SMTP_HOST
            const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : undefined
            const user = process.env.SMTP_USER
            const pass = process.env.SMTP_PASS
            // support multiple env var names for the From address
            const from = (process.env.FROM_EMAIL || process.env.SMTP_FROM || process.env.SMTP_USER) ?? undefined

            if (host && port && user && pass && from) {
                const transporter = nodemailer.createTransport({
                    host,
                    port,
                    secure: port === 465,
                    auth: { user, pass },
                    // For development with Gmail SMTP certificate issues
                    tls: {
                        rejectUnauthorized: process.env.NODE_ENV === 'production'
                    }
                })

                const appUrl = process.env.APP_URL || `http://localhost:${process.env.PORT || 3000}`
                const mailOptions = {
                    from,
                    to: email,
                    subject: "Your account has been created",
                    text: `Hello ${full_name},\n\nAn admin account was created for you.\n\nUsername: ${username}\nPassword: ${generatedPassword}\n\nPlease sign in and change your password immediately: ${appUrl}/login`,
                    html: `
            <div style="font-family: Arial, Helvetica, sans-serif; color: #111;">
              <div style="max-width:600px;margin:0 auto;padding:20px;border:1px solid #e5e7eb;border-radius:8px;background:#ffffff;">
                <h2 style="color:#0f172a;margin-bottom:8px">Your Account</h2>
                <p style="margin:0 0 16px;color:#334155">Hello <strong>${full_name}</strong>,</p>
                <p style="margin:0 0 16px;color:#475569">An admin account has been created for you. Use the credentials below to sign in, then change your password immediately.</p>

                <table style="width:100%;border-collapse:collapse;margin:12px 0;">
                  <tr>
                    <td style="padding:8px;background:#f8fafc;border:1px solid #e6eef8;width:30%"><strong>Username</strong></td>
                    <td style="padding:8px;border:1px solid #e6eef8">${username}</td>
                  </tr>
                  <tr>
                    <td style="padding:8px;background:#f8fafc;border:1px solid #e6eef8"><strong>Password</strong></td>
                    <td style="padding:8px;border:1px solid #e6eef8">${generatedPassword}</td>
                  </tr>
                </table>

                <p style="margin:12px 0"><a href="${appUrl}/login" style="display:inline-block;padding:10px 16px;background:#111827;color:#fff;border-radius:6px;text-decoration:none">Sign in to the Admin Panel</a></p>

                <p style="margin-top:18px;color:#64748b;font-size:13px">If you didn't expect this email, please contact your administrator.</p>
                <hr style="border:none;border-top:1px solid #eef2f7;margin:18px 0" />
                <p style="color:#94a3b8;font-size:12px;margin:0">&copy; ${new Date().getFullYear()} Your Organization</p>
              </div>
            </div>
          `,
                }

                const info = await transporter.sendMail(mailOptions)
                console.log("Admin creation email sent:", info.messageId)
            } else {
                console.log("SMTP not configured or missing vars; skipping email send. Generated password:", generatedPassword)
            }
        } catch (mailError) {
            console.error("Failed to send admin creation email:", mailError)
        }

        return Response.json({ message: "Admin created" }, { status: 201 })
    } catch (error) {
        console.error("Error creating admin:", error)
        return Response.json({ message: "Error creating admin" }, { status: 500 })
    }
}
