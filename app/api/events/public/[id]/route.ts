import sql from "@/lib/db"

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params
        const events = await sql("SELECT id, event_name, event_date, start_time, end_time, location FROM events WHERE id = $1", [id])

        if (events.length === 0) {
            return Response.json({ message: "Event not found" }, { status: 404 })
        }

        return Response.json(events[0])
    } catch (error) {
        console.error("Error fetching event public:", error)
        return Response.json({ message: "Error fetching event" }, { status: 500 })
    }
}
