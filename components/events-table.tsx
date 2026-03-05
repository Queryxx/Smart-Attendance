"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Edit2, Trash2, Plus, Play, ChevronDown, Search, Calendar, Clock, Eye, Download, CheckCircle } from "lucide-react"
import { formatTo12Hour, formatReadableDate } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
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

interface Event {
    id?: string
    event_name: string
    event_date: string
    start_time: string
    end_time: string
    fine_amount: number
    course_ids?: string[]
    is_exported?: boolean
    course_name?: string
    am_in_start_time?: string
    am_in_end_time?: string
    am_out_start_time?: string
    am_out_end_time?: string
    pm_in_start_time?: string
    pm_in_end_time?: string
    pm_out_start_time?: string
    pm_out_end_time?: string
}

interface Course {
    id?: string
    course_name: string
    course_code?: string
}

export function EventsTable({ onEdit, onDelete }: { onEdit: (event: Event) => void; onDelete: (id: string) => void }) {
    const router = useRouter()
    const [events, setEvents] = useState<Event[]>([])
    const [courses, setCourses] = useState<Course[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState("")
    const [refreshKey, setRefreshKey] = useState(0)
    const [exportingEvent, setExportingEvent] = useState<Event | null>(null)

    const handleConfirmExport = async () => {
        if (!exportingEvent) return

        try {
            const res = await fetch("/api/events", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: exportingEvent.id, is_exported: true })
            })

            if (res.ok) {
                fetchEvents()
            }
        } catch (error) {
            console.error("Error exporting attendance:", error)
        } finally {
            setExportingEvent(null)
        }
    }

    useEffect(() => {
        fetchEvents()
        fetchCourses()
    }, [])

    async function fetchEvents() {
        try {
            setLoading(true)
            const response = await fetch("/api/events")
            const data = await response.json()

            if (!response.ok) {
                console.error("Error fetching events:", data)
                setEvents([])
                return
            }

            // Accept either a raw array or an object with an `events` array
            if (Array.isArray(data)) {
                setEvents(data)
            } else if (data && Array.isArray((data as any).events)) {
                setEvents((data as any).events)
            } else {
                console.error("Unexpected events response shape:", data)
                setEvents([])
            }
        } catch (error) {
            console.error("Error fetching events:", error)
            setEvents([])
        } finally {
            setLoading(false)
        }
    }

    async function fetchCourses() {
        try {
            const response = await fetch("/api/courses")
            const data = await response.json()
            setCourses(data)
        } catch (error) {
            console.error("Error fetching courses:", error)
        }
    }

    function renderCourseDisplay(courseIds?: string[]) {
        if (!courseIds || courseIds.length === 0) {
            return <Badge variant="secondary">All Courses</Badge>
        }

        // Unique the IDs to prevent duplicate key errors
        const uniqueIds = Array.from(new Set(courseIds))

        const selectedCourses = uniqueIds
            .map((id) => courses.find((c) => String(c.id) === String(id)))
            .filter((c): c is Course => !!c)

        if (selectedCourses.length === 0) {
            return <Badge variant="outline">Unknown</Badge>
        }

        const displayedCourses = selectedCourses.slice(0, 2)
        const hasMore = selectedCourses.length > 2

        return (
            <div className="flex flex-wrap gap-1 items-center">
                {displayedCourses.map((course) => (
                    <Badge key={course.id} variant="secondary" className="whitespace-nowrap">
                        {course.course_code || course.course_name}
                    </Badge>
                ))}
                {hasMore && (
                    <Popover>
                        <PopoverTrigger asChild>
                            <Badge variant="outline" className="cursor-pointer hover:bg-slate-100 gap-1">
                                +{selectedCourses.length - 2} more
                                <ChevronDown className="h-3 w-3" />
                            </Badge>
                        </PopoverTrigger>
                        <PopoverContent className="w-80 p-3">
                            <div className="space-y-2">
                                <h4 className="font-medium text-sm border-b pb-1">All Selected Courses</h4>
                                <div className="flex flex-col gap-2 max-h-60 overflow-y-auto pr-1">
                                    {selectedCourses.map((course) => (
                                        <div key={course.id} className="text-sm flex flex-col">
                                            <span className="font-semibold text-indigo-600 text-xs">
                                                {course.course_code || "N/A"}
                                            </span>
                                            <span>{course.course_name}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </PopoverContent>
                    </Popover>
                )}
            </div>
        )
    }

    function handleStartAttendance(event: Event) {
        router.push(`/dashboard/detection?eventId=${event.id}`)
    }

    function getEventStatus(dateStr: string) {
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        const eventDate = new Date(dateStr)
        eventDate.setHours(0, 0, 0, 0)

        if (eventDate.getTime() === today.getTime()) {
            return <Badge className="bg-green-500 hover:bg-green-600">Active</Badge>
        } else if (eventDate.getTime() < today.getTime()) {
            return <Badge variant="secondary">Done</Badge>
        } else {
            return <Badge className="bg-blue-500 hover:bg-blue-600">Upcoming</Badge>
        }
    }

    const filteredEvents = events.filter(
        (event) =>
            event.event_name.toLowerCase().includes(searchTerm.toLowerCase()),
    )

    async function handleDelete(id: string) {
        if (confirm("Are you sure you want to delete this event?")) {
            try {
                await fetch(`/api/events/${id}`, { method: "DELETE" })
                setEvents(events.filter((e) => e.id !== id))
            } catch (error) {
                console.error("Error deleting event:", error)
            }
        }
    }

    return (
        <>
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle>Events</CardTitle>
                            <CardDescription>Manage events and attendance records</CardDescription>
                        </div>
                        <Button onClick={() => onEdit({} as Event)} className="gap-2">
                            <Plus className="h-4 w-4" />
                            Add Event
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="p-6 border-b bg-slate-50/50">
                        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                            <div className="relative w-full md:w-96">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <Input
                                    placeholder="Search events..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10 bg-white border-slate-200 focus:ring-indigo-500"
                                />
                            </div>
                            <p className="text-sm text-slate-500 font-medium">
                                Showing <span className="text-indigo-600">{filteredEvents.length}</span> active events
                            </p>
                        </div>
                    </div>

                    <div className="p-6">
                        {filteredEvents.length === 0 ? (
                            <div className="text-center py-20 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
                                <Calendar className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                                <h3 className="text-lg font-semibold text-slate-900">No events found</h3>
                                <p className="text-slate-500">Try adjusting your search or create a new event.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {filteredEvents.map((event) => (
                                    <div
                                        key={event.id}
                                        className="group relative bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl hover:shadow-indigo-500/10 hover:border-indigo-200 transition-all duration-300 overflow-hidden flex flex-col"
                                    >
                                        {/* Card Header & Title */}
                                        <div className="p-5 pb-3">
                                            <div className="flex justify-between items-start mb-3">
                                                <div className="flex flex-wrap gap-2 items-center">
                                                    {renderCourseDisplay(event.course_ids)}
                                                    {getEventStatus(event.event_date)}
                                                </div>
                                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <TooltipProvider>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-8 w-8 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
                                                                    onClick={() => onEdit(event)}
                                                                >
                                                                    <Edit2 className="h-4 w-4" />
                                                                </Button>
                                                            </TooltipTrigger>
                                                            <TooltipContent>Edit Event</TooltipContent>
                                                        </Tooltip>

                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50"
                                                                    onClick={() => handleDelete(event.id!)}
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                </Button>
                                                            </TooltipTrigger>
                                                            <TooltipContent>Delete Event</TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>
                                                </div>
                                            </div>
                                            <h3 className="text-xl font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1">
                                                {event.event_name}
                                            </h3>
                                        </div>

                                        {/* Event Details */}
                                        <div className="px-5 space-y-3 flex-1">
                                            <div className="flex items-center text-sm text-slate-600 gap-2">
                                                <div className="h-8 w-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
                                                    <Calendar className="h-4 w-4" />
                                                </div>
                                                <span className="font-medium">{formatReadableDate(event.event_date)}</span>
                                            </div>

                                            <div className="flex items-center text-sm text-slate-600 gap-2">
                                                <div className="h-8 w-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
                                                    <Clock className="h-4 w-4" />
                                                </div>
                                                <span className="font-medium">
                                                    {formatTo12Hour(event.start_time)} - {formatTo12Hour(event.end_time)}
                                                </span>
                                            </div>

                                            {/* Session Visualization */}
                                            <div className="pt-2">
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                                                    Attendance Sessions
                                                </span>
                                                <div className="space-y-3">
                                                    {/* AM Session */}
                                                    <div className="p-3 rounded-xl bg-blue-50/50 border border-blue-100">
                                                        <div className="flex justify-between items-center mb-2">
                                                            <span className="text-[10px] font-bold text-blue-600 uppercase">AM SESSION</span>
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-3">
                                                            <div>
                                                                <span className="text-[9px] font-bold text-blue-400 block uppercase">Check In</span>
                                                                <span className="text-xs font-semibold text-blue-900">
                                                                    {event.am_in_start_time && event.am_in_end_time
                                                                        ? `${formatTo12Hour(event.am_in_start_time)} - ${formatTo12Hour(event.am_in_end_time)}`
                                                                        : "Not Set"}
                                                                </span>
                                                            </div>
                                                            <div>
                                                                <span className="text-[9px] font-bold text-blue-400 block uppercase">Check Out</span>
                                                                <span className="text-xs font-semibold text-blue-900">
                                                                    {event.am_out_start_time && event.am_out_end_time
                                                                        ? `${formatTo12Hour(event.am_out_start_time)} - ${formatTo12Hour(event.am_out_end_time)}`
                                                                        : "Not Set"}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* PM Session */}
                                                    <div className="p-3 rounded-xl bg-orange-50/50 border border-orange-100">
                                                        <div className="flex justify-between items-center mb-2">
                                                            <span className="text-[10px] font-bold text-orange-600 uppercase">PM SESSION</span>
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-3">
                                                            <div>
                                                                <span className="text-[9px] font-bold text-orange-400 block uppercase">Check In</span>
                                                                <span className="text-xs font-semibold text-orange-900">
                                                                    {event.pm_in_start_time && event.pm_in_end_time
                                                                        ? `${formatTo12Hour(event.pm_in_start_time)} - ${formatTo12Hour(event.pm_in_end_time)}`
                                                                        : "Not Set"}
                                                                </span>
                                                            </div>
                                                            <div>
                                                                <span className="text-[9px] font-bold text-orange-400 block uppercase">Check Out</span>
                                                                <span className="text-xs font-semibold text-orange-900">
                                                                    {event.pm_out_start_time && event.pm_out_end_time
                                                                        ? `${formatTo12Hour(event.pm_out_start_time)} - ${formatTo12Hour(event.pm_out_end_time)}`
                                                                        : "Not Set"}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Action Footer */}
                                        <div className="p-5 mt-4 border-t border-slate-100 bg-slate-50/30 group-hover:bg-indigo-50/30 transition-colors">
                                            <div className="flex items-center justify-between">
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase italic">
                                                        {event.is_exported ? "Attdn. Fine" : "Attendance Fine"}
                                                    </span>
                                                    <span className="text-sm font-bold text-slate-900">₱{parseFloat(String(event.fine_amount)).toFixed(2)}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <TooltipProvider>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={() => router.push(`/dashboard/events/view-attendance?eventId=${event.id}`)}
                                                                    className="border-slate-200 hover:bg-slate-50 rounded-xl w-9 h-9 p-0"
                                                                >
                                                                    <Eye className="h-4 w-4 text-slate-600" />
                                                                </Button>
                                                            </TooltipTrigger>
                                                            <TooltipContent>
                                                                <p>View Attendance</p>
                                                            </TooltipContent>
                                                        </Tooltip>

                                                        {event.is_exported ? (
                                                            <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-emerald-200 py-2 px-3 rounded-xl gap-2 h-9 flex items-center justify-center">
                                                                <CheckCircle className="h-4 w-4" />
                                                                <span className="text-xs font-bold uppercase tracking-wider">Exported</span>
                                                            </Badge>
                                                        ) : (() => {
                                                            const today = new Date();
                                                            today.setHours(0, 0, 0, 0);
                                                            const eventDate = new Date(event.event_date);
                                                            eventDate.setHours(0, 0, 0, 0);
                                                            const isDone = eventDate.getTime() < today.getTime();

                                                            return (
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <span>
                                                                            <Button
                                                                                variant="outline"
                                                                                size="sm"
                                                                                disabled={!isDone}
                                                                                onClick={() => setExportingEvent(event)}
                                                                                className="border-indigo-200 text-indigo-600 hover:bg-indigo-50 rounded-xl w-9 h-9 p-0 disabled:opacity-50 disabled:bg-slate-50 disabled:border-slate-100 disabled:text-slate-400"
                                                                            >
                                                                                <Download className="h-4 w-4" />
                                                                            </Button>
                                                                        </span>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent>
                                                                        <p>{isDone ? "Export Attendance" : "Event must be finished to export"}</p>
                                                                    </TooltipContent>
                                                                </Tooltip>
                                                            );
                                                        })()}
                                                    </TooltipProvider>
                                                    <Button
                                                        size="sm"
                                                        onClick={() => handleStartAttendance(event)}
                                                        className="bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200 hover:shadow-indigo-300 transition-all gap-2 rounded-xl text-xs"
                                                    >
                                                        <Play className="h-3 w-3 fill-current" />
                                                        Start
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            <AlertDialog open={exportingEvent !== null} onOpenChange={(open) => !open && setExportingEvent(null)}>
                <AlertDialogContent className="rounded-2xl border-none shadow-2xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-xl font-bold text-slate-900">Export Attendance</AlertDialogTitle>
                        <AlertDialogDescription className="text-slate-600 font-medium py-2">
                            Are you sure you want to export the attendance of <span className="font-bold text-indigo-600">"{exportingEvent?.event_name}"</span> to the attendance page?
                            This will make the records official and visible in the main dashboard.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="gap-2">
                        <AlertDialogCancel className="rounded-xl border-slate-200 text-slate-600 font-bold hover:bg-slate-50">Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleConfirmExport}
                            className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-8"
                        >
                            Yes, Export
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}
