"use client"

import {
    BarChart,
    Bar,
    LineChart,
    Line,
    PieChart,
    Pie,
    Cell,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toReadableDate } from "@/lib/utils"

interface DashboardData {
    totalStudents: number
    totalCourses: number
    totalEvents: number
    totalSections: number
    totalAttendance: number
    totalFines: number
    attendanceByStatus: Array<{ status: string; count: number }>
    finesByStatus: Array<{ status: string; count: number }>
    finesByAmount: Array<{ status: string; amount: number }>
    finesByCourse: Array<{ name: string; code: string; value: number }>
    paidFinesByCourse: Array<{ name: string; code: string; value: number }>
    monthlyAttendance: Array<{ month: string; present: number; am: number; pm: number }>
    studentStats: Array<{ name: string; value: number; color: string }>
    loginLogs: Array<{ timestamp: string; username: string; full_name: string; role: string; activity_type: string }>
    loginStatsByRole: Array<{ role: string; login_count: number }>
    currentUserRole: string
}

interface DashboardChartsProps {
    data: DashboardData
}

export function DashboardCharts({ data }: DashboardChartsProps) {
    const chartColors = [
        "hsl(var(--color-chart-1))",
        "hsl(var(--color-chart-2))",
        "hsl(var(--color-chart-3))",
        "hsl(var(--color-chart-4))",
        "hsl(var(--color-chart-5))",
    ]

    return (
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4 mb-8">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Students</CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                    <div className="text-2xl font-bold">{data.totalStudents}</div>
                    <p className="text-xs text-muted-foreground">Active enrollments</p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Courses</CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                    <div className="text-2xl font-bold">{data.totalCourses}</div>
                    <p className="text-xs text-muted-foreground">Courses offered</p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Events</CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                    <div className="text-2xl font-bold">{data.totalEvents}</div>
                    <p className="text-xs text-muted-foreground">Scheduled events</p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Fines</CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                    <div className="text-2xl font-bold">₱{(data.totalFines || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                    <p className="text-xs text-muted-foreground">Total fines collected</p>
                </CardContent>
            </Card>
        </div>
    )
}

export function AttendanceChart({ data }: DashboardChartsProps) {
    const chartColors = ["hsl(var(--color-chart-1))", "hsl(var(--color-chart-2))", "hsl(var(--color-chart-3))"]

    return (
        <Card className="mb-6">
            <CardHeader>
                <CardTitle>Monthly Attendance Trend</CardTitle>
                <CardDescription>Students present per month (AM & PM sessions)</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={data.monthlyAttendance}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="present" fill={chartColors[0]} name="Total Present" />
                        <Bar dataKey="am" fill={chartColors[1]} name="AM Session" />
                        <Bar dataKey="pm" fill={chartColors[2]} name="PM Session" />
                    </BarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    )
}

export function AttendanceStatusChart({ data }: DashboardChartsProps) {
    const chartColors = [
        "hsl(var(--color-chart-1))",
        "hsl(var(--color-chart-2))",
        "hsl(var(--color-chart-3))",
        "hsl(var(--color-chart-4))",
    ]

    return (
        <Card className="mb-6">
            <CardHeader>
                <CardTitle>Attendance by Status</CardTitle>
                <CardDescription>Current attendance distribution</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
                <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                        <Pie
                            data={data.attendanceByStatus}
                            dataKey="count"
                            nameKey="status"
                            cx="50%"
                            cy="50%"
                            outerRadius={100}
                            label
                        >
                            {data.attendanceByStatus.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                            ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                    </PieChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    )
}

export function FinesChart({ data }: DashboardChartsProps) {
    // Don't render if there's no fines data
    if (!data.finesByStatus || data.finesByStatus.length === 0) {
        return null
    }

    const chartColors = ["hsl(var(--color-chart-1))", "hsl(var(--color-chart-2))", "hsl(var(--color-chart-3))"]

    return (
        <Card>
            <CardHeader>
                <CardTitle>Fines Status Distribution</CardTitle>
                <CardDescription>Fine payment status</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={data.finesByStatus}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="status" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="count" fill={chartColors[0]} name="Count" />
                    </BarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    )
}

export function FinesAmountChart({ data }: DashboardChartsProps) {
    if (!data.finesByAmount || data.finesByAmount.length === 0) {
        return null
    }

    const STATUS_COLORS: Record<string, string> = {
        'PAID': '#10b981', // green
        'UNPAID': '#ef4444', // red
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Fines Amount Distribution</CardTitle>
                <CardDescription>Total Peso values by status</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
                <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                        <Pie
                            data={data.finesByAmount}
                            dataKey="amount"
                            nameKey="status"
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={100}
                            paddingAngle={5}
                            label={({ status, amount }) => `${status}: ₱${amount.toLocaleString()}`}
                        >
                            {data.finesByAmount.map((entry, index) => (
                                <Cell
                                    key={`cell-${index}`}
                                    fill={STATUS_COLORS[entry.status] || `hsl(var(--color-chart-${(index % 5) + 1}))`}
                                />
                            ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => `₱${value.toLocaleString()}`} />
                        <Legend />
                    </PieChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    )
}

export function FinesByCourseChart({ data }: DashboardChartsProps) {
    // Check if data exists and has content
    if (!data?.finesByCourse || data.finesByCourse.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Fines by Course</CardTitle>
                    <CardDescription>Largest fines per course</CardDescription>
                </CardHeader>
                <CardContent className="flex items-center justify-center h-[300px]">
                    <p className="text-muted-foreground">No fines data available</p>
                </CardContent>
            </Card>
        )
    }

    const chartColors = [
        "#FF6B6B",
        "#4ECDC4",
        "#45B7D1",
        "#FFA07A",
        "#98D8C8",
        "#F7DC6F",
        "#BB8FCE",
        "#85C1E9",
        "#F8B88B",
        "#ABEBC6",
    ]

    return (
        <Card>
            <CardHeader>
                <CardTitle>Fines by Course</CardTitle>
                <CardDescription>Largest fines per course</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
                <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                        <Pie
                            data={data.finesByCourse}
                            dataKey="value"
                            nameKey="code"
                            cx="50%"
                            cy="50%"
                            outerRadius={100}
                            label={({ code, value }) => `${code}: ₱${value.toFixed(0)}`}
                        >
                            {data.finesByCourse.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                            ))}
                        </Pie>
                        <Tooltip formatter={(value: number, name: string, props: any) => {
                            const payload = props.payload;
                            return [`₱${value.toFixed(2)}`, payload.name];
                        }} />
                        <Legend />
                    </PieChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    )
}

export function PaidFinesByCourseChart({ data }: DashboardChartsProps) {
    if (!data?.paidFinesByCourse || data.paidFinesByCourse.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Paid Fines by Course</CardTitle>
                    <CardDescription>Distribution of collected fines</CardDescription>
                </CardHeader>
                <CardContent className="flex items-center justify-center h-[300px]">
                    <p className="text-muted-foreground">No paid fines data available</p>
                </CardContent>
            </Card>
        )
    }

    const chartColors = [
        "#10b981", // primary green
        "#34d399",
        "#059669",
        "#6ee7b7",
        "#065f46"
    ]

    return (
        <Card>
            <CardHeader>
                <CardTitle>Paid Fines by Course</CardTitle>
                <CardDescription>Distribution of collected fines</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
                <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                        <Pie
                            data={data.paidFinesByCourse}
                            dataKey="value"
                            nameKey="code"
                            cx="50%"
                            cy="50%"
                            outerRadius={100}
                            paddingAngle={2}
                            label={({ code, value }) => `${code}: ₱${value.toFixed(0)}`}
                        >
                            {data.paidFinesByCourse.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                            ))}
                        </Pie>
                        <Tooltip formatter={(value: number, name: string, props: any) => {
                            const payload = props.payload;
                            return [`₱${value.toFixed(2)}`, payload.name];
                        }} />
                        <Legend />
                    </PieChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    )
}

