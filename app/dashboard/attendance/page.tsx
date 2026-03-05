"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { DashboardShell } from "@/components/dashboard-shell"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { formatReadableDate, formatTo12Hour } from "@/lib/utils"

interface SessionTime {
    in?: string
    out?: string
}

interface SessionData {
    AM: SessionTime
    PM: SessionTime
}

interface GroupedAttendance {
    student_id: number
    student_number: string
    first_name: string
    last_name: string
    course_id: number
    year_level: number
    section_id: number
    photo: string
    event_id: number
    event_date: string
    event_name: string
    fine_amount: number
    sessions: SessionData
    sessionsAttended: number
    totalActiveSessions: number
    activeSessionConfig: {
        amIn: boolean
        amOut: boolean
        pmIn: boolean
        pmOut: boolean
    }
}

export default function AttendancePage() {
    const [attendanceRecords, setAttendanceRecords] = useState<any[]>([])
    const [groupedRecords, setGroupedRecords] = useState<GroupedAttendance[]>([])
    const [courses, setCourses] = useState<any[]>([])
    const [events, setEvents] = useState<any[]>([])
    const [sections, setSections] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState("")
    const [filterStatus, setFilterStatus] = useState("all")
    const [filterEvent, setFilterEvent] = useState("all")
    const [filterCourse, setFilterCourse] = useState("all")
    const [exportDialogOpen, setExportDialogOpen] = useState(false)
    const [isAuthorized, setIsAuthorized] = useState(false)
    const [authLoading, setAuthLoading] = useState(true)
    const router = useRouter()
    const searchParams = useSearchParams()
    const initialEventId = searchParams.get("eventId") || "all"

    useEffect(() => {
        if (initialEventId !== "all") {
            setFilterEvent(initialEventId)
        }

        if (searchParams.get("export") === "true") {
            setExportDialogOpen(true)
        }
    }, [initialEventId, searchParams])

    useEffect(() => {
        checkAuthorization()
    }, [])

    async function checkAuthorization() {
        try {
            const response = await fetch("/api/auth/me")
            if (response.ok) {
                const data = await response.json()
                if (['superadmin', 'fine_manager', 'receipt_manager'].includes(data.role)) {
                    setIsAuthorized(true)
                } else {
                    router.push("/dashboard")
                    return
                }
            } else {
                router.push("/login")
                return
            }
        } catch (error) {
            console.error("Error checking authorization:", error)
            router.push("/login")
            return
        } finally {
            setAuthLoading(false)
        }
    }

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true)
                // Fetch students
                const studentsRes = await fetch("/api/students")
                let studentsData = []
                if (studentsRes.ok) {
                    studentsData = await studentsRes.json()
                }

                // Fetch events
                const eventsRes = await fetch("/api/events")
                let eventsData = []
                if (eventsRes.ok) {
                    eventsData = await eventsRes.json()
                    setEvents(eventsData)
                }

                // Fetch attendance records
                const attendanceRes = await fetch("/api/attendance")
                if (attendanceRes.ok) {
                    const attendanceData = await attendanceRes.json()
                    setAttendanceRecords(attendanceData)

                    // Group records by student and event
                    const urlEventId = searchParams.get("eventId")

                    // Filter events to process: a specific event if requested, or all exported ones
                    const eventsToProcess = urlEventId
                        ? eventsData.filter((e: any) => e.id.toString() === urlEventId)
                        : eventsData.filter((e: any) => e.is_exported)

                    // Always show all students for the chosen/exported events to ensure absent records are visible
                    const grouped = groupAttendanceWithAllStudents(attendanceData, studentsData, eventsToProcess, true)
                    setGroupedRecords(grouped)
                }

                // Fetch courses
                const coursesRes = await fetch("/api/courses")
                if (coursesRes.ok) {
                    const coursesData = await coursesRes.json()
                    setCourses(coursesData)
                }

                // Fetch sections
                const sectionsRes = await fetch("/api/sections")
                if (sectionsRes.ok) {
                    const sectionsData = await sectionsRes.json()
                    setSections(sectionsData)
                }
            } catch (error) {
                console.error("Error fetching data:", error)
            } finally {
                setLoading(false)
            }
        }

        fetchData()
    }, [searchParams])

    const groupAttendanceWithAllStudents = (attendanceRecords: any[], students: any[], events: any[], showAllStudents = false): GroupedAttendance[] => {
        const result: GroupedAttendance[] = []

        // Use the events passed in (they were already filtered in fetchData if necessary)
        const visibleEvents = events

        visibleEvents.forEach(event => {
            const eligibleCourseIds = event.course_ids ? (Array.isArray(event.course_ids) ? event.course_ids.map(Number) : [Number(event.course_ids)]) : []

            const eligibleStudents = students.filter(student => {
                if (eligibleCourseIds.length === 0) return true
                return eligibleCourseIds.includes(Number(student.course_id))
            })

            eligibleStudents.forEach(student => {
                const studentAttendance = attendanceRecords.filter(r =>
                    Number(r.student_id) === Number(student.id) &&
                    Number(r.event_id) === Number(event.id)
                )

                // Skip if showAllStudents is false and NO attendance records found
                if (!showAllStudents && studentAttendance.length === 0) return

                const activeConfig = {
                    amIn: !!event.am_in_start_time,
                    amOut: !!event.am_out_start_time,
                    pmIn: !!event.pm_in_start_time,
                    pmOut: !!event.pm_out_start_time
                }

                const totalActive = [activeConfig.amIn, activeConfig.amOut, activeConfig.pmIn, activeConfig.pmOut].filter(Boolean).length

                const record: GroupedAttendance = {
                    student_id: student.id,
                    student_number: student.student_number,
                    first_name: student.first_name,
                    last_name: student.last_name,
                    course_id: student.course_id,
                    year_level: student.year_level,
                    section_id: student.section_id,
                    photo: student.photo,
                    event_id: event.id,
                    event_date: event.event_date,
                    event_name: event.event_name,
                    fine_amount: event.fine_amount || 0,
                    sessions: { AM: {}, PM: {} },
                    sessionsAttended: 0,
                    totalActiveSessions: totalActive,
                    activeSessionConfig: activeConfig
                }

                studentAttendance.forEach(att => {
                    const session = att.session || "AM"
                    const type = att.type || "IN"
                    const time = att.time_recorded ? new Date(att.time_recorded).toLocaleTimeString("en-US", {
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: false,
                    }) : ""

                    if (type === "IN") record.sessions[session as keyof SessionData].in = time
                    else if (type === "OUT") record.sessions[session as keyof SessionData].out = time
                })

                // Calculate sessions attended
                let count = 0
                // We count an "attended session" if THEY HAVE ANY RECORD for that session.
                // However, the export logic checks IN and OUT separately.
                // To match the new logic where each IN/OUT is 1/N of the fine:
                if (record.sessions.AM.in) count++
                if (record.sessions.AM.out) count++
                if (record.sessions.PM.in) count++
                if (record.sessions.PM.out) count++

                record.sessionsAttended = count

                result.push(record)
            })
        })

        return result
    }

    // Helper function to abbreviate course names
    const abbreviateCourseName = (fullName: string): string => {
        const abbreviations: { [key: string]: string } = {
            "Bachelor of Science in Information Technology": "BSIT",
            "Bachelor of Science in Computer Science": "BSCS",
            "Bachelor of Science in Information Systems": "BSIS",
            "Bachelor of Arts": "BA",
            "Bachelor of Science": "BS",
            "Master of Science": "MS",
            "Master of Business Administration": "MBA",
        }

        // Check for exact matches first
        if (abbreviations[fullName]) {
            return abbreviations[fullName]
        }

        // If no exact match, return original
        return fullName
    }

    // Helper function to get course name by ID
    const getCourseName = (courseId: number) => {
        const course = courses.find((c) => c.id === courseId)
        if (!course) return "N/A"
        return abbreviateCourseName(course.course_name)
    }

    // Helper function to get section name by ID
    const getSectionName = (sectionId: number) => {
        const section = sections.find((s) => s.id === sectionId)
        return section ? section.section_name : "N/A"
    }

    // Filter records based on search term and filters
    const filteredRecords = groupedRecords.filter((record) => {
        const matchesSearch =
            record.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            record.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            record.student_number?.includes(searchTerm)

        const matchesStatus = filterStatus === "all" ||
            (filterStatus === "present" && record.sessionsAttended >= 2) ||
            (filterStatus === "partial" && record.sessionsAttended === 1) ||
            (filterStatus === "absent" && record.sessionsAttended === 0)

        const matchesEvent = filterEvent === "all" || record.event_id.toString() === filterEvent

        const matchesCourse = filterCourse === "all" || record.course_id.toString() === filterCourse

        return matchesSearch && matchesStatus && matchesEvent && matchesCourse
    })

    // Calculate fine based on sessions MISSED (not attended)
    const calculateFinePerSession = (totalFine: number, sessionsAttended: number, totalActive: number) => {
        if (totalActive === 0) return 0
        const finePerSlot = totalFine / totalActive
        const sessionsMissed = totalActive - sessionsAttended
        return finePerSlot * sessionsMissed
    }

    const getStatusColor = (sessionsAttended: number, totalActive: number) => {
        if (totalActive === 0) return "bg-gray-100 text-gray-800"
        if (sessionsAttended === 0) {
            return "bg-red-100 text-red-800"
        } else if (sessionsAttended < totalActive) {
            return "bg-yellow-100 text-yellow-800"
        } else {
            return "bg-green-100 text-green-800"
        }
    }

    const getStatusText = (sessionsAttended: number, totalActive: number) => {
        if (totalActive === 0) return "N/A"
        if (sessionsAttended === 0) return "ABSENT"
        if (sessionsAttended < totalActive) return "PARTIAL"
        return "PRESENT"
    }

    // Export to Excel function
    const exportToExcel = () => {
        try {
            // Create CSV content
            const headers = ['ID', 'Name', 'Course', 'Section', 'Event', 'AM IN', 'AM OUT', 'PM IN', 'PM OUT', 'Status', 'Fine']
            const rows = filteredRecords.map((record) => {
                const amIn = !record.activeSessionConfig.amIn ? 'N/A' : (record.sessions?.AM?.in ? formatTo12Hour(record.sessions.AM.in) : 'ABSENT')
                const amOut = !record.activeSessionConfig.amOut ? 'N/A' : (record.sessions?.AM?.out ? formatTo12Hour(record.sessions.AM.out) : 'ABSENT')
                const pmIn = !record.activeSessionConfig.pmIn ? 'N/A' : (record.sessions?.PM?.in ? formatTo12Hour(record.sessions.PM.in) : 'ABSENT')
                const pmOut = !record.activeSessionConfig.pmOut ? 'N/A' : (record.sessions?.PM?.out ? formatTo12Hour(record.sessions.PM.out) : 'ABSENT')
                const fineAmount = calculateFinePerSession(record.fine_amount || 0, record.sessionsAttended, record.totalActiveSessions)

                return [
                    record.student_number,
                    `${record.last_name}, ${record.first_name}`,
                    getCourseName(record.course_id),
                    getSectionName(record.section_id),
                    record.event_name || 'N/A',
                    amIn,
                    amOut,
                    pmIn,
                    pmOut,
                    getStatusText(record.sessionsAttended, record.totalActiveSessions),
                    `P ${fineAmount.toFixed(2)}`,
                ]
            })

            // Convert to CSV
            const csvContent = [
                [`Attendance Records Report - ${new Date().toLocaleDateString()}`],
                [],
                [headers.join(',')],
                ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
            ].join('\n')

            // Create blob and download
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
            const link = document.createElement('a')
            const url = URL.createObjectURL(blob)
            link.setAttribute('href', url)
            link.setAttribute('download', `attendance-records-${new Date().toLocaleDateString()}.csv`)
            link.style.visibility = 'hidden'
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)

            setExportDialogOpen(false)
        } catch (error) {
            console.error('Error exporting to Excel:', error)
            alert('Error exporting to Excel. Please try again.')
        }
    }

    // Export to PDF function
    const exportToPDF = async () => {
        setExportDialogOpen(false)
        try {
            const jsPDF = (await import('jspdf')).jsPDF
            const autoTable = (await import('jspdf-autotable')).default

            const pdf = new jsPDF({
                orientation: 'landscape',
                unit: 'mm',
                format: 'a4',
            })

            const pageWidth = pdf.internal.pageSize.getWidth()
            let currentY = 10

            // Add Logo from public folder
            try {
                const logoPath = 'public/pdf-logo.png'
                const response = await fetch('/pdf-logo.png')
                const blob = await response.blob()
                const reader = new FileReader()

                await new Promise<void>((resolve, reject) => {
                    reader.onload = () => {
                        try {
                            const logoWidth = 28
                            const logoHeight = 28
                            const logoX = (pageWidth - logoWidth) / 2
                            pdf.addImage(reader.result as string, 'PNG', logoX, currentY, logoWidth, logoHeight)
                            currentY += logoHeight + 3
                            resolve()
                        } catch (error) {
                            reject(error)
                        }
                    }
                    reader.onerror = () => reject(new Error('Failed to read logo'))
                    reader.readAsDataURL(blob)
                })
            } catch (error) {
                console.log('Logo not loaded, continuing without it:', error)
                currentY += 3
            }

            // Add Title and Description centered
            pdf.setFontSize(14)
            pdf.setFont('helvetica', 'bold')
            pdf.text('Attendance Records Report', pageWidth / 2, currentY, { align: 'center' })
            currentY += 6

            pdf.setFontSize(10)
            pdf.setFont('helvetica', 'normal')
            const selectedEvent = events.find((e) => e.id.toString() === filterEvent)
            const eventDescription = selectedEvent ? `Record of Attendance within: ${selectedEvent.event_name}` : 'Record of Attendance'
            pdf.text(eventDescription, pageWidth / 2, currentY, { align: 'center' })
            currentY += 5

            // Date info
            pdf.setFontSize(9)
            pdf.text(`Date Generated: ${new Date().toLocaleDateString()} | Total Records: ${filteredRecords.length}`, pageWidth / 2, currentY, { align: 'center' })
            currentY += 2

            const tableData = filteredRecords.map((record) => {
                const amIn = !record.activeSessionConfig.amIn ? 'N/A' : (record.sessions?.AM?.in ? formatTo12Hour(record.sessions.AM.in) : 'ABSENT')
                const amOut = !record.activeSessionConfig.amOut ? 'N/A' : (record.sessions?.AM?.out ? formatTo12Hour(record.sessions.AM.out) : 'ABSENT')
                const pmIn = !record.activeSessionConfig.pmIn ? 'N/A' : (record.sessions?.PM?.in ? formatTo12Hour(record.sessions.PM.in) : 'ABSENT')
                const pmOut = !record.activeSessionConfig.pmOut ? 'N/A' : (record.sessions?.PM?.out ? formatTo12Hour(record.sessions.PM.out) : 'ABSENT')
                const fineAmount = calculateFinePerSession(record.fine_amount || 0, record.sessionsAttended, record.totalActiveSessions)

                return [
                    String(record.student_number || ''),
                    `${record.last_name || ''}, ${record.first_name || ''}`,
                    String(getCourseName(record.course_id) || 'N/A'),
                    String(getSectionName(record.section_id) || 'N/A'),
                    String(record.event_name || 'N/A'),
                    String(amIn),
                    String(amOut),
                    String(pmIn),
                    String(pmOut),
                    String(getStatusText(record.sessionsAttended, record.totalActiveSessions)),
                    `P ${fineAmount.toFixed(2)}`,
                ]
            })

            // Calculate available width (landscape A4: 297mm)
            const marginLeft = 8
            const marginRight = 8
            const availableWidth = pageWidth - marginLeft - marginRight

            // Create table using autoTable
            autoTable(pdf, {
                startY: currentY + 2,
                head: [['ID', 'Name', 'Course', 'Section', 'Event', 'AM IN', 'AM OUT', 'PM IN', 'PM OUT', 'Status', 'Fine']],
                body: tableData,
                theme: 'grid',
                headStyles: {
                    fillColor: [41, 128, 185],
                    textColor: [255, 255, 255],
                    fontStyle: 'bold',
                    fontSize: 8,
                    cellPadding: 2,
                    halign: 'center',
                    valign: 'middle',
                    lineColor: [30, 100, 160],
                    lineWidth: 0.5,
                },
                bodyStyles: {
                    fontSize: 7,
                    cellPadding: 1.5,
                    halign: 'center',
                    valign: 'middle',
                    lineColor: [180, 180, 180],
                    lineWidth: 0.3,
                },
                alternateRowStyles: {
                    fillColor: [240, 245, 250],
                },
                columnStyles: {
                    0: { cellWidth: availableWidth * 0.08 },
                    1: { cellWidth: availableWidth * 0.15, halign: 'left' },
                    2: { cellWidth: availableWidth * 0.10 },
                    3: { cellWidth: availableWidth * 0.08 },
                    4: { cellWidth: availableWidth * 0.12 },
                    5: { cellWidth: availableWidth * 0.08 },
                    6: { cellWidth: availableWidth * 0.08 },
                    7: { cellWidth: availableWidth * 0.08 },
                    8: { cellWidth: availableWidth * 0.08 },
                    9: { cellWidth: availableWidth * 0.08 },
                    10: { cellWidth: availableWidth * 0.09, halign: 'right' },
                },
                margin: { top: 28, right: marginRight, bottom: 12, left: marginLeft },
                didDrawPage: function (data: any) {
                    // Footer
                    const pageSize = pdf.internal.pageSize
                    const pageHeight = pageSize.getHeight()
                    const pageWidth = pageSize.getWidth()
                    pdf.setFontSize(8)
                    pdf.setTextColor(100, 100, 100)
                    pdf.text(
                        `Page ${data.pageNumber}`,
                        pageWidth / 2,
                        pageHeight - 8,
                        { align: 'center' }
                    )
                },
            })

            pdf.save(`attendance-records-${new Date().toLocaleDateString()}.pdf`)
        } catch (error) {
            console.error('Error exporting to PDF:', error)
            alert('Error exporting to PDF. Please try again.')
        }
    }

    if (authLoading) {
        return (
            <DashboardShell>
                <div className="text-center py-8">Loading...</div>
            </DashboardShell>
        )
    }

    if (!isAuthorized) {
        return null // This won't render as user will be redirected
    }

    return (
        <DashboardShell>
            <div className="mb-8">
                <h1 className="text-3xl font-bold">Attendance Management</h1>
                <p className="text-muted-foreground">View all student attendance records</p>
            </div>

            <Tabs defaultValue="all-attendance" className="space-y-6">
                <TabsList>
                    <TabsTrigger value="all-attendance">All Attendance Records</TabsTrigger>
                </TabsList>

                <TabsContent value="all-attendance" className="space-y-4">
                    {/* Summary Stats - Moved to top */}
                    {!loading && groupedRecords.length > 0 && (
                        <div className="grid grid-cols-4 gap-4 mb-8">
                            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                                <p className="text-sm text-green-600 font-semibold mb-1">PRESENT</p>
                                <p className="text-2xl font-bold text-green-700">
                                    {filteredRecords.filter((r) => r.sessionsAttended >= 2).length}
                                </p>
                            </div>
                            <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                                <p className="text-sm text-yellow-600 font-semibold mb-1">PARTIAL</p>
                                <p className="text-2xl font-bold text-yellow-700">
                                    {filteredRecords.filter((r) => r.sessionsAttended > 0 && r.sessionsAttended < r.totalActiveSessions).length}
                                </p>
                            </div>
                            <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                                <p className="text-sm text-red-600 font-semibold mb-1">ABSENT</p>
                                <p className="text-2xl font-bold text-red-700">
                                    {filteredRecords.filter((r) => r.totalActiveSessions > 0 && r.sessionsAttended === 0).length}
                                </p>
                            </div>
                            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                                <p className="text-sm text-blue-600 font-semibold mb-1">TOTAL FINES</p>
                                <p className="text-2xl font-bold text-blue-700">
                                    ₱{filteredRecords.reduce((sum, r) => sum + calculateFinePerSession(r.fine_amount, r.sessionsAttended, r.totalActiveSessions), 0).toFixed(2)}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Filters */}
                    <div className="flex gap-4 mb-6 items-center flex-wrap">
                        <Input
                            placeholder="Search by student name or ID..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="flex-1 min-w-[250px]"
                        />
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="px-4 py-2 border border-input rounded-md bg-background text-sm"
                        >
                            <option value="all">All Status</option>
                            <option value="present">Present</option>
                            <option value="partial">Partial</option>
                            <option value="absent">Absent</option>
                        </select>
                        <select
                            value={filterCourse}
                            onChange={(e) => setFilterCourse(e.target.value)}
                            className="px-4 py-2 border border-input rounded-md bg-background text-sm"
                        >
                            <option value="all">All Courses</option>
                            {courses.map((course) => (
                                <option key={course.id} value={course.id}>
                                    {abbreviateCourseName(course.course_name)}
                                </option>
                            ))}
                        </select>
                        <select
                            value={filterEvent}
                            onChange={(e) => setFilterEvent(e.target.value)}
                            className="px-4 py-2 border border-input rounded-md bg-background text-sm"
                        >
                            <option value="all">All Events</option>
                            {events && events.length > 0 ? (
                                events.map((event) => (
                                    <option key={event.id} value={event.id}>
                                        {event.event_name}
                                    </option>
                                ))
                            ) : (
                                <option disabled>No events available</option>
                            )}
                        </select>
                        <Button
                            onClick={() => setExportDialogOpen(true)}
                            disabled={filteredRecords.length === 0}
                            className="bg-green-600 hover:bg-green-700 text-white"
                        >
                            Export
                        </Button>
                    </div>

                    {/* Export Format Dialog */}
                    <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Export Attendance Records</DialogTitle>
                                <DialogDescription>
                                    Choose the format you want to export the attendance records in.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="flex gap-4 justify-center mt-6">
                                <Button
                                    onClick={exportToPDF}
                                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2"
                                >
                                    📄 Export as PDF
                                </Button>
                                <Button
                                    onClick={exportToExcel}
                                    className="bg-green-600 hover:bg-green-700 text-white px-6 py-2"
                                >
                                    📊 Export as Excel
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>

                    {/* Attendance Table */}
                    <div className="border rounded-lg overflow-hidden overflow-x-auto">
                        <Table className="w-full" id="attendance-table">
                            <TableHeader className="bg-slate-100">
                                <TableRow>
                                    <TableHead className="font-bold">Photo</TableHead>
                                    <TableHead className="font-bold">Student ID</TableHead>
                                    <TableHead className="font-bold">Student Name</TableHead>
                                    <TableHead className="font-bold">Course</TableHead>
                                    <TableHead className="font-bold">Section</TableHead>
                                    <TableHead className="font-bold">Year</TableHead>
                                    <TableHead className="font-bold">Event</TableHead>
                                    <TableHead className="font-bold">Event Date</TableHead>
                                    <TableHead className="font-bold">AM Session</TableHead>
                                    <TableHead className="font-bold">PM Session</TableHead>
                                    <TableHead className="font-bold">Status</TableHead>
                                    <TableHead className="font-bold">Fine per Session</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={12} className="text-center py-8">
                                            <div className="flex justify-center items-center">
                                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : filteredRecords.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={12} className="text-center py-8 text-muted-foreground">
                                            No attendance records found
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredRecords.map((record, idx) => (
                                        <TableRow key={idx} className="hover:bg-slate-50 transition-colors">
                                            <TableCell>
                                                {record.photo ? (
                                                    <img
                                                        src={record.photo}
                                                        alt={`${record.first_name} ${record.last_name}`}
                                                        className="w-10 h-10 rounded-full object-cover border border-slate-200"
                                                    />
                                                ) : (
                                                    <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-semibold">
                                                        {record.first_name?.charAt(0)}{record.last_name?.charAt(0)}
                                                    </div>
                                                )}
                                            </TableCell>
                                            <TableCell className="font-semibold text-slate-900">
                                                {record.student_number}
                                            </TableCell>
                                            <TableCell className="font-medium text-slate-900">
                                                {record.last_name}, {record.first_name}
                                            </TableCell>
                                            <TableCell className="text-slate-700">
                                                {getCourseName(record.course_id)}
                                            </TableCell>
                                            <TableCell className="text-slate-700">
                                                {getSectionName(record.section_id)}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <span className="inline-block bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm font-semibold">
                                                    Year {record.year_level}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-slate-700 font-medium whitespace-nowrap">
                                                {record.event_name || "N/A"}
                                            </TableCell>
                                            <TableCell>
                                                {record.event_date
                                                    ? formatReadableDate(record.event_date)
                                                    : "N/A"}
                                            </TableCell>
                                            <TableCell className="text-xs whitespace-nowrap">
                                                <div className="space-y-1">
                                                    <div>
                                                        IN: {!record.activeSessionConfig.amIn ? (
                                                            <span className="text-slate-400 font-medium">N/A</span>
                                                        ) : record.sessions.AM.in ? (
                                                            <span className="text-green-700 font-semibold">{formatTo12Hour(record.sessions.AM.in)}</span>
                                                        ) : (
                                                            <span className="text-red-700 font-bold">- A</span>
                                                        )}
                                                    </div>
                                                    <div>
                                                        OUT: {!record.activeSessionConfig.amOut ? (
                                                            <span className="text-slate-400 font-medium">N/A</span>
                                                        ) : record.sessions.AM.out ? (
                                                            <span className="text-green-700 font-semibold">{formatTo12Hour(record.sessions.AM.out)}</span>
                                                        ) : (
                                                            <span className="text-red-700 font-bold">- A</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-xs whitespace-nowrap">
                                                <div className="space-y-1">
                                                    <div>
                                                        IN: {!record.activeSessionConfig.pmIn ? (
                                                            <span className="text-slate-400 font-medium">N/A</span>
                                                        ) : record.sessions.PM.in ? (
                                                            <span className="text-green-700 font-semibold">{formatTo12Hour(record.sessions.PM.in)}</span>
                                                        ) : (
                                                            <span className="text-red-700 font-bold">- A</span>
                                                        )}
                                                    </div>
                                                    <div>
                                                        OUT: {!record.activeSessionConfig.pmOut ? (
                                                            <span className="text-slate-400 font-medium">N/A</span>
                                                        ) : record.sessions.PM.out ? (
                                                            <span className="text-green-700 font-semibold">{formatTo12Hour(record.sessions.PM.out)}</span>
                                                        ) : (
                                                            <span className="text-red-700 font-bold">- A</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(record.sessionsAttended, record.totalActiveSessions)}`}>
                                                    {getStatusText(record.sessionsAttended, record.totalActiveSessions)}
                                                </span>
                                            </TableCell>
                                            <TableCell className="font-semibold text-slate-900">
                                                ₱{calculateFinePerSession(record.fine_amount, record.sessionsAttended, record.totalActiveSessions).toFixed(2)}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </TabsContent>
            </Tabs>
        </DashboardShell>
    )
}
