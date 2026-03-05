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

export async function GET() {
    const cookieStore = await cookies()
    const adminSession = cookieStore.get("admin_session")?.value

    if (!adminSession) return Response.json({ message: "Unauthorized" }, { status: 401 })

    const adminId = parseInt(adminSession, 10)
    const userRes = await sql("SELECT role FROM admins WHERE id = $1", [adminId])

    if (userRes.length === 0) return Response.json({ message: "Unauthorized" }, { status: 403 })
    const role = userRes[0].role

    try {
        // Base query with role-based filtering logic
        // Superadmin sees everything. Others see logs only for their own role.
        let filterClause = ""
        let params: any[] = []

        if (role !== "superadmin") {
            filterClause = "WHERE a.role = $1"
            params = [role]
        }

        const query = `
            WITH all_logs AS (
                SELECT 
                    al.id, al.admin_id, al.action, al.target_type, al.target_id, al.details, al.created_at
                FROM activity_logs al
                
                UNION ALL
                
                SELECT 
                    l.id, l.admin_id, 'Login' as action, 'auth' as target_type, l.admin_id as target_id, 'User logged into the system' as details, l.login_time as created_at
                FROM login_logs l
                
                UNION ALL
                
                SELECT 
                    o.id, o.admin_id, 'Logout' as action, 'auth' as target_type, o.admin_id as target_id, 'User logged out of the system' as details, o.logout_time as created_at
                FROM logout_logs o
            )
            SELECT 
                log.*, 
                a.full_name as admin_name,
                a.username as admin_username,
                a.role as admin_role
            FROM all_logs log
            LEFT JOIN admins a ON log.admin_id = a.id
            ${filterClause}
            ORDER BY created_at DESC
        `

        const logs = await sql(query, params)
        return Response.json(logs)
    } catch (error) {
        console.error("Error fetching logs:", error)
        return Response.json({ message: "Error fetching logs" }, { status: 500 })
    }
}
