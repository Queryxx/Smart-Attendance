import { hashPassword } from "@/lib/auth"
import sql from "@/lib/db"

export async function POST(request: Request) {
  try {
    const { username, email, password, full_name, role } = await request.json()

    if (!username || !email || !password || !full_name || !role) {
      return Response.json({ message: "Missing required fields" }, { status: 400 })
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return Response.json({ message: "Invalid email format" }, { status: 400 })
    }

    if (password.length < 6) {
      return Response.json({ message: "Password must be at least 6 characters" }, { status: 400 })
    }

    // Validate role
    const validRoles = ['superadmin', 'fine_manager', 'receipt_manager', 'student_registrar']
    if (!validRoles.includes(role)) {
      return Response.json({ message: "Invalid role" }, { status: 400 })
    }

    // Check if user already exists
    const existingUser = await sql("SELECT id FROM admins WHERE username = $1 OR email = $2", [username, email])
    if (existingUser.length > 0) {
      return Response.json({ message: "Username or email already registered" }, { status: 409 })
    }

    const passwordHash = await hashPassword(password)

    await sql("INSERT INTO admins (username, email, password_hash, full_name, role) VALUES ($1, $2, $3, $4, $5)", [username, email, passwordHash, full_name, role])

    return Response.json({ message: "Registration successful" }, { status: 201 })
  } catch (error) {
    console.error("Registration error:", error)
    return Response.json({ message: "Registration failed" }, { status: 500 })
  }
}
