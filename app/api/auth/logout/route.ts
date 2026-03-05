import { cookies } from "next/headers"
import sql from "@/lib/db"

export async function POST() {
    const cookieStore = await cookies()
    const userId = cookieStore.get("admin_session")?.value

    // Log the logout if we have a valid session
    if (userId) {
        try {
            await sql("INSERT INTO logout_logs (admin_id) VALUES ($1)", [userId])
        } catch (logError) {
            console.error("Failed to log logout:", logError)
            // Don't fail the logout if logging fails
        }
    }

    cookieStore.delete("admin_session")

    return Response.json({ message: "Logout successful" }, { status: 200 })
}
