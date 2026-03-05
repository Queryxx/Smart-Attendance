import { hashPassword, verifyPassword } from "@/lib/auth"
import sql from "@/lib/db"
import { cookies } from "next/headers"

export async function POST(request: Request) {
    try {
        const cookieStore = await cookies()
        const adminSession = cookieStore.get("admin_session")?.value

        if (!adminSession) {
            return Response.json({ message: "Unauthorized" }, { status: 401 })
        }

        const adminId = parseInt(adminSession, 10)
        if (isNaN(adminId)) {
            return Response.json({ message: "Invalid session" }, { status: 401 })
        }

        const { currentPassword, newPassword, confirmPassword } = await request.json()

        if (!currentPassword || !newPassword || !confirmPassword) {
            return Response.json({ message: "All fields are required" }, { status: 400 })
        }

        if (newPassword !== confirmPassword) {
            return Response.json({ message: "New passwords do not match" }, { status: 400 })
        }

        if (newPassword.length < 6) {
            return Response.json({ message: "New password must be at least 6 characters" }, { status: 400 })
        }

        // Fetch current admin's password hash
        const admins = await sql("SELECT password_hash FROM admins WHERE id = $1", [adminId])
        if (admins.length === 0) {
            return Response.json({ message: "Account not found" }, { status: 404 })
        }

        const isPasswordValid = await verifyPassword(currentPassword, admins[0].password_hash)
        if (!isPasswordValid) {
            return Response.json({ message: "Current password is incorrect" }, { status: 401 })
        }

        const newHash = await hashPassword(newPassword)
        await sql("UPDATE admins SET password_hash = $1 WHERE id = $2", [newHash, adminId])

        return Response.json({ message: "Password updated successfully", success: true })
    } catch (error) {
        console.error("Change password error:", error)
        return Response.json({ message: "Internal server error" }, { status: 500 })
    }
}
