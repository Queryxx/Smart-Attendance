import sql from "@/lib/db";
import { cookies } from "next/headers";
import { batchFinesArraySchema } from "../../validators/batch-fines";

async function checkAdminAccess() {
    const cookieStore = await cookies();
    const adminSession = cookieStore.get("admin_session")?.value;

    if (!adminSession) return false;

    const adminId = parseInt(adminSession, 10);
    if (isNaN(adminId)) return false;

    const user = await sql("SELECT role FROM admins WHERE id = $1", [adminId]);
    if (user.length === 0) return false;

    // Both roles can usually manage fines
    return user[0].role === "superadmin" || user[0].role === "student_registrar";
}

export async function POST(request: Request) {
    if (!(await checkAdminAccess())) {
        return Response.json({ message: "Unauthorized" }, { status: 403 });
    }

    try {
        const body = await request.json();
        const validation = batchFinesArraySchema.safeParse(body);

        if (!validation.success) {
            const formattedErrors = validation.error.errors.map(err => {
                const rowNum = Number(err.path[0]) + 2; // +1 for 0-index, +1 for header row
                const field = err.path[1];
                return `Row ${rowNum} (${field}): ${err.message}`;
            });
            return Response.json(
                { message: "Validation failed", errors: formattedErrors },
                { status: 400 }
            );
        }

        const finesToImport = validation.data;

        // Fetch all students to map student_number to student_id
        const students = await sql("SELECT id, student_number FROM students");
        const studentMap = new Map<string, number>();
        students.forEach((s: any) => studentMap.set(s.student_number, s.id));

        // Fetch all events to possibly map event name to event_id
        const events = await sql("SELECT id, event_name FROM events");
        const eventMap = new Map<string, number>();
        events.forEach((e: any) => eventMap.set(e.event_name.toLowerCase(), e.id));

        let successCount = 0;
        let skipCount = 0;
        const errors: string[] = [];

        for (const fine of finesToImport) {
            try {
                const studentId = studentMap.get(fine["Student Number"]);
                if (!studentId) {
                    errors.push(`Student not found: ${fine["Student Number"]}`);
                    skipCount++;
                    continue;
                }

                let eventId = null;
                if (fine.Event) {
                    // Try to find event by exact name
                    eventId = eventMap.get(fine.Event.trim().toLowerCase());
                    // If not found, check if it's already an ID
                    if (!eventId && !isNaN(Number(fine.Event))) {
                        eventId = Number(fine.Event);
                    }
                }

                // If event specified but not found, just log and continue or proceed?
                // For fines, the event might just be a string reason, but the DB schema has an event_id if linked.
                // Let's check how fines are added in the DB.

                await sql(
                    `INSERT INTO fines (student_id, amount, reason, date, status, event_id)
                     VALUES ($1, $2, $3, $4, 'unpaid', $5)`,
                    [
                        studentId,
                        fine["Fine Amount"],
                        fine.Reason,
                        fine.Date || new Date().toISOString().split("T")[0],
                        eventId
                    ]
                );
                successCount++;
            } catch (err: any) {
                console.error("Error importing fine:", err);
                errors.push(`Failed to import fine for student ${fine["Student Number"]}: ${err.message}`);
                skipCount++;
            }
        }

        return Response.json({
            message: "Batch fine import completed",
            summary: {
                total: finesToImport.length,
                success: successCount,
                skipped: skipCount,
            },
            errors: errors.length > 0 ? errors : undefined,
        });
    } catch (error: any) {
        console.error("Batch fine import error:", error);
        return Response.json({ message: "Internal server error" }, { status: 500 });
    }
}
