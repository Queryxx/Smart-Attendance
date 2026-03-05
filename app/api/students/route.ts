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

export async function GET() {
    if (!(await checkReadAccess())) {
        return Response.json({ message: "Unauthorized" }, { status: 403 })
    }

    try {
        // Only select needed columns to reduce payload size
        const students = await sql("SELECT id, student_number, first_name, last_name, email, qr_code, year_level, course_id, section_id, face_encoding, photo FROM students ORDER BY first_name, last_name")
        return Response.json(students)
    } catch (error) {
        console.error("Error fetching students:", error)
        return Response.json({ message: "Error fetching students" }, { status: 500 })
    }
}

export async function POST(request: Request) {
    if (!(await checkRegistrarAccess())) {
        return Response.json({ message: "Unauthorized" }, { status: 403 })
    }

    try {
        const { student_number, first_name, last_name, email, qr_code, year_level, course_id, section_id, face_encoding, photo } =
            await request.json()

        // Validate required fields
        if (!student_number || !first_name || !last_name || !email) {
            return Response.json(
                { message: "Student number, first name, last name, and email are required" },
                { status: 400 },
            )
        }

        // Generate unique QR code if not provided
        const finalQrCode = qr_code || `STU-${Math.random().toString(36).substring(2, 10).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;

        const result = await sql(
            `INSERT INTO students (student_number, first_name, last_name, email, qr_code, year_level, course_id, section_id, face_encoding, photo)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
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
            ],
        )

        return Response.json({ id: result[0].id }, { status: 201 })
    } catch (error: any) {
        console.error("Error creating student:", error)
        if (error.code === "23505") {
            return Response.json(
                { message: "Student number already exists" },
                { status: 409 },
            )
        }
        return Response.json({ message: "Error creating student" }, { status: 500 })
    }
}
