"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"

interface Event {
    id?: string
    event_name: string
    event_date: string
    start_time: string
    end_time: string
    fine_amount: number
    course_ids?: string[]
    am_in_start_time?: string
    am_in_end_time?: string
    am_out_start_time?: string
    am_out_end_time?: string
    pm_in_start_time?: string
    pm_in_end_time?: string
    pm_out_start_time?: string
    pm_out_end_time?: string
    session_type?: "AM" | "PM" | "Both"
}

interface Course {
    id?: string
    course_name: string
}

const DEFAULT_SESSION_TIMES = {
    am_in_start_time: "07:30",
    am_in_end_time: "09:00",
    am_out_start_time: "11:00",
    am_out_end_time: "12:00",
    pm_in_start_time: "13:00",
    pm_in_end_time: "14:00",
    pm_out_start_time: "16:00",
    pm_out_end_time: "17:00",
}

export function EventForm({ event, onSave, onCancel }: { event?: Event; onSave: () => void; onCancel: () => void }) {
    const formatDateForInput = (dateStr?: string) => {
        if (!dateStr) return ""
        try {
            // If it's already in YYYY-MM-DD format, return it
            if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr
            // Otherwise, parse and format
            const date = new Date(dateStr)
            return date.toISOString().split("T")[0]
        } catch (e) {
            return ""
        }
    }

    const [formData, setFormData] = useState<Event>(() => {
        if (event && Object.keys(event).length > 0) {
            return {
                ...DEFAULT_SESSION_TIMES,
                ...event,
                event_date: formatDateForInput(event.event_date),
                course_ids: (event.course_ids || []).map(id => String(id))
            }
        }
        return {
            event_name: "",
            event_date: new Date().toISOString().split("T")[0],
            start_time: "08:00",
            end_time: "22:00",
            fine_amount: 100,
            course_ids: [],
            ...DEFAULT_SESSION_TIMES,
            session_type: "Both",
        }
    })
    const [courses, setCourses] = useState<Course[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")

    useEffect(() => {
        fetchCourses()
    }, [])

    useEffect(() => {
        if (event && Object.keys(event).length > 0) {
            setFormData({
                ...DEFAULT_SESSION_TIMES,
                ...event,
                event_date: formatDateForInput(event.event_date),
                course_ids: (event.course_ids || []).map(id => String(id))
            })
        } else if (event) {
            // Handle empty object {} case
            setFormData((prev) => ({ ...prev, ...DEFAULT_SESSION_TIMES, course_ids: [] }))
        }
    }, [event])

    async function fetchCourses() {
        try {
            const response = await fetch("/api/courses")
            const data = await response.json()
            setCourses(data)
        } catch (error) {
            console.error("Error fetching courses:", error)
        }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setError("")

        // Validate required fields
        if (!formData.event_name.trim()) {
            setError("Event name is required")
            return
        }
        if (!formData.event_date) {
            setError("Event date is required")
            return
        }
        if (!formData.start_time) {
            setError("Start time is required")
            return
        }
        if (!formData.end_time) {
            setError("End time is required")
            return
        }
        if (formData.fine_amount < 0) {
            setError("Fine amount cannot be negative")
            return
        }

        if (!formData.course_ids || formData.course_ids.length === 0) {
            setError("At least one course must be selected")
            return
        }

        setLoading(true)

        try {
            const method = formData.id ? "PUT" : "POST"
            const url = formData.id ? `/api/events/${formData.id}` : "/api/events"

            const response = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    event_name: formData.event_name.trim(),
                    event_date: formData.event_date,
                    start_time: formData.start_time,
                    end_time: formData.end_time,
                    fine_amount: parseFloat(formData.fine_amount.toString()),
                    course_ids: formData.course_ids.map(id => parseInt(id, 10)),
                    am_in_start_time: formData.session_type !== "PM" ? (formData.am_in_start_time || null) : null,
                    am_in_end_time: formData.session_type !== "PM" ? (formData.am_in_end_time || null) : null,
                    am_out_start_time: formData.session_type !== "PM" ? (formData.am_out_start_time || null) : null,
                    am_out_end_time: formData.session_type !== "PM" ? (formData.am_out_end_time || null) : null,
                    pm_in_start_time: formData.session_type !== "AM" ? (formData.pm_in_start_time || null) : null,
                    pm_in_end_time: formData.session_type !== "AM" ? (formData.pm_in_end_time || null) : null,
                    pm_out_start_time: formData.session_type !== "AM" ? (formData.pm_out_start_time || null) : null,
                    pm_out_end_time: formData.session_type !== "AM" ? (formData.pm_out_end_time || null) : null,
                }),
            })

            if (!response.ok) {
                const data = await response.json()
                setError(data.message || "Operation failed")
                return
            }

            onSave()
        } catch (err) {
            setError("An error occurred")
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    const handleCourseToggle = (courseId: string) => {
        const currentIds = formData.course_ids || []
        if (currentIds.includes(courseId)) {
            setFormData({ ...formData, course_ids: currentIds.filter(id => id !== courseId) })
        } else {
            setFormData({ ...formData, course_ids: [...currentIds, courseId] })
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>{formData.id ? "Edit Event" : "Add New Event"}</CardTitle>
                <CardDescription>Enter event information</CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && <div className="p-3 bg-red-100 text-red-700 rounded-md text-sm">{error}</div>}

                    <div>
                        <Label htmlFor="event_name">Event Name *</Label>
                        <Input
                            id="event_name"
                            value={formData.event_name}
                            onChange={(e) => setFormData({ ...formData, event_name: e.target.value })}
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="event_date">Event Date *</Label>
                            <Input
                                id="event_date"
                                type="date"
                                value={formData.event_date}
                                onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
                                required
                            />
                        </div>

                        <div>
                            <Label htmlFor="start_time">Start Time *</Label>
                            <Input
                                id="start_time"
                                type="time"
                                value={formData.start_time}
                                onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                                required
                            />
                        </div>

                        <div>
                            <Label htmlFor="end_time">End Time *</Label>
                            <Input
                                id="end_time"
                                type="time"
                                value={formData.end_time}
                                onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                                required
                            />
                        </div>

                        <div>
                            <Label htmlFor="fine_amount">Fine Amount *</Label>
                            <Input
                                id="fine_amount"
                                type="number"
                                step="0.01"
                                min="0"
                                value={formData.fine_amount}
                                onChange={(e) => setFormData({ ...formData, fine_amount: parseFloat(e.target.value) || 0 })}
                                required
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                        <div>
                            <Label htmlFor="session_type">Session Type *</Label>
                            <select
                                id="session_type"
                                value={formData.session_type || "Both"}
                                onChange={(e) => setFormData({ ...formData, session_type: e.target.value as any })}
                                className="w-full border border-input rounded-md px-3 py-2 text-sm bg-background"
                            >
                                <option value="Both">Both (AM & PM)</option>
                                <option value="AM">AM Only</option>
                                <option value="PM">PM Only</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <Label className="mb-2 block">Courses *</Label>
                        <div className="grid grid-cols-2 gap-2 p-3 border rounded-md max-h-40 overflow-y-auto">
                            {courses.map((course) => (
                                <div key={course.id} className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id={`course-${course.id}`}
                                        checked={formData.course_ids?.includes(String(course.id)) || false}
                                        onChange={() => handleCourseToggle(String(course.id))}
                                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-600"
                                    />
                                    <Label htmlFor={`course-${course.id}`} className="font-normal cursor-pointer">
                                        {course.course_name}
                                    </Label>
                                </div>
                            ))}
                        </div>
                        <p className="text-xs text-slate-500 mt-1">Select the courses that should participate in this event.</p>
                    </div>

                    {/* AM Session */}
                    {(formData.session_type === "AM" || formData.session_type === "Both") && (
                        <div className="border-t pt-6 mt-6">
                            <h3 className="text-lg font-semibold mb-4 text-blue-600">AM Session</h3>

                            {/* AM Check In */}
                            <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                                <div className="flex justify-between items-center mb-3">
                                    <h4 className="font-medium text-blue-700">Check In (AM)</h4>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            id="am_in_na"
                                            checked={!formData.am_in_start_time}
                                            onChange={(e) => setFormData({
                                                ...formData,
                                                am_in_start_time: e.target.checked ? "" : DEFAULT_SESSION_TIMES.am_in_start_time,
                                                am_in_end_time: e.target.checked ? "" : DEFAULT_SESSION_TIMES.am_in_end_time
                                            })}
                                            className="h-4 w-4 rounded border-gray-300"
                                        />
                                        <Label htmlFor="am_in_na" className="text-xs font-semibold cursor-pointer text-blue-700 uppercase">N/A - No Fines</Label>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label htmlFor="am_in_start">Start Time</Label>
                                        <Input
                                            id="am_in_start"
                                            type="time"
                                            disabled={!formData.am_in_start_time}
                                            value={formData.am_in_start_time || ""}
                                            onChange={(e) => setFormData({ ...formData, am_in_start_time: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="am_in_end">End Time</Label>
                                        <Input
                                            id="am_in_end"
                                            type="time"
                                            disabled={!formData.am_in_start_time}
                                            value={formData.am_in_end_time || ""}
                                            onChange={(e) => setFormData({ ...formData, am_in_end_time: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* AM Check Out */}
                            <div className="mb-6 p-4 bg-green-50 rounded-lg">
                                <div className="flex justify-between items-center mb-3">
                                    <h4 className="font-medium text-green-700">Check Out (AM)</h4>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            id="am_out_na"
                                            checked={!formData.am_out_start_time}
                                            onChange={(e) => setFormData({
                                                ...formData,
                                                am_out_start_time: e.target.checked ? "" : DEFAULT_SESSION_TIMES.am_out_start_time,
                                                am_out_end_time: e.target.checked ? "" : DEFAULT_SESSION_TIMES.am_out_end_time
                                            })}
                                            className="h-4 w-4 rounded border-gray-300"
                                        />
                                        <Label htmlFor="am_out_na" className="text-xs font-semibold cursor-pointer text-green-700 uppercase">N/A - No Fines</Label>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label htmlFor="am_out_start">Start Time</Label>
                                        <Input
                                            id="am_out_start"
                                            type="time"
                                            disabled={!formData.am_out_start_time}
                                            value={formData.am_out_start_time || ""}
                                            onChange={(e) => setFormData({ ...formData, am_out_start_time: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="am_out_end">End Time</Label>
                                        <Input
                                            id="am_out_end"
                                            type="time"
                                            disabled={!formData.am_out_start_time}
                                            value={formData.am_out_end_time || ""}
                                            onChange={(e) => setFormData({ ...formData, am_out_end_time: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* PM Session */}
                    {(formData.session_type === "PM" || formData.session_type === "Both") && (
                        <div className="border-t pt-6">
                            <h3 className="text-lg font-semibold mb-4 text-orange-600">PM Session</h3>

                            {/* PM Check In */}
                            <div className="mb-6 p-4 bg-orange-50 rounded-lg">
                                <div className="flex justify-between items-center mb-3">
                                    <h4 className="font-medium text-orange-700">Check In (PM)</h4>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            id="pm_in_na"
                                            checked={!formData.pm_in_start_time}
                                            onChange={(e) => setFormData({
                                                ...formData,
                                                pm_in_start_time: e.target.checked ? "" : DEFAULT_SESSION_TIMES.pm_in_start_time,
                                                pm_in_end_time: e.target.checked ? "" : DEFAULT_SESSION_TIMES.pm_in_end_time
                                            })}
                                            className="h-4 w-4 rounded border-gray-300"
                                        />
                                        <Label htmlFor="pm_in_na" className="text-xs font-semibold cursor-pointer text-orange-700 uppercase">N/A - No Fines</Label>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label htmlFor="pm_in_start">Start Time</Label>
                                        <Input
                                            id="pm_in_start"
                                            type="time"
                                            disabled={!formData.pm_in_start_time}
                                            value={formData.pm_in_start_time || ""}
                                            onChange={(e) => setFormData({ ...formData, pm_in_start_time: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="pm_in_end">End Time</Label>
                                        <Input
                                            id="pm_in_end"
                                            type="time"
                                            disabled={!formData.pm_in_start_time}
                                            value={formData.pm_in_end_time || ""}
                                            onChange={(e) => setFormData({ ...formData, pm_in_end_time: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* PM Check Out */}
                            <div className="mb-6 p-4 bg-red-50 rounded-lg">
                                <div className="flex justify-between items-center mb-3">
                                    <h4 className="font-medium text-red-700">Check Out (PM)</h4>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            id="pm_out_na"
                                            checked={!formData.pm_out_start_time}
                                            onChange={(e) => setFormData({
                                                ...formData,
                                                pm_out_start_time: e.target.checked ? "" : DEFAULT_SESSION_TIMES.pm_out_start_time,
                                                pm_out_end_time: e.target.checked ? "" : DEFAULT_SESSION_TIMES.pm_out_end_time
                                            })}
                                            className="h-4 w-4 rounded border-gray-300"
                                        />
                                        <Label htmlFor="pm_out_na" className="text-xs font-semibold cursor-pointer text-red-700 uppercase">N/A - No Fines</Label>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label htmlFor="pm_out_start">Start Time</Label>
                                        <Input
                                            id="pm_out_start"
                                            type="time"
                                            disabled={!formData.pm_out_start_time}
                                            value={formData.pm_out_start_time || ""}
                                            onChange={(e) => setFormData({ ...formData, pm_out_start_time: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="pm_out_end">End Time</Label>
                                        <Input
                                            id="pm_out_end"
                                            type="time"
                                            disabled={!formData.pm_out_start_time}
                                            value={formData.pm_out_end_time || ""}
                                            onChange={(e) => setFormData({ ...formData, pm_out_end_time: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="flex gap-4 pt-4">
                        <Button type="submit" disabled={loading}>
                            {loading ? "Saving..." : "Save Event"}
                        </Button>
                        <Button type="button" variant="outline" onClick={onCancel}>
                            Cancel
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    )
}
