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

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    if (!(await checkFinesAccess())) {
        return Response.json({ message: "Unauthorized" }, { status: 403 })
    }

    try {
        const { status } = await request.json()

        if (!["paid", "unpaid"].includes(status)) {
            return Response.json({ message: "Invalid status" }, { status: 400 })
        }

        const result = await sql(
            "UPDATE fines SET status = $1 WHERE id = $2 RETURNING id, status",
            [status, id],
        )

        if (result.length === 0) {
            return Response.json({ message: "Fine not found" }, { status: 404 })
        }

        return Response.json(result[0])
    } catch (error) {
        console.error("Error updating fine:", error)
        return Response.json({ message: "Error updating fine" }, { status: 500 })
    }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    if (!(await checkFinesAccess())) {
        return Response.json({ message: "Unauthorized" }, { status: 403 })
    }

    try {
        const result = await sql("DELETE FROM fines WHERE id = $1 RETURNING id", [id])

        if (result.length === 0) {
            return Response.json({ message: "Fine not found" }, { status: 404 })
        }

        return Response.json({ message: "Fine deleted" })
    } catch (error) {
        console.error("Error deleting fine:", error)
        return Response.json({ message: "Error deleting fine" }, { status: 500 })
    }
}
