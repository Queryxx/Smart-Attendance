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

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    if (!(await checkRegistrarAccess())) {
        return Response.json({ message: "Unauthorized" }, { status: 403 })
    }

    try {
        const { id } = await params
        const events = await sql("SELECT * FROM events WHERE id = $1", [id])
        if (events.length === 0) {
            return Response.json({ message: "Event not found" }, { status: 404 })
        }
        return Response.json(events[0])
    } catch (error) {
        console.error("Error fetching event:", error)
        return Response.json({ message: "Error fetching event" }, { status: 500 })
    }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
    if (!(await checkRegistrarAccess())) {
        return Response.json({ message: "Unauthorized" }, { status: 403 })
    }

    try {
        const { id } = await params
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

        await sql(
            `UPDATE events SET 
        event_name = $1, 
        event_date = $2, 
        start_time = $3, 
        end_time = $4, 
        fine_amount = $5, 
        course_ids = $6,
        am_in_start_time = $7,
        am_in_end_time = $8,
        am_out_start_time = $9,
        am_out_end_time = $10,
        pm_in_start_time = $11,
        pm_in_end_time = $12,
        pm_out_start_time = $13,
        pm_out_end_time = $14
       WHERE id = $15`,
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
                id,
            ],
        )

        return Response.json({ message: "Event updated" })
    } catch (error) {
        console.error("Error updating event:", error)
        return Response.json({ message: "Error updating event" }, { status: 500 })
    }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
    if (!(await checkRegistrarAccess())) {
        return Response.json({ message: "Unauthorized" }, { status: 403 })
    }

    try {
        const { id } = await params
        await sql("DELETE FROM events WHERE id = $1", [id])
        return Response.json({ message: "Event deleted" })
    } catch (error) {
        console.error("Error deleting event:", error)
        return Response.json({ message: "Error deleting event" }, { status: 500 })
    }
}
