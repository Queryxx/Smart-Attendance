import sql from "@/lib/db"
import { cookies } from "next/headers"

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

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await checkSuperAdmin())) {
    return Response.json({ message: "Unauthorized" }, { status: 403 })
  }

  try {
    const { id } = await params
    const { username, full_name, email, role } = await request.json()

    if (!username || !full_name || !email || !role) {
      return Response.json({ message: "Missing required fields" }, { status: 400 })
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return Response.json({ message: "Invalid email format" }, { status: 400 })
    }

    // Validate role
    const validRoles = ['superadmin', 'fine_manager', 'receipt_manager', 'student_registrar']
    if (!validRoles.includes(role)) {
      return Response.json({ message: "Invalid role" }, { status: 400 })
    }

    // Check if username or email already exists for another user
    const existingUser = await sql("SELECT id FROM admins WHERE (username = $1 OR email = $2) AND id != $3", [username, email, id])
    if (existingUser.length > 0) {
      return Response.json({ message: "Username or email already exists" }, { status: 409 })
    }

    await sql("UPDATE admins SET username = $1, full_name = $2, email = $3, role = $4 WHERE id = $5", [
      username,
      full_name,
      email,
      role,
      id,
    ])

    return Response.json({ message: "Admin updated" })
  } catch (error) {
    console.error("Error updating admin:", error)
    return Response.json({ message: "Error updating admin" }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await checkSuperAdmin())) {
    return Response.json({ message: "Unauthorized" }, { status: 403 })
  }

  try {
    const { id } = await params
    await sql("DELETE FROM admins WHERE id = $1", [id])
    return Response.json({ message: "Admin deleted" })
  } catch (error) {
    console.error("Error deleting admin:", error)
    return Response.json({ message: "Error deleting admin" }, { status: 500 })
  }
}