export function StudentComparisonChart({ data }: DashboardChartsProps) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Student Attendance Comparison</CardTitle>
                <CardDescription>Present vs Absent Students</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
                <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                        <Pie
                            data={data.studentStats}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={80}
                            outerRadius={120}
                            paddingAngle={2}
                            label={({ name, value }) => `${name}: ${value} students`}
                        >
                            {data.studentStats.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => `${value} students`} />
                        <Legend />
                    </PieChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    )
}

export function LoginLogsChart({ data }: DashboardChartsProps) {
    const getRoleColor = (role: string) => {
        switch (role) {
            case 'superadmin': return '#ef4444' // red
            case 'student_registrar': return '#3b82f6' // blue
            case 'fine_manager': return '#10b981' // green
            case 'receipt_manager': return '#f59e0b' // yellow
            default: return '#6b7280' // gray
        }
    }

    const getRoleLabel = (role: string) => {
        switch (role) {
            case 'superadmin': return 'Admin'
            case 'student_registrar': return 'Registrar'
            case 'fine_manager': return 'Fine Manager'
            case 'receipt_manager': return 'Receipt Manager'
            default: return role
        }
    }

    const getActivityDescription = () => {
        if (data.currentUserRole === 'superadmin') {
            return 'Last 50 login/logout events across all roles in the past 30 days'
        } else {
            return `Last 50 login/logout events for ${getRoleLabel(data.currentUserRole)} role in the past 30 days`
        }
    }

    const getStatsDescription = () => {
        if (data.currentUserRole === 'superadmin') {
            return 'Number of logins in the last 30 days by role'
        } else {
            return `Number of logins in the last 30 days for ${getRoleLabel(data.currentUserRole)} role`
        }
    }

    return (
        <div className="grid gap-6 md:grid-cols-2">
            {/* Login Statistics by Role */}
            <Card>
                <CardHeader>
                    <CardTitle>Login Statistics by Role</CardTitle>
                    <CardDescription>{getStatsDescription()}</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={data.loginStatsByRole}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="role" tickFormatter={getRoleLabel} />
                            <YAxis />
                            <Tooltip
                                labelFormatter={(label) => `Role: ${getRoleLabel(label)}`}
                                formatter={(value: number) => [value, 'Logins']}
                            />
                            <Bar dataKey="login_count" fill="hsl(var(--color-chart-1))" />
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            {/* Recent Login/Logout Activity */}
            <Card>
                <CardHeader>
                    <CardTitle>Recent Login/Logout Activity</CardTitle>
                    <CardDescription>{getActivityDescription()}</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                    <div className="space-y-3 max-h-80 overflow-y-auto">
                        {data.loginLogs.length === 0 ? (
                            <p className="text-muted-foreground text-center py-4">No login/logout activity in the last 30 days</p>
                        ) : (
                            data.loginLogs.map((log, index) => (
                                <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                                    <div className="flex items-center space-x-3">
                                        <div
                                            className="w-3 h-3 rounded-full"
                                            style={{ backgroundColor: getRoleColor(log.role) }}
                                        />
                                        <div className="flex-1">
                                            <div className="flex items-center space-x-2">
                                                <p className="font-medium text-sm">{log.full_name || log.username}</p>
                                                <span className={`text-xs px-2 py-1 rounded-full ${log.activity_type === 'login'
                                                    ? 'bg-green-100 text-green-800'
                                                    : 'bg-red-100 text-red-800'
                                                    }`}>
                                                    {log.activity_type === 'login' ? 'Login' : 'Logout'}
                                                </span>
                                            </div>
                                            <p className="text-xs text-muted-foreground">{getRoleLabel(log.role)}</p>
                                        </div>
                                    </div>
                                    <div className="text-right whitespace-nowrap leading-tight">
                                        <p className="text-sm text-primary font-bold">
                                            {new Date(log.timestamp).toLocaleTimeString("en-US", { hour: 'numeric', minute: '2-digit', hour12: true })}
                                        </p>
                                        <p className="text-[10px] text-muted-foreground font-medium opacity-70">
                                            {new Date(log.timestamp).toLocaleDateString("en-US", { month: 'short', day: 'numeric', year: 'numeric' })}
                                        </p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
