import sql from "@/lib/db"
import { cookies } from "next/headers"

async function getAdminRole() {
    const cookieStore = await cookies()
    const adminSession = cookieStore.get("admin_session")?.value

    if (!adminSession) return null

    const adminId = parseInt(adminSession, 10)
    if (isNaN(adminId)) return null

    const user = await sql("SELECT role FROM admins WHERE id = $1", [adminId])
    if (user.length === 0) return null

    return user[0].role as string
}

async function checkRegistrarAccess() {
    const role = await getAdminRole()
    return role === "superadmin" || role === "student_registrar"
}

async function checkReadAccess() {
    const role = await getAdminRole()
    return role !== null && ['superadmin', 'student_registrar', 'fine_manager', 'receipt_manager'].includes(role)
}

export async function GET(request: Request) {
    if (!(await checkReadAccess())) {
        return Response.json({ message: "Unauthorized" }, { status: 403 })
    }

    try {
        const { searchParams } = new URL(request.url)
        const courseId = searchParams.get("course_id")

        let query = `
      SELECT s.*, c.course_name 
      FROM sections s
      LEFT JOIN courses c ON s.course_id = c.id
    `
        const params: any[] = []

        if (courseId) {
            query += " WHERE s.course_id = $1"
            params.push(courseId)
        }

        query += " ORDER BY s.section_name"

        const sections = await sql(query, params)
        return Response.json(sections)
    } catch (error) {
        console.error("Error fetching sections:", error)
        return Response.json({ message: "Error fetching sections" }, { status: 500 })
    }
}

export async function POST(request: Request) {
    if (!(await checkRegistrarAccess())) {
        return Response.json({ message: "Unauthorized" }, { status: 403 })
    }

    try {
        const { section_name, course_id } = await request.json()

        // Validate inputs
        if (!section_name || !course_id) {
            return Response.json(
                { message: "Section name and course ID are required" },
                { status: 400 },
            )
        }

        const result = await sql(
            `INSERT INTO sections (section_name, course_id)
       VALUES ($1, $2) RETURNING id`,
            [section_name, parseInt(course_id, 10)],
        )

        return Response.json({ id: result[0].id }, { status: 201 })
    } catch (error) {
        console.error("Error creating section:", error)
        return Response.json({ message: "Error creating section" }, { status: 500 })
    }
}
