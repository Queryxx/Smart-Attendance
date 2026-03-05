import sql from "@/lib/db"
import { cookies } from "next/headers"

async function checkRegistrarAccess() {
  try {
    const cookieStore = await cookies()
    const sessionToken = cookieStore.get("admin_session")?.value

    if (!sessionToken) return false

    const adminId = parseInt(sessionToken)
    if (isNaN(adminId)) return false

    const result = await sql("SELECT role FROM admins WHERE id = $1", [adminId])
    return result.length > 0 && ['superadmin', 'student_registrar'].includes(result[0].role)
  } catch (error) {
    console.error("Error checking registrar access:", error)
    return false
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  if (!(await checkRegistrarAccess())) {
    return Response.json({ message: "Unauthorized" }, { status: 403 })
  }

  try {
    const { course_name, course_code } = await request.json()

    await sql(
      `UPDATE courses SET course_name = $1, course_code = $2 WHERE id = $3`,
      [course_name, course_code, params.id],
    )

    return Response.json({ message: "Course updated" })
  } catch (error) {
    console.error("Error updating course:", error)
    return Response.json({ message: "Error updating course" }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  if (!(await checkRegistrarAccess())) {
    return Response.json({ message: "Unauthorized" }, { status: 403 })
  }

  try {
    await sql("DELETE FROM courses WHERE id = $1", [params.id])
    return Response.json({ message: "Course deleted" })
  } catch (error) {
    console.error("Error deleting course:", error)
    return Response.json({ message: "Error deleting course" }, { status: 500 })
  }
}
