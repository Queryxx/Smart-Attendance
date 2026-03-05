"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { DashboardShell } from "@/components/dashboard-shell"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Search, Users, ShieldAlert, Loader2 } from "lucide-react"

interface Student {
    id: string
    student_number: string
    first_name: string
    last_name: string
    year_level: number
    course_id: string
    section_id: string
}

export default function FinanceStudentsPage() {
    const [students, setStudents] = useState<Student[]>([])
    const [courses, setCourses] = useState<any[]>([])
    const [sections, setSections] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState("")
    const [selectedCourse, setSelectedCourse] = useState("all")
    const [selectedYear, setSelectedYear] = useState("all")
    const [isAuthorized, setIsAuthorized] = useState(false)
    const [authLoading, setAuthLoading] = useState(true)
    const router = useRouter()

    useEffect(() => {
        const checkAuth = async () => {
            try {
                const response = await fetch("/api/auth/me")
                if (response.ok) {
                    const data = await response.json()
                    if (["fine_manager", "receipt_manager"].includes(data.role)) {
                        setIsAuthorized(true)
                        fetchData()
                    } else {
                        router.push("/dashboard")
                    }
                } else {
                    router.push("/login")
                }
            } catch (err) {
                console.error("Auth check error:", err)
                router.push("/login")
            } finally {
                setAuthLoading(false)
            }
        }
        checkAuth()
    }, [router])

    async function fetchData() {
        try {
            const [studentsRes, coursesRes, sectionsRes] = await Promise.all([
                fetch("/api/students"),
                fetch("/api/courses"),
                fetch("/api/sections")
            ])

            if (studentsRes.ok) setStudents(await studentsRes.json())
            if (coursesRes.ok) setCourses(await coursesRes.json())
            if (sectionsRes.ok) setSections(await sectionsRes.json())
        } catch (err) {
            console.error("Fetch data error:", err)
        } finally {
            setLoading(false)
        }
    }

    const filteredStudents = students.filter((s) => {
        const matchesSearch =
            `${s.first_name} ${s.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.student_number.toLowerCase().includes(searchTerm.toLowerCase())

        const matchesCourse = selectedCourse === "all" || String(s.course_id) === selectedCourse
        const matchesYear = selectedYear === "all" || String(s.year_level) === selectedYear

        return matchesSearch && matchesCourse && matchesYear
    })

    const getCourseName = (id?: string) => {
        if (!id) return "N/A"
        const course = courses.find((c) => String(c.id) === String(id))
        return course ? course.course_name : "N/A"
    }

    const getSectionName = (id?: string) => {
        if (!id) return "N/A"
        const section = sections.find((s) => String(s.id) === String(id))
        return section ? section.section_name : "N/A"
    }

    if (authLoading) {
        return (
            <DashboardShell>
                <div className="flex justify-center py-20">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            </DashboardShell>
        )
    }

    if (!isAuthorized) return null

    return (
        <DashboardShell>
            <div className="mb-8">
                <h1 className="text-3xl font-bold">Students List</h1>
                <p className="text-muted-foreground italic">Role: Fine & Receipt Management View</p>
            </div>

            <Card className="border-none shadow-premium">
                <CardHeader className="bg-slate-50/50">
                    <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                        <div className="relative w-full md:w-96">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search students..."
                                className="pl-9 h-11"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="flex gap-2 w-full md:w-auto">
                            <select
                                className="flex h-11 w-full md:w-[180px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                value={selectedCourse}
                                onChange={(e) => setSelectedCourse(e.target.value)}
                            >
                                <option value="all">All Courses</option>
                                {courses.map(c => (
                                    <option key={c.id} value={c.id}>{c.course_name}</option>
                                ))}
                            </select>
                            <select
                                className="flex h-11 w-full md:w-[150px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                value={selectedYear}
                                onChange={(e) => setSelectedYear(e.target.value)}
                            >
                                <option value="all">All Years</option>
                                <option value="1">1st Year</option>
                                <option value="2">2nd Year</option>
                                <option value="3">3rd Year</option>
                                <option value="4">4th Year</option>
                            </select>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="flex justify-center py-20 border-t">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : (
                        <div className="border-t">
                            <Table>
                                <TableHeader className="bg-slate-50/50">
                                    <TableRow>
                                        <TableHead className="py-4">Student ID</TableHead>
                                        <TableHead>Full Name</TableHead>
                                        <TableHead>Course</TableHead>
                                        <TableHead>Section</TableHead>
                                        <TableHead>Year Level</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredStudents.length > 0 ? (
                                        filteredStudents.map((student) => (
                                            <TableRow key={student.id} className="hover:bg-slate-50/80 transition-colors">
                                                <TableCell className="font-mono font-medium">{student.student_number}</TableCell>
                                                <TableCell className="font-semibold">{student.first_name} {student.last_name}</TableCell>
                                                <TableCell>{getCourseName(student.course_id)}</TableCell>
                                                <TableCell>{getSectionName(student.section_id)}</TableCell>
                                                <TableCell>
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                        Year {student.year_level}
                                                    </span>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={5} className="py-20 text-center text-muted-foreground">
                                                <div className="flex flex-col items-center gap-2">
                                                    <Users className="h-10 w-10 opacity-20" />
                                                    <p>No students found matching your criteria.</p>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            <div className="mt-6 flex items-center gap-2 text-xs text-muted-foreground bg-amber-50 p-3 rounded-lg border border-amber-100 max-w-2xl">
                <ShieldAlert className="h-4 w-4 text-amber-500" />
                <p>You have <strong>Read-Only</strong> permissions for this list. For data modifications, please contact the Student Registrar.</p>
            </div>
        </DashboardShell>
    )
}
