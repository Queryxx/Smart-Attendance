"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Edit2, Trash2, Plus, ScanFace, Download, Loader2, Upload, QrCode, FileArchive, FileSpreadsheet } from "lucide-react"
import ExcelJS from "exceljs"
import JSZip from "jszip"

import { batchStudentSchema } from "@/app/api/validators/batch-students"
import { AlertCircle, CheckCircle2, UserCheck, UserX, User } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { toast } from "sonner"

interface Student {
    id?: string
    student_number: string
    first_name: string
    last_name: string
    email?: string
    qr_code?: string | null
    year_level?: number
    course_id?: string
    section_id?: string
    face_encoding?: string | null
    photo?: string | null
}

export function StudentsTable({
    onEdit,
    onDelete,
}: { onEdit: (student: Student) => void; onDelete: (id: string) => void }) {
    const [students, setStudents] = useState<Student[]>([])
    const [courses, setCourses] = useState<any[]>([])
    const [sections, setSections] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [isExporting, setIsExporting] = useState(false)
    const [isExportingQR, setIsExportingQR] = useState(false)
    const [exportProgress, setExportProgress] = useState(0)
    const [isImporting, setIsImporting] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [previewData, setPreviewData] = useState<any[]>([])
    const [isPreviewOpen, setIsPreviewOpen] = useState(false)
    const [isImportMode, setIsImportMode] = useState(false)
    const [searchTerm, setSearchTerm] = useState("")
    const [selectedCourse, setSelectedCourse] = useState<string>("all")
    const [selectedYearLevel, setSelectedYearLevel] = useState<string>("all")
    const [selectedFaceStatus, setSelectedFaceStatus] = useState<string>("all")
    const [selectedPhoto, setSelectedPhoto] = useState<{ url: string; name: string } | null>(null)
    const [selectedQRCode, setSelectedQRCode] = useState<{ code: string; name: string } | null>(null)
    const [importResult, setImportResult] = useState<{
        title: string
        message: string
        type: "success" | "error"
    } | null>(null)
    const router = useRouter()

    useEffect(() => {
        fetchStudents()
        fetchCourses()
        fetchSections()
    }, [])

    async function fetchStudents() {
        try {
            const response = await fetch("/api/students")
            if (!response.ok) {
                const err = await response.json().catch(() => ({}))
                console.error("Failed to load students:", response.status, err)
                setStudents([])
                if (response.status === 403) router.push("/login")
                return
            }

            const data = await response.json()
            if (!Array.isArray(data)) {
                console.error("Unexpected students payload:", data)
                setStudents([])
                return
            }

            setStudents(data)
        } catch (error) {
            console.error("Error fetching students:", error)
        } finally {
            setLoading(false)
        }
    }

    async function fetchCourses() {
        try {
            const response = await fetch("/api/courses")
            if (response.ok) {
                const data = await response.json()
                setCourses(data)
            }
        } catch (error) {
            console.error("Error fetching courses:", error)
        }
    }

    async function fetchSections() {
        try {
            const response = await fetch("/api/sections")
            if (response.ok) {
                const data = await response.json()
                setSections(data)
            }
        } catch (error) {
            console.error("Error fetching sections:", error)
        }
    }

    const filteredStudents = students.filter((student) => {
        const matchesSearch =
            `${student.first_name} ${student.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
            student.student_number.toLowerCase().includes(searchTerm.toLowerCase())

        const matchesCourse = selectedCourse === "all" || String(student.course_id) === selectedCourse
        const matchesYear = selectedYearLevel === "all" || String(student.year_level) === selectedYearLevel
        const matchesFaceStatus =
            selectedFaceStatus === "all" ||
            (selectedFaceStatus === "registered" && !!student.face_encoding) ||
            (selectedFaceStatus === "not_registered" && !student.face_encoding)

        return matchesSearch && matchesCourse && matchesYear && matchesFaceStatus
    })

    function getCourseName(courseId?: string, full = false) {
        if (!courseId) return "N/A"
        const course = courses.find((c) => String(c.id) === String(courseId))
        if (!course) return "N/A"
        return full ? course.course_name : (course.course_code || course.course_name)
    }

    function getSectionName(sectionId?: string) {
        if (!sectionId) return "N/A"
        const section = sections.find((s) => String(s.id) === String(sectionId))
        return section ? section.section_name : "N/A"
    }

    const exportToExcel = async () => {
        if (filteredStudents.length === 0) return
        setIsExporting(true)

        try {
            const workbook = new ExcelJS.Workbook()
            const worksheet = workbook.addWorksheet("Students")

            // Define columns
            worksheet.columns = [
                { header: "First Name", key: "first_name", width: 20 },
                { header: "Last Name", key: "last_name", width: 20 },
                { header: "Email", key: "email", width: 30 },
                { header: "Student Number", key: "student_number", width: 15 },
                { header: "Course", key: "course", width: 45 },
                { header: "Year Level", key: "year_level", width: 12 },
                { header: "Section", key: "section", width: 15 },
                { header: "QR Code", key: "qr_code", width: 20 }
            ]

            // Style the header row
            const headerRow = worksheet.getRow(1)
            headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } }
            headerRow.fill = {
                type: "pattern",
                pattern: "solid",
                fgColor: { argb: "FF4F46E5" } // Purple color
            }
            headerRow.alignment = { vertical: "middle", horizontal: "center" }

            // Sort students by Course (alphabetical) then Year Level (1 to 4)
            const sortedStudents = [...filteredStudents].sort((a, b) => {
                const courseA = getCourseName(a.course_id, true)
                const courseB = getCourseName(b.course_id, true)

                // First sort by course name
                if (courseA < courseB) return -1
                if (courseA > courseB) return 1

                // If same course, sort by year level
                const yearA = parseInt(String(a.year_level || "999"))
                const yearB = parseInt(String(b.year_level || "999"))
                return yearA - yearB
            })

            // Add rows
            sortedStudents.forEach(student => {
                worksheet.addRow({
                    first_name: student.first_name,
                    last_name: student.last_name,
                    email: student.email || "N/A",
                    student_number: student.student_number,
                    course: getCourseName(student.course_id, true),
                    year_level: student.year_level || "N/A",
                    section: getSectionName(student.section_id),
                    qr_code: student.qr_code || "N/A"
                })
            })

            // Style data rows (optional: borders)
            worksheet.eachRow((row, rowNumber) => {
                if (rowNumber > 1) {
                    row.eachCell(cell => {
                        cell.border = {
                            top: { style: "thin", color: { argb: "FFEEEEEE" } },
                            left: { style: "thin", color: { argb: "FFEEEEEE" } },
                            bottom: { style: "thin", color: { argb: "FFEEEEEE" } },
                            right: { style: "thin", color: { argb: "FFEEEEEE" } }
                        }
                    })
                }
            })

            // Generate buffer and download
            const buffer = await workbook.xlsx.writeBuffer()
            const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })
            const url = URL.createObjectURL(blob)
            const link = document.createElement("a")
            link.href = url
            link.download = `UA_students_${new Date().toISOString().split("T")[0]}.xlsx`
            link.click()
            URL.revokeObjectURL(url)
        } catch (error) {
            console.error("Error exporting excel:", error)
        } finally {
            setIsExporting(false)
        }
    }

    const importFromExcel = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (!file) return

        setIsImporting(true)
        const reader = new FileReader()

        reader.onload = async (e) => {
            try {
                const buffer = e.target?.result as ArrayBuffer
                const workbook = new ExcelJS.Workbook()
                await workbook.xlsx.load(buffer)
                const worksheet = workbook.getWorksheet(1)

                if (!worksheet) {
                    alert("No worksheet found in the excel file.")
                    setIsImporting(false)
                    return
                }

                const data: any[] = []
                const headerRow = worksheet.getRow(1)

                // Helper to extract text from any cell value type
                const getCellText = (val: any): string => {
                    if (!val) return ""
                    if (typeof val === "string") return val
                    if (typeof val === "number") return String(val)
                    if (typeof val === "object") {
                        if ("result" in val) return getCellText(val.result)
                        if ("text" in val) return String(val.text)
                        if ("richText" in val && Array.isArray(val.richText)) {
                            return val.richText.map((rt: any) => rt.text || "").join("")
                        }
                    }
                    return String(val)
                }

                // Define canonical fields and their identifying keywords
                const fieldMapping = [
                    { canonical: "First Name", keywords: ["first name", "first", "fname"] },
                    { canonical: "Last Name", keywords: ["last name", "last", "lname"] },
                    { canonical: "Email", keywords: ["email", "e-mail", "mail"] },
                    { canonical: "Student Number", keywords: ["student number", "student #", "stud #", "id number", "student number #"] },
                    { canonical: "Course", keywords: ["course"] },
                    { canonical: "Year Level", keywords: ["year level", "year", "yr level", "yr"] },
                    { canonical: "Section", keywords: ["section", "sec"] },
                    { canonical: "QR Code", keywords: ["qr code", "qr", "qrcode"] },
                ]

                // Map excel column index to canonical field name using physical indices
                const columnIndexToField: Record<number, string> = {}
                const missingRequired: string[] = []
                const requiredFields = ["First Name", "Last Name", "Email", "Student Number", "Course"]

                fieldMapping.forEach(field => {
                    let foundIndex = -1
                    headerRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
                        const cellText = getCellText(cell.value).toLowerCase()
                        if (field.keywords.some(k => cellText.includes(k.toLowerCase()))) {
                            foundIndex = colNumber
                        }
                    })

                    if (foundIndex !== -1) {
                        columnIndexToField[foundIndex] = field.canonical
                    } else if (requiredFields.includes(field.canonical)) {
                        missingRequired.push(field.canonical)
                    }
                })

                if (missingRequired.length > 0) {
                    alert(`Could not find required columns: ${missingRequired.join(", ")}. Please check your headers.`)
                    setIsImporting(false)
                    return
                }

                worksheet.eachRow((row, rowNumber) => {
                    if (rowNumber === 1) return // Skip header row

                    const rowData: any = {}
                    // Initialize with nulls for all canonical fields
                    fieldMapping.forEach(f => rowData[f.canonical] = null)

                    Object.entries(columnIndexToField).forEach(([idx, field]) => {
                        const cell = row.getCell(parseInt(idx))
                        let val = cell.value

                        // Resolve exceljs complex values
                        if (val && typeof val === "object") {
                            if ("result" in val) val = val.result
                            else if ("text" in val) val = val.text
                            else if ("richText" in val && Array.isArray(val.richText)) {
                                val = val.richText.map((rt: any) => rt.text).join("")
                            }
                        }

                        // Sanitize
                        if (val !== undefined && val !== null && val !== "") {
                            let processedVal = val;
                            // Convert First Name and Last Name to Title Case
                            if (field === "First Name" || field === "Last Name") {
                                processedVal = String(val)
                                    .toLowerCase()
                                    .split(' ')
                                    .filter(word => word.length > 0)
                                    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                                    .join(' ');
                            }
                            rowData[field] = processedVal
                        }
                    })
                    data.push(rowData)
                })

                if (data.length === 0) {
                    alert("No data found in the excel file.")
                    setIsImporting(false)
                    return
                }

                const validatedData = data.map((row, index) => {
                    const result = batchStudentSchema.safeParse(row)
                    const rowErrors = result.success ? [] : result.error.errors.map(e => e.message)
                    const excelRow = index + 2 // Row 1 is header

                    // Check if course exists
                    const excelCourse = row["Course"]?.toString().trim()
                    const courseExists = courses.some(c =>
                        c.course_name.toLowerCase() === excelCourse?.toLowerCase() ||
                        c.course_code?.toLowerCase() === excelCourse?.toLowerCase()
                    )

                    if (excelCourse && !courseExists) {
                        rowErrors.push(`Course "${excelCourse}" not found`)
                    }

                    // Check if section exists
                    const excelSection = row["Section"]?.toString().trim()
                    const sectionExists = !excelSection || sections.some(s =>
                        s.section_name.toLowerCase() === excelSection?.toLowerCase()
                    )

                    if (excelSection && !sectionExists) {
                        rowErrors.push(`Section "${excelSection}" not found`)
                    }

                    // Check if student already exists
                    const excelStudentNum = row["Student Number"]?.toString().trim()
                    const studentExists = students.some(s => s.student_number === excelStudentNum)

                    if (excelStudentNum && studentExists) {
                        rowErrors.push(`Student Number "${excelStudentNum}" already exists`)
                    }

                    return {
                        ...row,
                        excelRow,
                        isValid: result.success && courseExists && sectionExists && !studentExists,
                        errors: rowErrors
                    }
                })

                setPreviewData(validatedData)
                setIsImportMode(true)
            } catch (error) {
                console.error("Error importing excel:", error)
                alert("Error parsing excel file. Please ensure it's a valid .xlsx file.")
            } finally {
                setIsImporting(false)
                // Reset file input
                event.target.value = ""
            }
        }

        reader.readAsArrayBuffer(file)
    }

    const saveImportedData = async () => {
        const validDataOnly = previewData.filter(d => d.isValid)
        if (validDataOnly.length === 0) {
            alert("No valid data to save.")
            return
        }

        setIsSaving(true)
        try {
            const response = await fetch("/api/batch/students", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(validDataOnly),
            })

            const result = await response.json()

            if (response.ok) {
                setImportResult({
                    title: "Import Completed",
                    message: `Success: ${result.summary.success}, Skipped: ${result.summary.skipped}`,
                    type: "success"
                })
                setIsImportMode(false)
                setPreviewData([])
                fetchStudents()
            } else {
                setImportResult({
                    title: "Import Failed",
                    message: `${result.message}${result.errors ? "\n" + result.errors.join("\n") : ""}`,
                    type: "error"
                })
            }
        } catch (error) {
            console.error("Error saving imported data:", error)
            setImportResult({
                title: "Error",
                message: "An unexpected error occurred while saving the data.",
                type: "error"
            })
        } finally {
            setIsSaving(false)
        }
    }

    const exportQRCodes = async () => {
        const studentsWithQR = filteredStudents.filter(s => s.qr_code);
        if (studentsWithQR.length === 0) {
            toast.error("No students with QR codes to export");
            return;
        }

        setIsExportingQR(true);
        setExportProgress(0);
        const zip = new JSZip();

        try {
            for (let i = 0; i < studentsWithQR.length; i++) {
                const student = studentsWithQR[i];
                const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=1000x1000&data=${process.env.NEXT_PUBLIC_APP_URL}/dashboard/qr/qr-test-detection?data=${student.qr_code}`;

                try {
                    const response = await fetch(qrUrl);
                    const blob = await response.blob();
                    const fileName = `${student.first_name}_${student.last_name}_${student.student_number}.png`.replace(/[/\\?%*:|"<>]/g, '-');
                    zip.file(fileName, blob);
                } catch (err) {
                    console.error(`Failed to fetch QR for ${student.first_name}`, err);
                }

                setExportProgress(Math.round(((i + 1) / studentsWithQR.length) * 100));
            }

            const content = await zip.generateAsync({ type: "blob" });
            const link = document.createElement("a");
            link.href = URL.createObjectURL(content);
            link.download = `Student_QR_Codes_${new Date().toISOString().split('T')[0]}.zip`;
            link.click();
            toast.success("QR Codes exported successfully");
        } catch (error) {
            console.error("Export error:", error);
            toast.error("Failed to generate ZIP file");
        } finally {
            setIsExportingQR(false);
            setExportProgress(0);
        }
    };

    const downloadTemplate = async () => {
        try {
            const templatePath = "/forms/students.xlsx"
            const response = await fetch(templatePath)
            if (!response.ok) throw new Error("Template file not found")
            const buffer = await response.arrayBuffer()

            const workbook = new ExcelJS.Workbook()
            await workbook.xlsx.load(buffer)

            // Populate Courses sheet
            const coursesSheet = workbook.getWorksheet("Courses")
            if (coursesSheet) {
                // Clear existing data from A2 onwards
                coursesSheet.eachRow((row, rowNumber) => {
                    if (rowNumber > 1) {
                        row.getCell(1).value = null
                    }
                })
                // Add current courses
                courses.forEach((course, index) => {
                    coursesSheet.getCell(`A${index + 2}`).value = course.course_name
                })
            }

            // Populate Section & Year sheet
            const sectionYearSheet = workbook.getWorksheet("Section & Year")
            if (sectionYearSheet) {
                // Clear existing data from A2 and B2 onwards
                sectionYearSheet.eachRow((row, rowNumber) => {
                    if (rowNumber > 1) {
                        row.getCell(1).value = null
                        row.getCell(2).value = null
                    }
                })

                // Add unique sections
                const uniqueSections = Array.from(new Set(sections.map(s => s.section_name)))
                uniqueSections.forEach((sectionName, index) => {
                    sectionYearSheet.getCell(`A${index + 2}`).value = sectionName
                })

                // Add years (1 to 4)
                const years = ["1", "2", "3", "4"]
                years.forEach((year, index) => {
                    sectionYearSheet.getCell(`B${index + 2}`).value = year
                })
            }

            // Extract filename from templatePath
            const fileName = templatePath.split("/").pop() || "template.xlsx"

            // Generate buffer and download
            const outBuffer = await workbook.xlsx.writeBuffer()
            const blob = new Blob([outBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })
            const url = URL.createObjectURL(blob)
            const link = document.createElement("a")
            link.href = url
            link.download = fileName
            link.click()
            URL.revokeObjectURL(url)
        } catch (error) {
            console.error("Error generating dynamic template:", error)
            setImportResult({
                title: "Template Download Error",
                message: "Error downloading template. Please try again.",
                type: "error"
            })
        }
    }

    async function handleDelete(id: string) {
        if (confirm("Are you sure you want to delete this student?")) {
            try {
                await fetch(`/api/students/${id}`, { method: "DELETE" })
                setStudents(students.filter((s) => s.id !== id))
            } catch (error) {
                console.error("Error deleting student:", error)
            }
        }
    }

    return (
        <>
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle>{isImportMode ? "Preview Imported Students" : "Students"}</CardTitle>
                            <CardDescription>
                                {isImportMode
                                    ? "Review and validate imported data before saving"
                                    : "Manage student records"}
                            </CardDescription>
                        </div>
                        <div className="flex gap-2">
                            {isImportMode ? (
                                <>
                                    <Button variant="outline" onClick={() => {
                                        setIsImportMode(false)
                                        setPreviewData([])
                                    }} disabled={isSaving}>
                                        Cancel
                                    </Button>
                                    <Button onClick={saveImportedData} disabled={isSaving || previewData.filter(d => d.isValid).length === 0} className="gap-2">
                                        {isSaving ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <Plus className="h-4 w-4" />
                                        )}
                                        {isSaving ? "Saving..." : `Save Valid (${previewData.filter(d => d.isValid).length})`}
                                    </Button>
                                </>
                            ) : (
                                <>
                                    <Button
                                        variant="outline"
                                        onClick={downloadTemplate}
                                        className="gap-2"
                                    >
                                        <Download className="h-4 w-4" />
                                        Template
                                    </Button>
                                    <div className="relative">
                                        <input
                                            type="file"
                                            id="import-excel"
                                            className="hidden"
                                            accept=".xlsx"
                                            onChange={importFromExcel}
                                            disabled={isImporting}
                                        />
                                        <Button
                                            variant="outline"
                                            onClick={() => document.getElementById("import-excel")?.click()}
                                            className="gap-2"
                                            disabled={isImporting}
                                        >
                                            {isImporting ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                                <Upload className="h-4 w-4" />
                                            )}
                                            {isImporting ? "Importing..." : "Import Excel"}
                                        </Button>
                                    </div>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button
                                                variant="outline"
                                                className="gap-2"
                                                disabled={filteredStudents.length === 0 || isExporting || isExportingQR}
                                            >
                                                {isExporting || isExportingQR ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    <Download className="h-4 w-4" />
                                                )}
                                                {isExporting ? "Exporting Excel..." : isExportingQR ? `Exporting QR (${exportProgress}%)...` : "Export"}
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={exportToExcel} className="gap-2 cursor-pointer">
                                                <FileSpreadsheet className="h-4 w-4" />
                                                Export Excel (.xlsx)
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={exportQRCodes} className="gap-2 cursor-pointer text-blue-600 focus:text-blue-700">
                                                <FileArchive className="h-4 w-4" />
                                                Export QR Codes (.zip)
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                    <Button onClick={() => onEdit({
                                        student_number: "",
                                        first_name: "",
                                        last_name: "",
                                        email: "",
                                        year_level: undefined,
                                        course_id: "",
                                        section_id: "",
                                    })} className="gap-2">
                                        <Plus className="h-4 w-4" />
                                        Add Student
                                    </Button>
                                </>
                            )}
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {!isImportMode && (
                        <div className="flex flex-col md:flex-row gap-4 mb-4">
                            <div className="flex-1">
                                <Input
                                    placeholder="Search by name or student number..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <div className="flex gap-2">
                                <select
                                    value={selectedCourse}
                                    onChange={(e) => setSelectedCourse(e.target.value)}
                                    className="bg-background border border-input rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring min-w-[150px]"
                                >
                                    <option value="all">All Courses</option>
                                    {courses.map((course) => (
                                        <option key={course.id} value={course.id}>
                                            {course.course_code || course.course_name}
                                        </option>
                                    ))}
                                </select>
                                <select
                                    value={selectedYearLevel}
                                    onChange={(e) => setSelectedYearLevel(e.target.value)}
                                    className="bg-background border border-input rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring min-w-[120px]"
                                >
                                    <option value="all">All Years</option>
                                    <option value="1">1st Year</option>
                                    <option value="2">2nd Year</option>
                                    <option value="3">3rd Year</option>
                                    <option value="4">4th Year</option>
                                </select>
                                <select
                                    value={selectedFaceStatus}
                                    onChange={(e) => setSelectedFaceStatus(e.target.value)}
                                    className="bg-background border border-input rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring min-w-[150px]"
                                >
                                    <option value="all">All Face Status</option>
                                    <option value="registered">Registered</option>
                                    <option value="not_registered">Not Registered</option>
                                </select>
                            </div>
                        </div>
                    )}

                    {loading && !isImportMode ? (
                        <div className="text-center py-8 text-muted-foreground">Loading...</div>
                    ) : isImportMode ? (
                        <div className="mb-6 space-y-4">
                            {previewData.some(d => !d.isValid) && (
                                <Alert variant="destructive">
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertTitle>Validation Errors Found</AlertTitle>
                                    <AlertDescription>
                                        <ul className="list-disc pl-4 mt-2 space-y-1">
                                            {previewData
                                                .filter(d => !d.isValid)
                                                .map((d, i) => (
                                                    <li key={i}>
                                                        Row {d.excelRow}: {d.errors.join(", ")}
                                                    </li>
                                                ))}
                                        </ul>
                                    </AlertDescription>
                                </Alert>
                            )}

                            <div className="overflow-x-auto border rounded-md">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-[80px]">Status</TableHead>
                                            <TableHead>First Name</TableHead>
                                            <TableHead>Last Name</TableHead>
                                            <TableHead>Email</TableHead>
                                            <TableHead>Student Number</TableHead>
                                            <TableHead>Course</TableHead>
                                            <TableHead>Year Level</TableHead>
                                            <TableHead>Section</TableHead>
                                            <TableHead>QR Code</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {previewData.map((student, index) => (
                                            <TableRow key={index} className={student.isValid ? "" : "bg-destructive/10"}>
                                                <TableCell>
                                                    {student.isValid ? (
                                                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                                                    ) : (
                                                        <AlertCircle className="h-4 w-4 text-destructive" />
                                                    )}
                                                </TableCell>
                                                <TableCell>{student["First Name"] || "N/A"}</TableCell>
                                                <TableCell>{student["Last Name"] || "N/A"}</TableCell>
                                                <TableCell>{student["Email"] || "N/A"}</TableCell>
                                                <TableCell>{student["Student Number"] || "N/A"}</TableCell>
                                                <TableCell>{student["Course"] || "N/A"}</TableCell>
                                                <TableCell>{student["Year Level"] || "N/A"}</TableCell>
                                                <TableCell>{student["Section"] || "N/A"}</TableCell>
                                                <TableCell>
                                                    {student["QR Code"] ? (
                                                        <img
                                                            src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${process.env.NEXT_PUBLIC_APP_URL}/dashboard/qr/qr-test-detection?data=${student["QR Code"]}`}
                                                            alt="QR"
                                                            className="h-8 w-8 border rounded"
                                                        />
                                                    ) : "N/A"}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    ) : filteredStudents.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">No students found</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[50px] whitespace-nowrap">Photo</TableHead>
                                        <TableHead className="whitespace-nowrap">First Name</TableHead>
                                        <TableHead className="whitespace-nowrap">Last Name</TableHead>
                                        <TableHead className="whitespace-nowrap">Email</TableHead>
                                        <TableHead className="whitespace-nowrap">Student Number</TableHead>
                                        <TableHead className="whitespace-nowrap">Course</TableHead>
                                        <TableHead className="whitespace-nowrap">Section</TableHead>
                                        <TableHead className="whitespace-nowrap">Year Level</TableHead>
                                        <TableHead className="whitespace-nowrap">QR Code</TableHead>
                                        <TableHead className="whitespace-nowrap">Face Status</TableHead>
                                        <TableHead className="text-right whitespace-nowrap">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredStudents.map((student) => (
                                        <TableRow key={student.id}>
                                            <TableCell>
                                                <Avatar
                                                    className="h-8 w-8 cursor-pointer hover:ring-2 hover:ring-primary transition-all"
                                                    onClick={() => student.photo && setSelectedPhoto({
                                                        url: student.photo,
                                                        name: `${student.first_name} ${student.last_name}`
                                                    })}
                                                >
                                                    <AvatarImage src={student.photo || ""} alt={`${student.first_name} ${student.last_name}`} />
                                                    <AvatarFallback>
                                                        <User className="h-4 w-4" />
                                                    </AvatarFallback>
                                                </Avatar>
                                            </TableCell>
                                            <TableCell className="font-medium whitespace-nowrap">{student.first_name}</TableCell>
                                            <TableCell className="whitespace-nowrap">{student.last_name}</TableCell>
                                            <TableCell className="whitespace-nowrap">{student.email || "N/A"}</TableCell>
                                            <TableCell className="whitespace-nowrap">{student.student_number}</TableCell>
                                            <TableCell className="whitespace-nowrap">{getCourseName(student.course_id)}</TableCell>
                                            <TableCell className="whitespace-nowrap">{getSectionName(student.section_id)}</TableCell>
                                            <TableCell className="whitespace-nowrap">{student.year_level}</TableCell>
                                            <TableCell className="whitespace-nowrap">
                                                {student.qr_code ? (
                                                    <div
                                                        className="cursor-pointer hover:opacity-80 transition-opacity"
                                                        onClick={() => setSelectedQRCode({ code: student.qr_code!, name: `${student.first_name} ${student.last_name}` })}
                                                    >
                                                        <img
                                                            src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${process.env.NEXT_PUBLIC_APP_URL}/dashboard/qr/qr-test-detection?data=${student.qr_code}`}
                                                            alt="QR"
                                                            className="h-8 w-8 border rounded shadow-sm bg-white"
                                                        />
                                                    </div>
                                                ) : (
                                                    "N/A"
                                                )}
                                            </TableCell>
                                            <TableCell className="whitespace-nowrap">
                                                {student.face_encoding ? (
                                                    <Badge variant="default" className="bg-green-500 hover:bg-green-600 gap-1 whitespace-nowrap">
                                                        <UserCheck className="h-3 w-3" />
                                                        Registered
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="destructive" className="gap-1 whitespace-nowrap">
                                                        <UserX className="h-3 w-3" />
                                                        Not Registered
                                                    </Badge>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right whitespace-nowrap">
                                                <Button variant="ghost" size="sm" onClick={() => onEdit(student)} className="gap-2">
                                                    <Edit2 className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => student.id && handleDelete(student.id)}
                                                    className="gap-2 text-destructive"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>

            </Card>

            <Dialog open={!!selectedPhoto} onOpenChange={(open) => !open && setSelectedPhoto(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>{selectedPhoto?.name}</DialogTitle>
                    </DialogHeader>
                    <div className="flex items-center justify-center p-4">
                        {selectedPhoto?.url && (
                            <div className="relative w-full aspect-square overflow-hidden rounded-lg border shadow-sm">
                                <img
                                    src={selectedPhoto.url}
                                    alt={selectedPhoto.name}
                                    className="w-full h-full object-cover"
                                />
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={!!importResult} onOpenChange={(open) => !open && setImportResult(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className={importResult?.type === "error" ? "text-destructive" : "text-green-600"}>
                            {importResult?.title}
                        </DialogTitle>
                        <DialogDescription className="whitespace-pre-wrap">
                            {importResult?.message}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button onClick={() => setImportResult(null)}>Close</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={!!selectedQRCode} onOpenChange={(open) => !open && setSelectedQRCode(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Student QR Code</DialogTitle>
                        <DialogDescription>
                            QR Code for {selectedQRCode?.name}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex flex-col items-center justify-center p-6 bg-white rounded-lg shadow-inner">
                        {selectedQRCode && (
                            <>
                                <img
                                    src={`https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${process.env.NEXT_PUBLIC_APP_URL}/dashboard/qr/qr-test-detection?data=${selectedQRCode.code}`}
                                    alt="QR Code"
                                    className="h-64 w-64 mb-4"
                                />
                                <p className="text-sm font-mono bg-slate-100 px-3 py-1 rounded border border-slate-200">
                                    {selectedQRCode.code}
                                </p>
                            </>
                        )}
                    </div>
                    <DialogFooter className="sm:justify-start">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => setSelectedQRCode(null)}
                        >
                            Close
                        </Button>
                        <Button
                            type="button"
                            className="gap-2"
                            onClick={() => {
                                if (selectedQRCode) {
                                    const link = document.createElement("a");
                                    link.href = `https://api.qrserver.com/v1/create-qr-code/?size=1000x1000&data=${process.env.NEXT_PUBLIC_APP_URL}/dashboard/qr/qr-test-detection?data=${selectedQRCode.code}`;
                                    link.download = `${selectedQRCode.name}_qrcode.png`;
                                    link.click();
                                }
                            }}
                        >
                            <Download className="h-4 w-4" />
                            Download
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}
