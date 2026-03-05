import sql from "@/lib/db"
import { cookies } from "next/headers"

async function checkFinesAccess() {
    try {
        const cookieStore = await cookies()
        const sessionToken = cookieStore.get("admin_session")?.value

        if (!sessionToken) return false

        const adminId = parseInt(sessionToken)
        if (isNaN(adminId)) return false

        const result = await sql("SELECT role FROM admins WHERE id = $1", [adminId])
        return result.length > 0 && ['superadmin', 'fine_manager', 'receipt_manager'].includes(result[0].role)
    } catch (error) {
        console.error("Error checking fines access:", error)
        return false
    }
}

export async function GET(request: Request) {
    if (!(await checkFinesAccess())) {
        return Response.json({ message: "Unauthorized" }, { status: 403 })
    }

    try {
        const query = `
      SELECT 
        f.id,
        f.student_id,
        s.student_number,
        s.first_name,
        s.last_name,
        (s.first_name || ' ' || s.last_name) as student_name,
        c.course_name as course,
        f.amount,
        f.reason,
        f.date,
        COALESCE(f.status, 'unpaid') as status,
        f.created_at
      FROM fines f 
      JOIN students s ON f.student_id = s.id
      LEFT JOIN courses c ON s.course_id = c.id
      ORDER BY f.created_at DESC
    `

        const fines = await sql(query)
        return Response.json(fines)
    } catch (error) {
        console.error("Error fetching fines:", error)
        return Response.json({ message: "Error fetching fines" }, { status: 500 })
    }
}

export async function POST(request: Request) {
    if (!(await checkFinesAccess())) {
        return Response.json({ message: "Unauthorized" }, { status: 403 })
    }

    try {
        const { student_id, amount, reason, date } = await request.json()

        if (!student_id || !amount || !reason) {
            return Response.json({ message: "Missing required fields" }, { status: 400 })
        }

        const result = await sql(
            `INSERT INTO fines (student_id, amount, reason, date, status, event_id, attendance_id)
       VALUES ($1, $2, $3, $4, 'unpaid', NULL, NULL) 
       RETURNING id, student_id, amount, reason, date, status`,
            [student_id, parseFloat(amount), reason, date || new Date().toISOString().split("T")[0]],
        )

        return Response.json(result[0], { status: 201 })
    } catch (error) {
        console.error("Error creating fine:", error)
        return Response.json({ message: "Error creating fine" }, { status: 500 })
    }
}
