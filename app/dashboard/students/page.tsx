"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { DashboardShell } from "@/components/dashboard-shell"
import { StudentsTable } from "@/components/students-table"
import { StudentForm } from "@/components/student-form"
import { Button } from "@/components/ui/button"
import { ScanFace, QrCode } from "lucide-react"

interface Student {
    id?: string
    student_number: string
    first_name: string
    last_name: string
    year_level?: number
    course_id?: string
    section_id?: string
}

export default function StudentsPage() {
    const [showForm, setShowForm] = useState(false)
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
    const [refreshKey, setRefreshKey] = useState(0)
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
                if (['superadmin', 'student_registrar'].includes(data.role)) {
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

    function handleEdit(student: Student) {
        setSelectedStudent(student)
        setShowForm(true)
    }

    function handleSave() {
        setShowForm(false)
        setSelectedStudent(null)
        setRefreshKey((prev) => prev + 1)
    }

    function handleCancel() {
        setShowForm(false)
        setSelectedStudent(null)
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
            <div className="mb-8 flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-bold">Student Management</h1>
                    <p className="text-muted-foreground">Add, edit, and manage student records</p>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        onClick={() => router.push("/dashboard/qr/qr-test-detection")}
                        className="gap-2"
                    >
                        <QrCode className="h-4 w-4" />
                        QR Test
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => router.push("/dashboard/detection/test")}
                        className="gap-2"
                    >
                        <ScanFace className="h-4 w-4" />
                        Test Detection
                    </Button>
                </div>
            </div>

            <div className="grid gap-6">
                {showForm && selectedStudent !== null && (
                    <StudentForm student={selectedStudent} onSave={handleSave} onCancel={handleCancel} />
                )}
                <StudentsTable key={refreshKey} onEdit={handleEdit} onDelete={() => setRefreshKey((prev) => prev + 1)} />
            </div>
        </DashboardShell>
    )
}
