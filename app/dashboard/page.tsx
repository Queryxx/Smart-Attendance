import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import sql from "@/lib/db"
import { Sidebar } from "@/components/sidebar"
import { Navbar } from "@/components/navbar"
import { DashboardCharts, AttendanceChart, AttendanceStatusChart, FinesChart, FinesAmountChart, FinesByCourseChart, PaidFinesByCourseChart, StudentComparisonChart, LoginLogsChart } from "@/components/dashboard-charts"

async function getDashboardData(sessionId: string) {
    try {
        // Get current user's role
        const currentUserQuery = await sql("SELECT role FROM admins WHERE id = $1", [sessionId])
        const currentUserRole = currentUserQuery[0]?.role

        if (!currentUserRole) {
            throw new Error("Invalid session")
        }

        const totalStudents = await sql("SELECT COUNT(*) as count FROM students")
        const totalCourses = await sql("SELECT COUNT(*) as count FROM courses")
        const totalEvents = await sql("SELECT COUNT(*) as count FROM events")
        const totalSections = await sql("SELECT COUNT(*) as count FROM sections")
        const totalAttendance = await sql("SELECT COUNT(*) as count FROM attendance")

        // Get recent login and logout logs based on role permissions
        let activityLogsQuery = `
      SELECT
        ll.login_time as timestamp,
        a.username,
        a.full_name,
        a.role,
        'login' as activity_type
      FROM login_logs ll
      JOIN admins a ON ll.admin_id = a.id
      WHERE ll.login_time >= NOW() - INTERVAL '30 days'
    `
        const activityLogsParams: any[] = []

        // Filter activity logs based on current user's role
        if (currentUserRole !== 'superadmin') {
            activityLogsQuery += ` AND a.role = $1`
            activityLogsParams.push(currentUserRole)
        }

        activityLogsQuery += `
      UNION ALL
      SELECT
        lol.logout_time as timestamp,
        a.username,
        a.full_name,
        a.role,
        'logout' as activity_type
      FROM logout_logs lol
      JOIN admins a ON lol.admin_id = a.id
      WHERE lol.logout_time >= NOW() - INTERVAL '30 days'
    `

        // Apply role filter to logout logs too
        if (currentUserRole !== 'superadmin') {
            activityLogsQuery += ` AND a.role = $2`
            activityLogsParams.push(currentUserRole)
        }

        activityLogsQuery += ` ORDER BY timestamp DESC LIMIT 50`

        const activityLogs = await sql(activityLogsQuery, activityLogsParams)

        // Get login stats by role based on permissions
        let loginStatsQuery = `
      SELECT
        a.role,
        COUNT(*) as login_count
      FROM login_logs ll
      JOIN admins a ON ll.admin_id = a.id
      WHERE ll.login_time >= NOW() - INTERVAL '30 days'
    `
        const loginStatsParams: any[] = []

        // Filter login stats based on current user's role
        if (currentUserRole !== 'superadmin') {
            loginStatsQuery += ` AND a.role = $1`
            loginStatsParams.push(currentUserRole)
        }

        loginStatsQuery += ` GROUP BY a.role ORDER BY login_count DESC`

        const loginStatsByRole = await sql(loginStatsQuery, loginStatsParams)

        // Fetch all courses for fine calculation
        const coursesData = await sql("SELECT id, course_name FROM courses")

        // Get ALL attendance records with session and type info
        const allAttendanceRecords = await sql(
            `SELECT 
        a.student_id,
        a.event_id,
        a.session,
        a.type,
        s.course_id,
        e.fine_amount
       FROM attendance a
       LEFT JOIN students s ON a.student_id = s.id
       LEFT JOIN events e ON a.event_id = e.id`
        )

        console.log(" Total raw attendance records:", allAttendanceRecords?.length)
        console.log("First record structure:", JSON.stringify(allAttendanceRecords?.[0], null, 2))
        console.log("Sample sessions in data:", [...new Set(allAttendanceRecords?.map((r: any) => r.session))].slice(0, 5))
        console.log("Sample types in data:", [...new Set(allAttendanceRecords?.map((r: any) => r.type))].slice(0, 5))

        // Debug: Show actual type values
        const typeValues = allAttendanceRecords?.map((r: any) => r.type)
        console.log("All type values sample:", typeValues?.slice(0, 10))
        console.log("Unique type values:", [...new Set(typeValues)])
        console.log("Count of type='IN':", allAttendanceRecords?.filter((r: any) => r.type === 'IN').length)
        console.log("Count of type='in':", allAttendanceRecords?.filter((r: any) => r.type === 'in').length)
        console.log("Count of type='OUT':", allAttendanceRecords?.filter((r: any) => r.type === 'OUT').length)
        console.log("Count of type='out':", allAttendanceRecords?.filter((r: any) => r.type === 'out').length)

        // --- REAL FINES DATA FROM DATABASE ---

        // Get total fines collected (PAID only)
        const totalCollectedResult = await sql("SELECT SUM(amount) as total FROM fines WHERE status = 'paid'")
        const totalFinesCollected = Number(totalCollectedResult[0]?.total) || 0

        // Get fines status and amounts for charts
        const finesStatsData = await sql(`
      SELECT 
        status, 
        COUNT(*) as count,
        SUM(amount) as total
      FROM fines 
      GROUP BY status
    `)

        const finesByStatus = finesStatsData.map((row: any) => ({
            status: (row.status || 'unpaid').toUpperCase(),
            count: Number(row.count) || 0
        }))

        const finesByAmount = finesStatsData.map((row: any) => ({
            status: (row.status || 'unpaid').toUpperCase(),
            amount: Number(row.total) || 0
        }))

        // Get fines by course for the pie chart
        const finesByCourseData = await sql(`
      SELECT 
        c.course_code as code,
        c.course_name as name, 
        SUM(f.amount) as value
      FROM fines f
      JOIN students s ON f.student_id = s.id
      JOIN courses c ON s.course_id = c.id
      GROUP BY c.course_code, c.course_name
      ORDER BY value DESC
    `)
        const finesByCourse = finesByCourseData.map((row: any) => ({
            name: row.name,
            code: row.code,
            value: Number(row.value) || 0
        }))

        // Get PAID fines by course for the second pie chart
        const paidFinesByCourseData = await sql(`
      SELECT 
        c.course_code as code,
        c.course_name as name, 
        SUM(f.amount) as value
      FROM fines f
      JOIN students s ON f.student_id = s.id
      JOIN courses c ON s.course_id = c.id
      WHERE f.status = 'paid'
      GROUP BY c.course_code, c.course_name
      ORDER BY value DESC
    `)
        const paidFinesByCourse = paidFinesByCourseData.map((row: any) => ({
            name: row.name,
            code: row.code,
            value: Number(row.value) || 0
        }))

        // Get student comparison data - students with fines vs without fines
        const studentComparison = await sql(`
      SELECT 
        COUNT(DISTINCT s.id) as total_students,
        COUNT(DISTINCT CASE 
          WHEN a.student_id IS NOT NULL THEN s.id 
        END) as students_with_attendance,
        COUNT(DISTINCT CASE 
          WHEN a.student_id IS NOT NULL AND a.session IS NOT NULL THEN s.id 
        END) as students_present,
        COUNT(DISTINCT CASE 
          WHEN a.student_id IS NULL THEN s.id 
        END) as students_absent
      FROM students s
      LEFT JOIN attendance a ON s.id = a.student_id
    `)

        console.log("👥 Student Comparison Data:", studentComparison)

        const studentStats = [
            { name: "Present", value: Number(studentComparison[0]?.students_present) || 0, color: "#10b981" },
            { name: "Absent", value: Number(studentComparison[0]?.students_absent) || 0, color: "#ef4444" }
        ]

        // Get real monthly attendance data from database
        const monthlyData = await sql(`
      SELECT 
        DATE_TRUNC('month', a.recorded_at) as month,
        COUNT(DISTINCT a.student_id) as present,
        COUNT(DISTINCT CASE WHEN a.session = 'AM' THEN a.student_id END) as am_count,
        COUNT(DISTINCT CASE WHEN a.session = 'PM' THEN a.student_id END) as pm_count
      FROM attendance a
      WHERE a.recorded_at >= NOW() - INTERVAL '6 months'
      GROUP BY DATE_TRUNC('month', a.recorded_at)
      ORDER BY month ASC
    `)

        // Format monthly data for chart
        const monthlyAttendance = monthlyData.map((row: any) => {
            const date = new Date(row.month)
            const monthName = date.toLocaleString('en-US', { month: 'short' })
            return {
                month: monthName,
                present: Number(row.present) || 0,
                am: Number(row.am_count) || 0,
                pm: Number(row.pm_count) || 0,
            }
        })

        console.log(" Monthly Attendance Data:", monthlyAttendance)

        return {
            totalStudents: totalStudents[0]?.count || 0,
            totalCourses: totalCourses[0]?.count || 0,
            totalEvents: totalEvents[0]?.count || 0,
            totalSections: totalSections[0]?.count || 0,
            totalAttendance: totalAttendance[0]?.count || 0,
            totalFines: totalFinesCollected,
            attendanceByStatus: [],
            finesByStatus,
            finesByAmount,
            finesByCourse,
            paidFinesByCourse,
            monthlyAttendance,
            studentStats,
            loginLogs: activityLogs,
            loginStatsByRole,
            currentUserRole,
        }
    } catch (error) {
        console.error("Error fetching dashboard data:", error)
        return {
            totalStudents: 0,
            totalCourses: 0,
            totalEvents: 0,
            totalSections: 0,
            totalAttendance: 0,
            totalFines: 0,
            attendanceByStatus: [],
            finesByStatus: [],
            finesByAmount: [],
            finesByCourse: [],
            paidFinesByCourse: [],
            monthlyAttendance: [],
            studentStats: [],
            loginLogs: [],
            loginStatsByRole: [],
            currentUserRole: 'superadmin', // fallback
        }
    }
}

