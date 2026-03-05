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
        const { student_number, first_name, last_name, email, qr_code, year_level, course_id, section_id, face_encoding, photo } =
            await request.json()

        // Validate required fields
        if (!student_number || !first_name || !last_name || !email) {
            return Response.json(
                { message: "Student number, first name, last name, and email are required" },
                { status: 400 },
            )
        }

        // Fetch existing student to check for QR code
        const existing = await sql("SELECT qr_code FROM students WHERE id = $1", [id]);
        let finalQrCode = qr_code || (existing.length > 0 ? existing[0].qr_code : null);

        // Generate if still missing
        if (!finalQrCode) {
            finalQrCode = `STU-${Math.random().toString(36).substring(2, 10).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
        }

        await sql(
            `UPDATE students SET student_number = $1, first_name = $2, last_name = $3, email = $4, qr_code = $5, year_level = $6, course_id = $7, section_id = $8, face_encoding = $9, photo = $10
       WHERE id = $11`,
            [
                student_number,
                first_name,
                last_name,
                email,
                finalQrCode,
                year_level || null,
                course_id || null,
                section_id || null,
                face_encoding ? face_encoding : null,
                photo || null,
                id,
            ],
        )

        return Response.json({ message: "Student updated" })
    } catch (error: any) {
        console.error("Error updating student:", error)
        if (error.code === "23505") {
            return Response.json(
                { message: "Student number already exists" },
                { status: 409 },
            )
        }
        return Response.json({ message: "Error updating student" }, { status: 500 })
    }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
    if (!(await checkRegistrarAccess())) {
        return Response.json({ message: "Unauthorized" }, { status: 403 })
    }

    try {
        const { id } = await params
        await sql("DELETE FROM students WHERE id = $1", [id])
        return Response.json({ message: "Student deleted" })
    } catch (error) {
        console.error("Error deleting student:", error)
        return Response.json({ message: "Error deleting student" }, { status: 500 })
    }
}
