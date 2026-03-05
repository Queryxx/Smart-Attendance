"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Trash2, Plus, Download, Check, AlertCircle, Upload, Loader2, CheckCircle2 } from "lucide-react"
import ExcelJS from "exceljs"
import { batchFineSchema } from "@/app/api/validators/batch-fines"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { exportFineReceiptPDF, exportMultipleFinesPDF } from "@/lib/fine-pdf"
import { formatReadableDate } from "@/lib/utils"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { FileSpreadsheet, FileText, ChevronDown } from "lucide-react"

interface Fine {
    id: string
    student_id: number
    student_number: string
    student_name: string
    amount: number
    reason: string
    date: string
    status: "paid" | "unpaid"
    course?: string
}

export function FinesManager({ onRefresh, onAddFine }: { onRefresh: () => void; onAddFine?: () => void }) {
    const [fines, setFines] = useState<Fine[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState("")
    const [selectedFines, setSelectedFines] = useState<Set<string>>(new Set())
    const [statusFilter, setStatusFilter] = useState<string>("all")
    const [courseFilter, setCourseFilter] = useState<string>("all")
    const [confirmPaidOpen, setConfirmPaidOpen] = useState(false)
    const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
    const [processingId, setProcessingId] = useState<string | null>(null)
    const [isExporting, setIsExporting] = useState(false)
    const [isImporting, setIsImporting] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [previewData, setPreviewData] = useState<any[]>([])
    const [isImportMode, setIsImportMode] = useState(false)
    const [students, setStudents] = useState<any[]>([])
    const [courses, setCourses] = useState<any[]>([])
    const [importResult, setImportResult] = useState<{
        title: string
        message: string
        type: "success" | "error"
    } | null>(null)
    const [formData, setFormData] = useState({
        student_id: "",
        amount: "",
        reason: "",
        date: new Date().toISOString().split("T")[0],
    })
    const [viewingReason, setViewingReason] = useState<string | null>(null)

    useEffect(() => {
        fetchFines()
        fetchStudents()
        fetchCourses()
    }, [])

    async function fetchStudents() {
        try {
            const response = await fetch("/api/students")
            if (response.ok) {
                const data = await response.json()
                setStudents(data)
            }
        } catch (error) {
            console.error("Error fetching students:", error)
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

    async function fetchFines() {
        try {
            const response = await fetch("/api/fines")
            const data = await response.json()
            setFines(data)
        } catch (error) {
            console.error("Error fetching fines:", error)
        } finally {
            setLoading(false)
        }
    }

    function toggleSelectFine(id: string) {
        const newSelected = new Set(selectedFines)
        if (newSelected.has(id)) {
            newSelected.delete(id)
        } else {
            newSelected.add(id)
        }
        setSelectedFines(newSelected)
    }

    function toggleSelectAll() {
        if (selectedFines.size === filteredFines.length) {
            setSelectedFines(new Set())
        } else {
            setSelectedFines(new Set(filteredFines.map((f) => f.id)))
        }
    }

    async function handleDeleteFine(id: string) {
        setProcessingId(id)
        setConfirmDeleteOpen(true)
    }

    async function executeDelete() {
        if (!processingId) return
        try {
            const response = await fetch(`/api/fines/${processingId}`, { method: "DELETE" })
            if (response.ok) {
                fetchFines()
                onRefresh()
            }
        } catch (error) {
            console.error("Error deleting fine:", error)
        } finally {
            setConfirmDeleteOpen(false)
            setProcessingId(null)
        }
    }

    async function handleMarkPaid(id: string) {
        setProcessingId(id)
        setConfirmPaidOpen(true)
    }

    async function executeMarkPaid() {
        if (!processingId) return
        try {
            const response = await fetch(`/api/fines/${processingId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: "paid" }),
            })
            if (response.ok) {
                fetchFines()
                onRefresh()
            }
        } catch (error) {
            console.error("Error updating fine:", error)
        } finally {
            setConfirmPaidOpen(false)
            setProcessingId(null)
        }
    }

    function handleExportSelected() {
        const selectedList = filteredFines.filter((f) => selectedFines.has(f.id))
        if (selectedList.length === 1) {
            exportFineReceiptPDF(selectedList[0])
        } else if (selectedList.length > 1) {
            exportMultipleFinesPDF(selectedList)
        }
    }

    const exportSelectedToExcel = async () => {
        const selectedList = filteredFines.filter((f) => selectedFines.has(f.id))
        if (selectedList.length === 0) return

        try {
            const workbook = new ExcelJS.Workbook()
            const worksheet = workbook.addWorksheet("Selected Fines")

            // Add headers
            worksheet.columns = [
                { header: "STUDENT #", key: "student_number", width: 15 },
                { header: "STUDENT NAME", key: "student_name", width: 25 },
                { header: "COURSE", key: "course", width: 20 },
                { header: "FINE AMOUNT", key: "amount", width: 15 },
                { header: "REASON", key: "reason", width: 30 },
                { header: "DATE", key: "date", width: 20 },
                { header: "STATUS", key: "status", width: 12 },
            ]

            // Add data
            selectedList.forEach((fine) => {
                worksheet.addRow({
                    student_number: fine.student_number,
                    student_name: fine.student_name,
                    course: fine.course || "N/A",
                    amount: Number(fine.amount).toFixed(2),
                    reason: fine.reason,
                    date: formatReadableDate(fine.date),
                    status: fine.status.toUpperCase(),
                })
            })

            // Style headers
            worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }
            worksheet.getRow(1).fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF334155' } // slate-700
            }

            // Generate and download
            const buffer = await workbook.xlsx.writeBuffer()
            const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })
            const url = URL.createObjectURL(blob)
            const link = document.createElement("a")
            link.href = url
            link.download = `fines_export_${new Date().toISOString().split("T")[0]}.xlsx`
            link.click()
            URL.revokeObjectURL(url)
        } catch (error) {
            console.error("Error exporting to excel:", error)
            alert("Failed to export to Excel.")
        }
    }

    const filteredFines = fines.filter((fine) => {
        const matchesSearch =
            fine.student_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            fine.student_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            fine.reason?.toLowerCase().includes(searchTerm.toLowerCase())

        const matchesStatus = statusFilter === "all" || fine.status === statusFilter
        const matchesCourse = courseFilter === "all" || fine.course === courseFilter

        return matchesSearch && matchesStatus && matchesCourse
    })

    const downloadTemplate = async () => {
        try {
            const templatePath = "/forms/fines.xlsx"
            const response = await fetch(templatePath)
            if (!response.ok) throw new Error("Template file not found")
            const buffer = await response.arrayBuffer()

            const workbook = new ExcelJS.Workbook()
            await workbook.xlsx.load(buffer)

            // Populate Students sheet as reference
            const studentsSheet = workbook.getWorksheet("Students") || workbook.getWorksheet("students")
            if (studentsSheet) {
                // Clear existing data from A3 row onwards
                studentsSheet.eachRow((row, rowNumber) => {
                    if (rowNumber >= 3) {
                        row.getCell(1).value = null
                        row.getCell(2).value = null
                        row.getCell(3).value = null
                    }
                })

                // Sort students by course then name
                const sortedStudents = [...students].sort((a, b) => {
                    const courseA = courses.find(c => String(c.id) === String(a.course_id))?.course_name || ""
                    const courseB = courses.find(c => String(c.id) === String(b.course_id))?.course_name || ""

                    if (courseA < courseB) return -1
                    if (courseA > courseB) return 1

                    const nameA = `${a.first_name} ${a.last_name}`
                    const nameB = `${b.first_name} ${b.last_name}`
                    return nameA.localeCompare(nameB)
                })

                // Add current students
                sortedStudents.forEach((student, index) => {
                    const rowNum = index + 3
                    const courseName = courses.find(c => String(c.id) === String(student.course_id))?.course_name || "N/A"
                    studentsSheet.getCell(`A${rowNum}`).value = student.student_number
                    studentsSheet.getCell(`B${rowNum}`).value = `${student.first_name} ${student.last_name}`
                    studentsSheet.getCell(`C${rowNum}`).value = courseName
                })
            }

            // Extract filename from templatePath
            const fileName = templatePath.split("/").pop() || "fines.xlsx"

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

                // Define canonical fields and their identifying keywords
                const fieldMapping = [
                    { canonical: "Student Number", keywords: ["student #", "student number", "stud #", "id number"] },
                    { canonical: "Student Name", keywords: ["student name", "name"] },
                    { canonical: "Fine Amount", keywords: ["fine amount", "amount", "fine"] },
                    { canonical: "Reason", keywords: ["reason"] },
                    { canonical: "Event", keywords: ["event"] },
                    { canonical: "Date", keywords: ["date"] },
                ]

                const columnIndexToField: Record<number, string> = {}
                const missingRequired: string[] = []
                const requiredFields = ["Student Number", "Fine Amount", "Reason"]

                headerRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
                    const cellValue = cell.value?.toString().toLowerCase() || ""
                    fieldMapping.forEach(field => {
                        if (field.keywords.some(k => cellValue.includes(k))) {
                            columnIndexToField[colNumber] = field.canonical
                        }
                    })
                })

                requiredFields.forEach(f => {
                    if (!Object.values(columnIndexToField).includes(f)) {
                        missingRequired.push(f)
                    }
                })

                if (missingRequired.length > 0) {
                    alert(`Could not find required columns: ${missingRequired.join(", ")}. Please check your headers.`)
                    setIsImporting(false)
                    return
                }

                worksheet.eachRow((row, rowNumber) => {
                    if (rowNumber === 1) return // Skip header
                    const rowData: any = {}
                    fieldMapping.forEach(f => rowData[f.canonical] = null)

                    Object.entries(columnIndexToField).forEach(([idx, field]) => {
                        let val = row.getCell(parseInt(idx)).value
                        if (val && typeof val === 'object' && 'result' in (val as any)) val = (val as any).result
                        rowData[field] = val
                    })
                    data.push(rowData)
                })

                const validatedData = data.map((row, index) => {
                    const result = batchFineSchema.safeParse(row)
                    const rowErrors = result.success ? [] : result.error.errors.map(e => e.message)

                    // Check student
                    const studentExists = students.find(s => String(s.student_number) === String(row["Student Number"]))
                    if (!studentExists) {
                        rowErrors.push(`Student not found: ${row["Student Number"]}`)
                    }

                    return {
                        ...row,
                        excelRow: index + 2,
                        isValid: result.success && !!studentExists,
                        errors: rowErrors
                    }
                })

                setPreviewData(validatedData)
                setIsImportMode(true)
            } catch (error) {
                console.error("Error importing excel:", error)
                alert("Error parsing excel file.")
            } finally {
                setIsImporting(false)
                event.target.value = ""
            }
        }
        reader.readAsArrayBuffer(file)
    }

    const saveImportedData = async () => {
        const validDataOnly = previewData
            .filter(d => d.isValid)
            .map(d => ({
                "Student Number": d["Student Number"],
                "Student Name": d["Student Name"],
                "Fine Amount": d["Fine Amount"],
                "Reason": d["Reason"],
                "Event": d["Event"],
                "Date": d["Date"]
            }))

        if (validDataOnly.length === 0) return

        setIsSaving(true)
        try {
            const response = await fetch("/api/batch/fines", {
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
                fetchFines()
                onRefresh()
            } else {
                alert(result.message)
            }
        } catch (error) {
            console.error("Error saving data:", error)
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <>
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle>{isImportMode ? "Preview Imported Fines" : "Manage Fines"}</CardTitle>
                            <CardDescription>
                                {isImportMode
                                    ? "Review and validate batch fines before saving"
                                    : "Add and track student fines"}
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
                                        {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                                        {isSaving ? "Saving..." : `Save Valid (${previewData.filter(d => d.isValid).length})`}
                                    </Button>
                                </>
                            ) : (
                                <>
                                    <Button variant="outline" onClick={downloadTemplate} className="gap-2">
                                        <Download className="h-4 w-4" />
                                        Template
                                    </Button>
                                    <div className="relative">
                                        <input
                                            type="file"
                                            id="import-fines-excel"
                                            className="hidden"
                                            accept=".xlsx"
                                            onChange={importFromExcel}
                                            disabled={isImporting}
                                        />
                                        <Button
                                            variant="outline"
                                            onClick={() => document.getElementById("import-fines-excel")?.click()}
                                            className="gap-2"
                                            disabled={isImporting}
                                        >
                                            {isImporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                                            {isImporting ? "Importing..." : "Import Excel"}
                                        </Button>
                                    </div>
                                    <Button onClick={onAddFine} className="gap-2">
                                        <Plus className="h-4 w-4" />
                                        Add Fine
                                    </Button>
                                </>
                            )}
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    {!isImportMode && (
                        <div className="flex flex-col md:flex-row gap-4 items-end">
                            <div className="w-full md:w-80">
                                <Label htmlFor="search">Search</Label>
                                <Input
                                    id="search"
                                    placeholder="Search by student number, name, or reason..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <div className="w-full md:w-40">
                                <Label>Status</Label>
                                <Select value={statusFilter} onValueChange={setStatusFilter}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="All Status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Status</SelectItem>
                                        <SelectItem value="paid">Paid</SelectItem>
                                        <SelectItem value="unpaid">Unpaid</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="w-full md:flex-1 md:min-w-[200px]">
                                <Label>Course</Label>
                                <Select value={courseFilter} onValueChange={setCourseFilter}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="All Courses" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Courses</SelectItem>
                                        {Array.from(new Set(fines.map(f => f.course).filter(Boolean))).sort().map(course => (
                                            <SelectItem key={course} value={course!}>{course}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            {selectedFines.size > 0 && (
                                <div className="flex-shrink-0">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="outline" className="gap-2">
                                                <Download className="h-4 w-4" />
                                                Export ({selectedFines.size})
                                                <ChevronDown className="h-3 w-3 opacity-50" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={handleExportSelected} className="gap-2 cursor-pointer">
                                                <FileText className="h-4 w-4 text-red-500" />
                                                Export as PDF
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={exportSelectedToExcel} className="gap-2 cursor-pointer">
                                                <FileSpreadsheet className="h-4 w-4 text-green-600" />
                                                Export as Excel
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            )}
                        </div>
                    )}

                    {isImportMode && (
                        <div className="space-y-4">
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
                            <div className="overflow-x-auto border rounded-lg">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-muted/50">
                                            <TableHead className="w-12">Status</TableHead>
                                            <TableHead>Student #</TableHead>
                                            <TableHead>Student Name</TableHead>
                                            <TableHead>Reason</TableHead>
                                            <TableHead>Amount</TableHead>
                                            <TableHead>Event</TableHead>
                                            <TableHead>Date</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {previewData.map((fine, index) => (
                                            <TableRow key={index} className={fine.isValid ? "" : "bg-destructive/10"}>
                                                <TableCell>
                                                    {fine.isValid ? (
                                                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                                                    ) : (
                                                        <AlertCircle className="h-4 w-4 text-destructive" />
                                                    )}
                                                </TableCell>
                                                <TableCell>{fine["Student Number"] || "N/A"}</TableCell>
                                                <TableCell>{fine["Student Name"] || "N/A"}</TableCell>
                                                <TableCell
                                                    title="Click to view full reason"
                                                    className="cursor-pointer hover:bg-muted/30 transition-colors"
                                                    onClick={() => setViewingReason(fine["Reason"])}
                                                >
                                                    <div className="max-w-[150px] truncate">{fine["Reason"] || "N/A"}</div>
                                                </TableCell>
                                                <TableCell className="font-semibold">₱{Number(fine["Fine Amount"] || 0).toFixed(2)}</TableCell>
                                                <TableCell title={fine["Event"]}>
                                                    <div className="max-w-[120px] truncate">{fine["Event"] || "N/A"}</div>
                                                </TableCell>
                                                <TableCell>{fine["Date"] ? formatReadableDate(fine["Date"]) : "N/A"}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    )}

                    {!isImportMode && (
                        loading ? (
                            <div className="text-center py-8 text-muted-foreground">Loading fines...</div>
                        ) : filteredFines.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">No fines found</div>
                        ) : (
                            <div className="overflow-x-auto border rounded-lg">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-muted/50">
                                            <TableHead className="w-12">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedFines.size === filteredFines.length && filteredFines.length > 0}
                                                    onChange={toggleSelectAll}
                                                    className="rounded"
                                                />
                                            </TableHead>
                                            <TableHead>Student #</TableHead>
                                            <TableHead>Student Name</TableHead>
                                            <TableHead>Course</TableHead>
                                            <TableHead>Reason</TableHead>
                                            <TableHead>Amount</TableHead>
                                            <TableHead>Date</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredFines.map((fine) => (
                                            <TableRow key={fine.id}>
                                                <TableCell>
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedFines.has(fine.id)}
                                                        onChange={() => toggleSelectFine(fine.id)}
                                                        className="rounded"
                                                    />
                                                </TableCell>
                                                <TableCell className="font-medium">{fine.student_number}</TableCell>
                                                <TableCell>{fine.student_name}</TableCell>
                                                <TableCell>{fine.course || "N/A"}</TableCell>
                                                <TableCell
                                                    title="Click to view full reason"
                                                    className="cursor-pointer hover:bg-muted/30 transition-colors"
                                                    onClick={() => setViewingReason(fine.reason)}
                                                >
                                                    <div className="max-w-[150px] truncate">
                                                        {fine.reason?.includes(" - ") ? (
                                                            <>
                                                                {fine.reason.split(" - ")[0]} - <span className="font-bold">{fine.reason.split(" - ")[1]}</span>
                                                            </>
                                                        ) : (
                                                            fine.reason
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="font-semibold">₱{Number(fine.amount).toFixed(2)}</TableCell>
                                                <TableCell className="whitespace-nowrap">{formatReadableDate(fine.date)}</TableCell>
                                                <TableCell>
                                                    <span
                                                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${fine.status === "paid"
                                                            ? "bg-green-100 text-green-700"
                                                            : "bg-orange-100 text-orange-700"
                                                            }`}
                                                    >
                                                        {fine.status === "paid" ? (
                                                            <>
                                                                <Check className="h-3 w-3" />
                                                                Paid
                                                            </>
                                                        ) : (
                                                            "Unpaid"
                                                        )}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex gap-2 justify-end">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => exportFineReceiptPDF(fine)}
                                                            title="Download receipt"
                                                            className="gap-1"
                                                        >
                                                            <Download className="h-4 w-4" />
                                                        </Button>
                                                        {fine.status === "unpaid" && (
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => handleMarkPaid(fine.id)}
                                                                title="Mark as paid"
                                                                className="text-green-600 hover:text-green-700"
                                                            >
                                                                <Check className="h-4 w-4" />
                                                            </Button>
                                                        )}
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handleDeleteFine(fine.id)}
                                                            title="Delete fine"
                                                            className="text-destructive hover:text-destructive"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )
                    )}
                </CardContent>
            </Card>

            {/* Results Dialog */}
            <Dialog open={!!importResult} onOpenChange={(open) => !open && setImportResult(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{importResult?.title}</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                            {importResult?.message}
                        </p>
                    </div>
                    <DialogFooter>
                        <Button onClick={() => setImportResult(null)}>Close</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Payment Confirmation Dialog */}
            <AlertDialog open={confirmPaidOpen} onOpenChange={setConfirmPaidOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                            <Check className="h-5 w-5 text-green-600" />
                            Confirm Payment
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure that this fine has been paid? This action will mark the status as "Paid".
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setProcessingId(null)}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={executeMarkPaid} className="bg-green-600 hover:bg-green-700">
                            Confirm Paid
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                            <AlertCircle className="h-5 w-5 text-destructive" />
                            Delete Fine
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete this fine record? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setProcessingId(null)}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={executeDelete} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            {/* View Full Reason Dialog */}
            <Dialog open={!!viewingReason} onOpenChange={(open) => !open && setViewingReason(null)}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <FileText className="h-5 w-5 text-primary" />
                            Fine Reason Details
                        </DialogTitle>
                        <DialogDescription>
                            Below is the full detailed reason for this fine.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-6 px-4 bg-muted/30 rounded-lg border my-4">
                        <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                            {viewingReason}
                        </p>
                    </div>
                    <DialogFooter>
                        <Button onClick={() => setViewingReason(null)}>Close</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}
