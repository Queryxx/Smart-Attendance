import sql from "@/lib/db"
import { cookies } from "next/headers"

async function checkAttendanceAccess() {
    try {
        const cookieStore = await cookies()
        const sessionToken = cookieStore.get("admin_session")?.value

        if (!sessionToken) return false

        const adminId = parseInt(sessionToken)
        if (isNaN(adminId)) return false

        const result = await sql("SELECT role FROM admins WHERE id = $1", [adminId])
        return result.length > 0 && ['superadmin', 'fine_manager', 'receipt_manager', 'student_registrar'].includes(result[0].role)
    } catch (error) {
        console.error("Error checking attendance access:", error)
        return false
    }
}

export async function GET(request: Request) {
    if (!(await checkAttendanceAccess())) {
        return Response.json({ message: "Unauthorized" }, { status: 403 })
    }

    try {
        const { searchParams } = new URL(request.url)
        const eventId = searchParams.get("eventId")

        if (eventId) {
            // Fetch attendance for a specific event with student and event details
            const records = await sql(
                `SELECT 
          a.id,
          a.student_id,
          a.event_id,
          a.session,
          a.type,
          a.time_recorded,
          a.recorded_at,
          s.student_number,
          s.first_name,
          s.last_name,
          s.year_level,
          s.course_id,
          s.section_id,
          s.photo,
          e.event_date,
          e.fine_amount
         FROM attendance a
         LEFT JOIN students s ON a.student_id = s.id
         LEFT JOIN events e ON a.event_id = e.id
         WHERE a.event_id = $1 
         ORDER BY a.recorded_at DESC`,
                [eventId],
            )

            return Response.json(records)
        } else {
            // Fetch all attendance records with student and event details
            const records = await sql(
                `SELECT 
          a.id,
          a.student_id,
          a.event_id,
          a.session,
          a.type,
          a.time_recorded,
          a.recorded_at,
          s.student_number,
          s.first_name,
          s.last_name,
          s.year_level,
          s.course_id,
          s.section_id,
          s.photo,
          e.event_date,
          e.event_name,
          e.fine_amount,
          CASE 
            WHEN a.type = 'IN' THEN 'PRESENT'
            ELSE 'CHECKED_OUT'
          END as status
         FROM attendance a
         LEFT JOIN students s ON a.student_id = s.id
         LEFT JOIN events e ON a.event_id = e.id
         ORDER BY a.recorded_at DESC`,
            )

            return Response.json(records)
        }
    } catch (error) {
        console.error("Error fetching attendance:", error)
        return Response.json({ message: "Error fetching attendance" }, { status: 500 })
    }
}

export async function POST(request: Request) {
    if (!(await checkAttendanceAccess())) {
        return Response.json({ message: "Unauthorized" }, { status: 403 })
    }

    try {
        const body = await request.json()

        // Handle both single record and array of records formats
        const records = Array.isArray(body) ? body : Array.isArray(body.records) ? body.records : [body]

        for (const record of records) {
            // If event_id is not provided, we still need it for the database constraint
            if (!record.event_id) {
                console.warn("No event_id provided for attendance record")
                continue
            }

            // Extract session (AM/PM), type (IN/OUT), method, and location from record
            const session = record.session || "AM"
            const type = record.type || "IN"
            const method = record.method || "manual"
            const location = record.location || "Office"

            await sql(
                `INSERT INTO attendance (student_id, event_id, session, type, time_recorded, method, location)
         VALUES ($1, $2, $3, $4, NOW(), $5, $6)
         ON CONFLICT (student_id, event_id, session, type) DO UPDATE
         SET time_recorded = NOW(), method = $5, location = $6`,
                [record.student_id, record.event_id, session, type, method, location],
            )
        }

        return Response.json({ message: "Attendance recorded" }, { status: 201 })
    } catch (error) {
        console.error("Error recording attendance:", error)
        return Response.json({ message: "Error recording attendance" }, { status: 500 })
    }
}
