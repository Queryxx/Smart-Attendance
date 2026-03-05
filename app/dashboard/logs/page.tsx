"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { DashboardShell } from "@/components/dashboard-shell"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { formatReadableDate, formatTo12Hour } from "@/lib/utils"
import { Search, History, User, Info, Calendar } from "lucide-react"

interface ActivityLog {
    id: number
    admin_id: number
    admin_name: string
    admin_username: string
    action: string
    target_type: string
    target_id: number
    details: string
    created_at: string
}

export default function LogsPage() {
    const [logs, setLogs] = useState<ActivityLog[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState("")
    const [isAuthorized, setIsAuthorized] = useState(false)
    const [authLoading, setAuthLoading] = useState(true)
    const router = useRouter()

    useEffect(() => {
        checkAuthorization()
    }, [])

    async function checkAuthorization() {
        try {
            const response = await fetch("/api/auth/me")
            if (response.ok) {
                const data = await response.json()
                // Only superadmin and registrar can see logs
                if (['superadmin', 'student_registrar', 'fine_manager', 'receipt_manager'].includes(data.role)) {
                    setIsAuthorized(true)
                    fetchLogs()
                } else {
                    router.push("/dashboard")
                }
            } else {
                router.push("/login")
            }
        } catch (error) {
            console.error("Error checking authorization:", error)
            router.push("/login")
        } finally {
            setAuthLoading(false)
        }
    }

    async function fetchLogs() {
        try {
            setLoading(true)
            const response = await fetch("/api/logs")
            if (response.ok) {
                const data = await response.json()
                setLogs(data)
            }
        } catch (error) {
            console.error("Error fetching logs:", error)
        } finally {
            setLoading(false)
        }
    }

    const filteredLogs = logs.filter(log =>
        log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (log.admin_name || log.admin_username || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.action.toLowerCase().includes(searchTerm.toLowerCase())
    )

    if (authLoading) {
        return (
            <DashboardShell>
                <div className="flex items-center justify-center min-h-[400px]">
                    <div className="text-center font-medium text-muted-foreground italic">
                        Checking authorization...
                    </div>
                </div>
            </DashboardShell>
        )
    }

    if (!isAuthorized) return null

    return (
        <DashboardShell>
            <div className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight">System Activity Logs</h1>
                <p className="text-muted-foreground mt-1">
                    Track administrative actions and data exports across the system.
                </p>
            </div>

            <Card className="border-none shadow-xl shadow-indigo-500/5">
                <CardHeader className="pb-0">
                    <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                                <History className="h-5 w-5" />
                            </div>
                            <div>
                                <CardTitle>Activity History</CardTitle>
                                <CardDescription>Recent actions performed by administrators</CardDescription>
                            </div>
                        </div>
                        <div className="relative w-full md:w-96">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder="Search logs by user, action or details..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10 h-10 border-slate-200 focus:ring-2 focus:ring-indigo-500/20"
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="pt-6">
                    <div className="rounded-xl border border-slate-100 overflow-hidden bg-white">
                        <Table>
                            <TableHeader className="bg-slate-50/50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                <TableRow className="hover:bg-transparent">
                                    <TableHead className="w-[200px] h-11 px-6"><User className="inline h-3.5 w-3.5 mr-1.5" />Performed By</TableHead>
                                    <TableHead className="w-[180px] h-11 px-4"><Info className="inline h-3.5 w-3.5 mr-1.5" />Action</TableHead>
                                    <TableHead className="h-11 px-4">Details</TableHead>
                                    <TableHead className="w-[220px] h-11 px-6 text-right"><Calendar className="inline h-3.5 w-3.5 mr-1.5" />Timestamp</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="h-32 text-center text-slate-400 italic">
                                            Loading activity repository...
                                        </TableCell>
                                    </TableRow>
                                ) : filteredLogs.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="h-32 text-center text-slate-400 italic font-medium">
                                            No logs found matching your search.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredLogs.map((log) => (
                                        <TableRow key={log.id} className="hover:bg-indigo-50/20 transition-colors border-b border-slate-50 last:border-0">
                                            <TableCell className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-slate-900">{log.admin_name || "Unknown Admin"}</span>
                                                    <span className="text-[10px] text-slate-400 font-medium">@{log.admin_username || "unknown"}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="px-4 py-4">
                                                <Badge className={`rounded-lg px-2.5 py-1 font-bold tracking-tight text-[10px] uppercase ${log.action.includes('Export')
                                                    ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-100'
                                                    : log.action === 'Login'
                                                        ? 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-indigo-100'
                                                        : log.action === 'Logout'
                                                            ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 border-amber-100'
                                                            : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-100'
                                                    }`} variant="outline">
                                                    {log.action}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="px-4 py-4">
                                                <span className="text-sm font-medium text-slate-600 line-clamp-2 leading-relaxed">
                                                    {log.details}
                                                </span>
                                            </TableCell>
                                            <TableCell className="px-6 py-4 text-right">
                                                <div className="flex flex-col items-end">
                                                    <span className="text-sm font-bold text-slate-700">
                                                        {formatReadableDate(log.created_at)}
                                                    </span>
                                                    <span className="text-[11px] font-bold text-indigo-500/70 tracking-tight">
                                                        {formatTo12Hour(new Date(log.created_at).toLocaleTimeString())}
                                                        {/* Note: formatTo12Hour takes HH:MM:SS or similar */}
                                                        {new Date(log.created_at).toLocaleTimeString('en-US', { hour12: true, hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                    {filteredLogs.length > 0 && (
                        <p className="text-[11px] text-slate-400 mt-4 font-bold uppercase tracking-widest text-center">
                            End of Log Stream • {filteredLogs.length} Records Retrieved
                        </p>
                    )}
                </CardContent>
            </Card>
        </DashboardShell>
    )
}
