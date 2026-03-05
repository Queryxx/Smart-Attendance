import { cookies } from "next/headers"
import sql from "@/lib/db"

export async function GET() {
  try {
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get("admin_session")?.value

    if (!sessionToken) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), { status: 401 })
    }

    const adminId = parseInt(sessionToken)
    if (isNaN(adminId)) {
      return new Response(JSON.stringify({ error: "Invalid session" }), { status: 401 })
    }

    const result = await sql(
      "SELECT id, username, full_name, email, role FROM admins WHERE id = $1",
      [adminId]
    )

    if (!result || result.length === 0) {
      return new Response(JSON.stringify({ error: "Admin not found" }), { status: 404 })
    }

    const admin = result[0]

    return new Response(JSON.stringify({
      id: admin.id,
      username: admin.username,
      full_name: admin.full_name,
      email: admin.email,
      role: admin.role,
    }), { 
      status: 200,
      headers: { "Content-Type": "application/json" }
    })
  } catch (error) {
    console.error("Error fetching current admin:", error)
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500 })
  }
}
