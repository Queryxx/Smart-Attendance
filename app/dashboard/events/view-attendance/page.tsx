"use client"

import { useEffect, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { DashboardShell } from "@/components/dashboard-shell"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import { ArrowLeft, Download, Users, Calendar, Clock, MapPin, CheckCircle, Search, Filter } from "lucide-react"

interface SessionData {
    in?: string
    out?: string
}

interface GroupedAttendance {
    student_id: number
    student_number: string
    first_name: string
    last_name: string
    course_id: number
    section_id: number
    year_level: string
    photo: string
    sessions: {
        AM: SessionData
        PM: SessionData
    }
    sessionsAttended: number
}

function AttendanceContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const eventId = searchParams.get("eventId")

    const [event, setEvent] = useState<any>(null)
    const [students, setStudents] = useState<any[]>([])
    const [attendanceRecords, setAttendanceRecords] = useState<any[]>([])
    const [groupedRecords, setGroupedRecords] = useState<GroupedAttendance[]>([])
    const [loading, setLoading] = useState(true)
    const [courses, setCourses] = useState<any[]>([])
    const [sections, setSections] = useState<any[]>([])

    // Search and Filter State
    const [searchTerm, setSearchTerm] = useState("")
    const [selectedCourse, setSelectedCourse] = useState("all")
    const [selectedYear, setSelectedYear] = useState("all")

    useEffect(() => {
        if (!eventId) {
            router.push("/dashboard/events")
            return
        }

        const fetchData = async () => {
            try {
                setLoading(true)

                // Fetch events to find this specific event
                const eventsRes = await fetch("/api/events")
                if (eventsRes.ok) {
                    const eventsData = await eventsRes.json()
                    const foundEvent = eventsData.find((e: any) => e.id.toString() === eventId)
                    if (foundEvent) {
                        setEvent(foundEvent)

                        // Fetch students
                        const studentsRes = await fetch("/api/students")
                        const studentsData = studentsRes.ok ? await studentsRes.json() : []

                        // Fetch attendance records for this event
                        const attendanceRes = await fetch(`/api/attendance?eventId=${eventId}`)
                        const attendanceData = attendanceRes.ok ? await attendanceRes.json() : []

                        // Fetch courses for labels
                        const coursesRes = await fetch("/api/courses")
                        const coursesData = coursesRes.ok ? await coursesRes.json() : []
                        setCourses(coursesData)

                        // Fetch sections for labels
                        const sectionsRes = await fetch("/api/sections")
                        const sectionsData = sectionsRes.ok ? await sectionsRes.json() : []
                        setSections(sectionsData)

                        // Process and group
                        processAttendance(attendanceData, studentsData, foundEvent)
                    } else {
                        router.push("/dashboard/events")
                    }
                }
            } catch (error) {
                console.error("Error fetching attendance data:", error)
            } finally {
                setLoading(false)
            }
        }

        fetchData()
    }, [eventId, router])

    const processAttendance = (attendance: any[], students: any[], event: any) => {
        const expectedAM = !!(event.am_in_start_time || event.am_out_start_time);
        const expectedPM = !!(event.pm_in_start_time || event.pm_out_start_time);

        // Determine eligible students
        const eligibleCourseIds = event.course_ids ? (Array.isArray(event.course_ids) ? event.course_ids.map(Number) : [Number(event.course_ids)]) : []

        const eligibleStudents = students.filter(student => {
            if (eligibleCourseIds.length === 0) return true
            return eligibleCourseIds.includes(Number(student.course_id))
        })

        const result = eligibleStudents.map(student => {
            const studentAttendance = attendance.filter(r => Number(r.student_id) === Number(student.id))

            const record: GroupedAttendance = {
                student_id: student.id,
                student_number: student.student_number,
                first_name: student.first_name,
                last_name: student.last_name,
                course_id: student.course_id,
                section_id: student.section_id,
                year_level: student.year_level,
                photo: student.photo,
                sessions: { AM: {}, PM: {} },
                sessionsAttended: 0,
            }

            studentAttendance.forEach(att => {
                const session = att.session || "AM"
                const type = att.type || "IN"
                const time = att.time_recorded ? new Date(att.time_recorded).toLocaleTimeString("en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: true,
                }) : ""

                if (type === "IN") record.sessions[session as "AM" | "PM"].in = time
                else if (type === "OUT") record.sessions[session as "AM" | "PM"].out = time
            })

            let count = 0
            if (expectedAM && (record.sessions.AM.in || record.sessions.AM.out)) count++
            if (expectedPM && (record.sessions.PM.in || record.sessions.PM.out)) count++
            record.sessionsAttended = count

            return record
        })

        setGroupedRecords(result)
    }

    const getCourseName = (id: number) => {
        const course = courses.find(c => c.id === id)
        return course ? course.course_name : "Unknown"
    }

    const getSectionName = (id: number) => {
        const section = sections.find(s => s.id === id)
        return section ? section.section_name : "Unknown"
    }

    const handleExport = async () => {
        try {
            const res = await fetch("/api/events", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: eventId, is_exported: true })
            })

            if (res.ok) {
                setEvent({ ...event, is_exported: true })
            }
        } catch (error) {
            console.error("Error exporting attendance:", error)
        }
    }

    const filteredRecords = groupedRecords.filter(record => {
        const matchesSearch =
            record.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            record.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            record.student_number.includes(searchTerm);

        const matchesCourse = selectedCourse === "all" || record.course_id.toString() === selectedCourse;
        const matchesYear = selectedYear === "all" || record.year_level === selectedYear;

        return matchesSearch && matchesCourse && matchesYear;
    });

    if (loading) {
        return (
            <DashboardShell>
                <Skeleton className="h-8 w-64 mb-6" />
                <Skeleton className="h-[400px] w-full rounded-2xl" />
            </DashboardShell>
        )
    }

    if (!event) return null

    return (
        <DashboardShell>
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div className="flex items-center gap-4">
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => router.push("/dashboard/events")}
                        className="rounded-xl border-slate-200 hover:bg-white transiton-all"
                    >
                        <ArrowLeft className="h-4 w-4 text-slate-600" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Event Attendance</h1>
                        <p className="text-slate-500 text-sm font-medium">{event.event_name}</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {event.is_exported ? (
                        <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-emerald-200 py-2 px-4 rounded-xl gap-2 h-10">
                            <CheckCircle className="h-4 w-4" />
                            Exported to Dashboard
                        </Badge>
                    ) : (() => {
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        const eventDate = new Date(event.event_date);
                        eventDate.setHours(0, 0, 0, 0);
                        const isDone = eventDate.getTime() < today.getTime();

                        return (
                            <div className="flex flex-col items-end gap-1">
                                <Button
                                    onClick={handleExport}
                                    disabled={!isDone}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl gap-2 shadow-lg shadow-indigo-100 transition-all font-medium py-5 px-6 disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"
                                >
                                    <Download className="h-4 w-4" />
                                    Finalize & Export
                                </Button>
                                {!isDone && (
                                    <span className="text-[10px] text-amber-600 font-bold uppercase italic mr-2">
                                        Available after event date
                                    </span>
                                )}
                            </div>
                        );
                    })()}
                </div>
            </div>

            {/* Event Info Card */}
            <Card className="mb-8 border-none shadow-sm bg-white rounded-2xl overflow-hidden">
                <CardHeader className="bg-slate-50/50 border-b border-slate-100 px-8 py-5">
                    <CardTitle className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-indigo-500" />
                        Event Details
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="space-y-1">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Date</p>
                            <p className="text-lg font-bold text-slate-900">
                                {new Date(event.event_date).toLocaleDateString('en-US', {
                                    weekday: 'long',
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                })}
                            </p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Students</p>
                            <p className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                <Users className="h-5 w-5 text-indigo-500" />
                                {groupedRecords.length} Eligible Students
                            </p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Attendance Fine</p>
                            <p className="text-lg font-bold text-slate-900">₱{parseFloat(event.fine_amount).toFixed(2)}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Main Attendance Table */}
            <Card className="border-none shadow-sm bg-white rounded-2xl overflow-hidden">
                <CardHeader className="bg-slate-50/50 border-b border-slate-100 px-8 py-5">
                    <div className="flex justify-between items-center">
                        <CardTitle className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                            <Users className="h-4 w-4 text-indigo-500" />
                            Student Attendance List
                        </CardTitle>
                    </div>
                </CardHeader>
                <CardContent className="p-0 border-b border-slate-100">
                    <div className="p-6 bg-slate-50/30 flex flex-col md:flex-row gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder="Search student name or number..."
                                className="pl-10 rounded-xl border-slate-200 bg-white"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="flex flex-wrap gap-3">
                            <select
                                className="h-10 px-4 rounded-xl border border-slate-200 bg-white text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none min-w-[140px]"
                                value={selectedCourse}
                                onChange={(e) => setSelectedCourse(e.target.value)}
                            >
                                <option value="all">All Courses</option>
                                {courses.map(course => (
                                    <option key={course.id} value={course.id}>{course.course_name}</option>
                                ))}
                            </select>

                            <select
                                className="h-10 px-4 rounded-xl border border-slate-200 bg-white text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none min-w-[120px]"
                                value={selectedYear}
                                onChange={(e) => setSelectedYear(e.target.value)}
                            >
                                <option value="all">All Years</option>
                                <option value="1">Year 1</option>
                                <option value="2">Year 2</option>
                                <option value="3">Year 3</option>
                                <option value="4">Year 4</option>
                            </select>
                        </div>
                    </div>
                </CardContent>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-slate-50/30">
                            <TableRow className="hover:bg-transparent border-slate-100">
                                <TableHead className="font-bold text-slate-600 px-8 h-12">Student Info</TableHead>
                                <TableHead className="font-bold text-slate-600 h-12">Year/Section</TableHead>
                                <TableHead className="font-bold text-slate-600 h-12">AM Session</TableHead>
                                <TableHead className="font-bold text-slate-600 h-12">PM Session</TableHead>
                                <TableHead className="font-bold text-slate-600 h-12 text-center pr-8">Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredRecords.map((record) => (
                                <TableRow key={record.student_number} className="hover:bg-slate-50/50 transition-colors border-slate-50">
                                    <TableCell className="px-8 py-4">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-slate-900 text-sm">
                                                {record.last_name}, {record.first_name}
                                            </span>
                                            <span className="text-xs text-slate-500 font-medium">#{record.student_number}</span>
                                            <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full w-max mt-1 font-bold">
                                                {getCourseName(Number(record.course_id))}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold text-slate-800">Year {record.year_level}</span>
                                            <span className="text-xs text-slate-500 font-medium">{getSectionName(Number(record.section_id))}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {!(event.am_in_start_time || event.am_out_start_time) ? (
                                            <span className="text-[10px] bg-slate-100 text-slate-400 px-2 py-1 rounded-md font-bold italic uppercase">
                                                Not Included
                                            </span>
                                        ) : (
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] font-bold text-slate-400 w-6">IN:</span>
                                                    <span className={`text-xs font-bold ${record.sessions.AM.in ? 'text-indigo-600' : event.am_in_start_time ? 'text-slate-300 italic' : 'text-slate-400 opacity-50'}`}>
                                                        {record.sessions.AM.in || (event.am_in_start_time ? "---" : "N/A")}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] font-bold text-slate-400 w-6">OUT:</span>
                                                    <span className={`text-xs font-bold ${record.sessions.AM.out ? 'text-indigo-600' : event.am_out_start_time ? 'text-slate-300 italic' : 'text-slate-400 opacity-50'}`}>
                                                        {record.sessions.AM.out || (event.am_out_start_time ? "---" : "N/A")}
                                                    </span>
                                                </div>
                                            </div>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        {!(event.pm_in_start_time || event.pm_out_start_time) ? (
                                            <span className="text-[10px] bg-slate-100 text-slate-400 px-2 py-1 rounded-md font-bold italic uppercase">
                                                Not Included
                                            </span>
                                        ) : (
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] font-bold text-slate-400 w-6">IN:</span>
                                                    <span className={`text-xs font-bold ${record.sessions.PM.in ? 'text-indigo-600' : event.pm_in_start_time ? 'text-slate-300 italic' : 'text-slate-400 opacity-50'}`}>
                                                        {record.sessions.PM.in || (event.pm_in_start_time ? "---" : "N/A")}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] font-bold text-slate-400 w-6">OUT:</span>
                                                    <span className={`text-xs font-bold ${record.sessions.PM.out ? 'text-indigo-600' : event.pm_out_start_time ? 'text-slate-300 italic' : 'text-slate-400 opacity-50'}`}>
                                                        {record.sessions.PM.out || (event.pm_out_start_time ? "---" : "N/A")}
                                                    </span>
                                                </div>
                                            </div>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-center pr-8">
                                        {(() => {
                                            const expectedAM = !!(event.am_in_start_time || event.am_out_start_time);
                                            const expectedPM = !!(event.pm_in_start_time || event.pm_out_start_time);
                                            const totalExpected = (expectedAM ? 1 : 0) + (expectedPM ? 1 : 0);

                                            if (totalExpected === 0) return <Badge variant="outline">N/A</Badge>;

                                            if (record.sessionsAttended >= totalExpected) {
                                                return <Badge className="bg-emerald-500 hover:bg-emerald-600 rounded-lg py-1 px-3">PRESENT</Badge>;
                                            } else if (record.sessionsAttended > 0) {
                                                return <Badge className="bg-amber-500 hover:bg-amber-600 rounded-lg py-1 px-3 text-white">PARTIAL</Badge>;
                                            } else {
                                                return <Badge variant="destructive" className="bg-rose-500 hover:bg-rose-600 rounded-lg py-1 px-3">ABSENT</Badge>;
                                            }
                                        })()}
                                    </TableCell>
                                </TableRow>
                            ))}
                            {filteredRecords.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-64 text-center">
                                        <div className="flex flex-col items-center justify-center gap-3">
                                            <div className="p-4 bg-slate-100 rounded-2xl">
                                                <Search className="h-8 w-8 text-slate-400" />
                                            </div>
                                            <p className="text-slate-500 font-medium italic">
                                                {groupedRecords.length === 0
                                                    ? "No students found for this event's courses."
                                                    : "No students matching your search filters."}
                                            </p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </DashboardShell>
    )
}

export default function AttendancePage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <AttendanceContent />
        </Suspense>
    )
}
