"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { DashboardShell } from "@/components/dashboard-shell"
import { EventsTable } from "@/components/events-table"
import { EventForm } from "@/components/event-form"

interface Event {
    id?: string
    event_name: string
    event_date: string
    start_time: string
    end_time: string
    fine_amount: number
}

export default function EventsPage() {
    const [showForm, setShowForm] = useState(false)
    const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
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

    function handleEdit(event: Event) {
        setSelectedEvent(event)
        setShowForm(true)
    }

    function handleSave() {
        setShowForm(false)
        setSelectedEvent(null)
        setRefreshKey((prev) => prev + 1)
    }

    function handleCancel() {
        setShowForm(false)
        setSelectedEvent(null)
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
                <h1 className="text-3xl font-bold">Event Management</h1>
                <p className="text-muted-foreground">Schedule and manage academic events</p>
            </div>

            <div className="grid gap-6">
                {showForm && selectedEvent !== null && (
                    <EventForm event={selectedEvent} onSave={handleSave} onCancel={handleCancel} />
                )}
                <EventsTable key={refreshKey} onEdit={handleEdit} onDelete={() => setRefreshKey((prev) => prev + 1)} />
            </div>
        </DashboardShell>
    )
}
