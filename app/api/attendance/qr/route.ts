import sql from "@/lib/db"
import { getAsiaDateFormatted, getAsiaTimeFormatted } from "@/lib/utils"

export async function POST(request: Request) {
    try {
        const { student_number, event_id, location } = await request.json()

        if (!student_number || !event_id || !location) {
            return Response.json({ message: "Missing required fields" }, { status: 400 })
        }

        // 1. Find the student by student_number
        const students = await sql("SELECT id, course_id FROM students WHERE student_number = $1", [student_number])
        if (students.length === 0) {
            return Response.json({ message: "Student not found" }, { status: 404 })
        }
        const studentId = students[0].id
        const studentCourseId = students[0].course_id

        // 2. Get event data
        const events = await sql("SELECT * FROM events WHERE id = $1", [event_id])
        if (events.length === 0) {
            return Response.json({ message: "Event not found" }, { status: 404 })
        }
        const event = events[0]

        console.log(`[QR Attendance] Procressing student ${student_number} for event ${event_id}`)

        // 3. Validate student's course for this event (if scoped)
        if (event.course_ids && event.course_ids.length > 0) {
            const courseIds = (Array.isArray(event.course_ids) ? event.course_ids : [event.course_ids]).map(String)
            if (!courseIds.includes(String(studentCourseId))) {
                console.warn(`[QR Attendance] Course mismatch: Student course ${studentCourseId} not in ${courseIds}`)
                return Response.json({ message: "Your course is not included in this event" }, { status: 403 })
            }
        }

        // 4. Validate current time against event sessions
        const timezone = 'Asia/Manila'
        const currentDate = getAsiaDateFormatted(timezone) // returns YYYY-MM-DD

        // Fix: Use simple year-month-day extraction to avoid any timezone shifting
        const dateObj = new Date(event.event_date);
        const y_val = dateObj.getFullYear();
        const m_val = String(dateObj.getMonth() + 1).padStart(2, '0');
        const d_val = String(dateObj.getDate()).padStart(2, '0');
        const formattedEventDate = `${y_val}-${m_val}-${d_val}`;

        if (currentDate !== formattedEventDate) {
            console.warn(`[QR Attendance] Date mismatch: Today is ${currentDate}, Event is ${formattedEventDate}`)
            return Response.json({ message: `Today is ${currentDate}, but the event is on ${formattedEventDate}` }, { status: 403 })
        }

        const currentTimeStr = getAsiaTimeFormatted(timezone).substring(0, 5) // HH:MM
        console.log(`[QR Attendance] Current time: ${currentTimeStr}`)
        let activeSession: string | null = null
        let activeType: string | null = null

        const formatTime = (time: string | null) => time ? time.substring(0, 5) : null

        // Check AM
        if (event.am_in_start_time) {
            const amInStart = formatTime(event.am_in_start_time)!
            const amInEnd = formatTime(event.am_in_end_time)!
            const amOutStart = formatTime(event.am_out_start_time)!
            const amOutEnd = formatTime(event.am_out_end_time)!

            if (currentTimeStr >= amInStart && currentTimeStr <= amInEnd) {
                activeSession = "AM"; activeType = "IN"
            } else if (currentTimeStr >= amOutStart && currentTimeStr <= amOutEnd) {
                activeSession = "AM"; activeType = "OUT"
            }
        }

        // Check PM if no AM match
        if (!activeSession && event.pm_in_start_time) {
            const pmInStart = formatTime(event.pm_in_start_time)!
            const pmInEnd = formatTime(event.pm_in_end_time)!
            const pmOutStart = formatTime(event.pm_out_start_time)!
            const pmOutEnd = formatTime(event.pm_out_end_time)!

            if (currentTimeStr >= pmInStart && currentTimeStr <= pmInEnd) {
                activeSession = "PM"; activeType = "IN"
            } else if (currentTimeStr >= pmOutStart && currentTimeStr <= pmOutEnd) {
                activeSession = "PM"; activeType = "OUT"
            }
        }

        if (!activeSession) {
            // Case 5.1: No sessions configured (Match behavior in dashboard/detection/page.tsx)
            if (!event.am_in_start_time && !event.pm_in_start_time) {
                console.log("[QR Attendance] No sessions configured, allowing fallback AM/IN")
                activeSession = "AM"
                activeType = "IN"
            } else {
                console.warn(`[QR Attendance] Outside session windows. Time: ${currentTimeStr} Event Dates:`, {
                    am_in: `${event.am_in_start_time}-${event.am_in_end_time}`,
                    pm_in: `${event.pm_in_start_time}-${event.pm_in_end_time}`
                })
                return Response.json({ message: "No active attendance session at this time" }, { status: 403 })
            }
        }

        // 5. Check if already recorded
        const existing = await sql(
            "SELECT id FROM attendance WHERE student_id = $1 AND event_id = $2 AND session = $3 AND type = $4",
            [studentId, event_id, activeSession, activeType]
        )

        if (existing.length > 0) {
            return Response.json({ message: `Attendance for ${activeSession} ${activeType} already recorded` }, { status: 409 })
        }

        // 6. Record Attendance (Including Location and Method)
        await sql(
            `INSERT INTO attendance (student_id, event_id, session, type, time_recorded, location, method)
             VALUES ($1, $2, $3, $4, NOW(), $5, $6)`,
            [studentId, event_id, activeSession, activeType, location, "qr"]
        )

        // 7. Record to separate location log (for historical tracking)
        await sql(
            `INSERT INTO attendance_location (student_id, event_id, location, timestamp)
             VALUES ($1, $2, $3, NOW())`,
            [studentId, event_id, location]
        )

        return Response.json({ message: "Attendance recorded successfully" }, { status: 201 })
    } catch (error) {
        console.error("QR Code registration error:", error)
        return Response.json({ message: "Server error recording attendance" }, { status: 500 })
    }
}
