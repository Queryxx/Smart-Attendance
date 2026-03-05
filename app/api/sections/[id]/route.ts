import sql from "@/lib/db"
import { cookies } from "next/headers"

async function checkRegistrarAccess() {
    const cookieStore = await cookies()
    const adminSession = cookieStore.get("admin_session")?.value

    if (!adminSession) {
        console.log("checkRegistrarAccess: no admin_session cookie")
        return false
    }

    const adminId = parseInt(adminSession, 10)
    if (isNaN(adminId)) {
        console.log("checkRegistrarAccess: invalid admin_session value", adminSession)
        return false
    }

    const user = await sql("SELECT role FROM admins WHERE id = $1", [adminId])
    if (user.length === 0) {
        console.log("checkRegistrarAccess: admin not found for id", adminId)
        return false
    }

    return user[0].role === "superadmin" || user[0].role === "student_registrar"
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
    if (!(await checkRegistrarAccess())) {
        return Response.json({ message: "Unauthorized" }, { status: 403 })
    }

    try {
        const { id } = await params
        const { section_name, course_id, capacity, instructor_name, semester } = await request.json()

        await sql(
            `UPDATE sections SET section_name = $1, course_id = $2, capacity = $3, instructor_name = $4, semester = $5, updated_at = CURRENT_TIMESTAMP
       WHERE id = $6`,
            [section_name, course_id, capacity, instructor_name, semester, id],
        )

        return Response.json({ message: "Section updated" })
    } catch (error) {
        console.error("Error updating section:", error)
        return Response.json({ message: "Error updating section" }, { status: 500 })
    }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
    if (!(await checkRegistrarAccess())) {
        return Response.json({ message: "Unauthorized" }, { status: 403 })
    }

    try {
        const { id } = await params
        await sql("DELETE FROM sections WHERE id = $1", [id])
        return Response.json({ message: "Section deleted" })
    } catch (error) {
        console.error("Error deleting section:", error)
        return Response.json({ message: "Error deleting section" }, { status: 500 })
    }
}