export default async function DashboardPage() {
    const cookieStore = await cookies()
    const session = cookieStore.get("admin_session")

    if (!session) {
        redirect("/login")
    }

    const data = await getDashboardData(session.value)

    const isAdmin = data.currentUserRole === 'superadmin'

    if (isAdmin) {
        return (
            <div className="flex">
                <Sidebar />
                <div className="ml-64 flex-1 p-8 bg-background">
                    <div className="max-w-7xl">
                        <div className="mb-8">
                            <h1 className="text-3xl font-bold">Dashboard</h1>
                            <p className="text-muted-foreground">Welcome to the Smart Attendance System</p>
                        </div>

                        <DashboardCharts data={data} />

                        <div className="grid gap-8 md:grid-cols-2 mt-8">
                            <AttendanceChart data={data} />
                            <StudentComparisonChart data={data} />
                        </div>

                        <div className="grid gap-8 md:grid-cols-2 mt-8">
                            <FinesChart data={data} />
                            <FinesAmountChart data={data} />
                        </div>

                        <div className="grid gap-8 md:grid-cols-2 mt-8">
                            <FinesByCourseChart data={data} />
                            <PaidFinesByCourseChart data={data} />
                        </div>

                        <div className="mt-8">
                            <h2 className="text-2xl font-bold mb-6">Login Activity</h2>
                            <LoginLogsChart data={data} />
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    // Non-admin layout: top navigation bar
    return (
        <div className="min-h-screen bg-background">
            <Navbar />
            <div className="p-8">
                <div className="max-w-7xl mx-auto">
                    <div className="mb-8">
                        <h1 className="text-3xl font-bold">Dashboard</h1>
                        <p className="text-muted-foreground">Welcome to the Smart Attendance System</p>
                    </div>

                    <DashboardCharts data={data} />

                    <div className="grid gap-8 md:grid-cols-2 mt-8">
                        <AttendanceChart data={data} />
                        <StudentComparisonChart data={data} />
                    </div>

                    <div className="grid gap-8 md:grid-cols-2 mt-8">
                        <FinesChart data={data} />
                        <FinesAmountChart data={data} />
                    </div>

                    <div className="grid gap-8 md:grid-cols-2 mt-8">
                        <FinesByCourseChart data={data} />
                        <PaidFinesByCourseChart data={data} />
                    </div>

                    <div className="mt-8">
                        <h2 className="text-2xl font-bold mb-6">Login Activity</h2>
                        <LoginLogsChart data={data} />
                    </div>
                </div>
            </div>
        </div>
    )
}
