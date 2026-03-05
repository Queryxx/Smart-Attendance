"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { DashboardShell } from "@/components/dashboard-shell"
import { SectionsTable } from "@/components/sections-table"
import { SectionForm } from "@/components/section-form"

interface Section {
    id?: string
    section_name: string
    course_id: string
}

interface Course {
    id: string
    course_name: string
}

export default function SectionsPage() {
    const [showForm, setShowForm] = useState(false)
    const [selectedSection, setSelectedSection] = useState<Section | null>(null)
    const [refreshKey, setRefreshKey] = useState(0)
    const [courses, setCourses] = useState<Course[]>([])
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

    useEffect(() => {
        fetchCourses()
    }, [])

    async function fetchCourses() {
        try {
            const response = await fetch("/api/courses")
            const data = await response.json()
            setCourses(data)
        } catch (error) {
            console.error("Error fetching courses:", error)
        }
    }

    function handleEdit(section: Section) {
        setSelectedSection(section)
        setShowForm(true)
    }

    function handleSave() {
        setShowForm(false)
        setSelectedSection(null)
        setRefreshKey((prev) => prev + 1)
    }

    function handleCancel() {
        setShowForm(false)
        setSelectedSection(null)
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
                <h1 className="text-3xl font-bold">Sections Management</h1>
                <p className="text-muted-foreground">Manage course sections</p>
            </div>

            <div className="grid gap-6">
                {showForm && selectedSection !== null && (
                    <SectionForm section={selectedSection} courses={courses} onSave={handleSave} onCancel={handleCancel} />
                )}
                <SectionsTable key={refreshKey} onEdit={handleEdit} onDelete={() => setRefreshKey((prev) => prev + 1)} />
            </div>
        </DashboardShell>
    )
}
