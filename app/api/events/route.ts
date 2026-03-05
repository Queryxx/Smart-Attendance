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
        const events = await sql("SELECT * FROM events ORDER BY event_date DESC")
        return Response.json(events)
    } catch (error) {
        console.error("Error fetching events:", error)
        return Response.json({ message: "Error fetching events" }, { status: 500 })
    }
}

export async function PATCH(request: Request) {
    if (!(await checkRegistrarAccess())) {
        return Response.json({ message: "Unauthorized" }, { status: 403 })
    }

    try {
        const { id, is_exported } = await request.json()

        if (!id) {
            return Response.json({ message: "Event ID is required" }, { status: 400 })
        }

        // Only generate fines if we are exporting for the first time
        if (is_exported) {
            // Get event details
            const eventResult = await sql("SELECT * FROM events WHERE id = $1", [id])
            if (eventResult.length === 0) {
                return Response.json({ message: "Event not found" }, { status: 404 })
            }
            const event = eventResult[0]

            // Only proceed if not already exported (idempotency)
            if (!event.is_exported) {
                // Generate fines for missed sessions
                // We use a single query to find all students who missed active sessions
                // This identifies students who should have attended (based on course_ids) 
                // but have no attendance record for a specific active session.

                // Determine active sessions
                const activeSessions = []
                if (event.am_in_start_time) activeSessions.push({ session: 'AM', type: 'IN' })
                if (event.am_out_start_time) activeSessions.push({ session: 'AM', type: 'OUT' })
                if (event.pm_in_start_time) activeSessions.push({ session: 'PM', type: 'IN' })
                if (event.pm_out_start_time) activeSessions.push({ session: 'PM', type: 'OUT' })

                const totalActiveCount = activeSessions.length

                if (totalActiveCount > 0) {
                    const finePerSession = (event.fine_amount || 0) / totalActiveCount

                    // Get all students who should attend this event
                    let studentsQuery = "SELECT id FROM students"
                    let studentsParams: any[] = []

                    if (event.course_ids && Array.isArray(event.course_ids) && event.course_ids.length > 0) {
                        studentsQuery += " WHERE course_id::text = ANY($1)"
                        studentsParams = [event.course_ids.map(String)]
                    }

                    const attendees = await sql(studentsQuery, studentsParams)

                    // Get all existing attendance for this event
                    const attendance = await sql(
                        "SELECT student_id, session, type FROM attendance WHERE event_id = $1",
                        [id]
                    )

                    // Create a lookup for attendance
                    const attendanceMap = new Set(
                        attendance.map(a => `${a.student_id}-${a.session}-${a.type}`)
                    )

                    // Prepare fines to insert
                    for (const student of attendees) {
                        const missedSessionLabels = []
                        let missedCount = 0

                        for (const s of activeSessions) {
                            const key = `${student.id}-${s.session}-${s.type}`
                            if (!attendanceMap.has(key)) {
                                missedCount++
                                missedSessionLabels.push(`${s.session} ${s.type}`)
                            }
                        }

                        if (missedCount > 0) {
                            const totalStudentFine = finePerSession * missedCount
                            const reason = `Missed: ${missedSessionLabels.join(", ")} - ${event.event_name}`

                            // Student missed one or more sessions, create ONE consolidated fine
                            await sql(
                                `INSERT INTO fines (student_id, event_id, amount, reason, date) 
                                 VALUES ($1, $2, $3, $4, CURRENT_DATE)`,
                                [
                                    student.id,
                                    id,
                                    totalStudentFine,
                                    reason
                                ]
                            )
                        }
                    }
                }
            }
        }

        await sql(
            `UPDATE events SET is_exported = $1 WHERE id = $2`,
            [!!is_exported, id]
        )

        // Log the export activity if it was successful
        if (is_exported) {
            try {
                const cookieStore = await cookies()
                const adminId = parseInt(cookieStore.get("admin_session")?.value || "", 10)

                if (!isNaN(adminId)) {
                    // Fetch event name for more descriptive log
                    const eventRes = await sql("SELECT event_name FROM events WHERE id = $1", [id])
                    const eventName = eventRes.length > 0 ? eventRes[0].event_name : "Unknown Event"

                    await sql(
                        `INSERT INTO activity_logs (admin_id, action, target_type, target_id, details) 
                         VALUES ($1, $2, $3, $4, $5)`,
                        [
                            adminId,
                            "Export Attendance",
                            "event",
                            parseInt(String(id), 10),
                            `Exported attendance for event: ${eventName}`
                        ]
                    )
                }
            } catch (logError) {
                // We log to console but don't fail the entire request if logging fails
                console.error("Failed to log activity:", logError)
            }
        }

        return Response.json({ message: "Event status updated and fines generated" })
    } catch (error) {
        console.error("Error updating event status:", error)
        return Response.json({ message: "Error updating event status" }, { status: 500 })
    }
}

export async function POST(request: Request) {
    if (!(await checkRegistrarAccess())) {
        return Response.json({ message: "Unauthorized" }, { status: 403 })
    }

    try {
        const {
            event_name,
            event_date,
            start_time,
            end_time,
            fine_amount,
            course_ids,
            am_in_start_time,
            am_in_end_time,
            am_out_start_time,
            am_out_end_time,
            pm_in_start_time,
            pm_in_end_time,
            pm_out_start_time,
            pm_out_end_time,
        } = await request.json()

        // Validate required fields
        if (!event_name || !event_date || !start_time || !end_time || fine_amount === undefined) {
            return Response.json(
                { message: "Event name, date, start time, end time, and fine amount are required" },
                { status: 400 },
            )
        }

        const result = await sql(
            `INSERT INTO events (
        event_name, 
        event_date, 
        start_time, 
        end_time, 
        fine_amount, 
        course_ids,
        am_in_start_time,
        am_in_end_time,
        am_out_start_time,
        am_out_end_time,
        pm_in_start_time,
        pm_in_end_time,
        pm_out_start_time,
        pm_out_end_time
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING id`,
            [
                event_name,
                event_date,
                start_time,
                end_time,
                parseFloat(fine_amount),
                course_ids || null,
                am_in_start_time || null,
                am_in_end_time || null,
                am_out_start_time || null,
                am_out_end_time || null,
                pm_in_start_time || null,
                pm_in_end_time || null,
                pm_out_start_time || null,
                pm_out_end_time || null,
            ],
        )

        return Response.json({ id: result[0].id }, { status: 201 })
    } catch (error) {
        console.error("Error creating event:", error)
        return Response.json({ message: "Error creating event" }, { status: 500 })
    }
}
