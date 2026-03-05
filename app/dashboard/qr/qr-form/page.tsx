"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, MapPin, CheckCircle2, AlertCircle, Hash, Calendar, Clock } from "lucide-react"
import { toast } from "sonner"
import { formatReadableDate, formatTo12Hour } from "@/lib/utils"

export default function QRAttendanceForm() {
    const searchParams = useSearchParams()
    const eventId = searchParams.get("eventId")

    const [studentNumber, setStudentNumber] = useState("")
    const [location, setLocation] = useState<string | null>(null)
    const [locationError, setLocationError] = useState<string | null>(null)
    const [isGettingLocation, setIsGettingLocation] = useState(false)
    const [eventData, setEventData] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [submitted, setSubmitted] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (eventId) {
            fetchEventData()
        } else {
            setError("No event specified. Please scan a valid QR code.")
            setLoading(false)
        }
    }, [eventId])

    async function fetchEventData() {
        try {
            // Use public endpoint so students can access without login session
            const res = await fetch(`/api/events/public/${eventId}`)
            if (res.ok) {
                const data = await res.json()

                // Check if event has passed (Expiration Logic)
                const today = new Date()
                today.setHours(0, 0, 0, 0)

                const eventDate = new Date(data.event_date)
                eventDate.setHours(0, 0, 0, 0)

                if (eventDate < today) {
                    setError("This event has already ended. Attendance recording is no longer available.")
                } else {
                    setEventData(data)
                }
            } else {
                setError("Unable to find event information. The link may be invalid.")
            }
        } catch (err) {
            console.error("Error fetching event:", err)
            setError("Error connecting to server.")
        } finally {
            setLoading(false)
        }
    }

    const requestLocation = () => {
        setIsGettingLocation(true)
        setLocationError(null)

        // Check if we are in a secure context (HTTPS or localhost)
        if (typeof window !== 'undefined' && window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
            setLocationError("Security Error: GPS requires a secure (HTTPS) connection. Please contact the administrator.")
            setIsGettingLocation(false)
            return
        }

        if (!navigator.geolocation) {
            setLocationError("Geolocation is not supported by your browser.")
            setIsGettingLocation(false)
            return
        }

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords
                try {
                    // Try to get a readable address (Reverse Geocoding)
                    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`)
                    const data = await response.json()
                    const address = data.display_name || `Lat: ${latitude.toFixed(6)}, Lon: ${longitude.toFixed(6)}`
                    setLocation(address)
                } catch (err) {
                    // Fallback to coordinates
                    setLocation(`Lat: ${latitude.toFixed(6)}, Lon: ${longitude.toFixed(6)}`)
                } finally {
                    setIsGettingLocation(false)
                }
            },
            (err) => {
                console.error("Detailed Location Error:", {
                    code: err.code,
                    message: err.message
                })

                if (err.code === 1) {
                    setLocationError("Permission denied. Please allow location access in your browser settings.")
                } else if (err.code === 2) {
                    setLocationError("Position unavailable. Make sure your device GPS is turned on.")
                } else if (err.code === 3) {
                    setLocationError("Request timed out. Please try again in an area with better signal.")
                } else {
                    setLocationError("An unknown error occurred while retrieving location.")
                }
                setIsGettingLocation(false)
            },
            {
                enableHighAccuracy: true,
                timeout: 10000, // Increase to 10 seconds 
                maximumAge: 0
            }
        )
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!studentNumber.trim()) {
            toast.error("Please enter your student number")
            return
        }

        if (!location) {
            toast.error("Location is required for attendance")
            return
        }

        setIsSubmitting(true)
        try {
            const res = await fetch("/api/attendance/qr", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    student_number: studentNumber,
                    event_id: eventId,
                    location: location,
                }),
            })

            const data = await res.json()

            if (res.ok) {
                setSubmitted(true)
                toast.success("Attendance recorded successfully!")
            } else {
                setError(data.message || "Failed to record attendance")
                toast.error(data.message || "Failed to record attendance")
            }
        } catch (err) {
            console.error("Submission error:", err)
            setError("Connection error. Please try again.")
            toast.error("Connection error. Please try again.")
        } finally {
            setIsSubmitting(false)
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="text-center">
                    <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-4" />
                    <p className="text-slate-500 font-medium">Loading event details...</p>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
                <Card className="w-full max-w-md border-red-100">
                    <CardHeader className="text-center">
                        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-2" />
                        <CardTitle className="text-red-900">Registration Error</CardTitle>
                        <CardDescription>{error}</CardDescription>
                    </CardHeader>
                    <CardFooter>
                        <Button className="w-full" onClick={() => window.location.reload()}>Retry</Button>
                    </CardFooter>
                </Card>
            </div>
        )
    }

    if (submitted) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-green-50 to-blue-50">
                <Card className="w-full max-w-md shadow-2xl border-green-100">
                    <CardHeader className="text-center">
                        <div className="bg-green-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CheckCircle2 className="h-10 w-10 text-green-600" />
                        </div>
                        <CardTitle className="text-2xl font-bold text-green-900">Success!</CardTitle>
                        <CardDescription className="text-lg">
                            Attendance recorded for <br />
                            <span className="font-bold text-slate-900">{studentNumber}</span>
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="text-center space-y-4">
                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Event</p>
                            <p className="font-bold text-slate-900">{eventData?.event_name}</p>
                        </div>
                        <p className="text-sm text-slate-500 italic">You may now close this page.</p>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-12 px-4">
            <Card className="max-w-md mx-auto shadow-2xl border-0 overflow-hidden">
                <div className="h-3 bg-primary" />
                <CardHeader className="space-y-1">
                    <CardTitle className="text-2xl font-bold text-slate-900 text-center">Attendance Log</CardTitle>
                    <CardDescription className="text-center">Fill in your details to record your attendance</CardDescription>
                </CardHeader>

                <CardContent className="space-y-6">
                    {/* Event Details Preview */}
                    <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
                        <h4 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-primary" />
                            Current Event
                        </h4>
                        <div className="space-y-2">
                            <p className="font-bold text-slate-900 leading-tight">{eventData?.event_name}</p>
                            <div className="flex items-center gap-4 text-xs text-slate-500">
                                <span className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {formatTo12Hour(eventData?.start_time)} - {formatTo12Hour(eventData?.end_time)}
                                </span>
                                <span>|</span>
                                <span>{formatReadableDate(eventData?.event_date)}</span>
                            </div>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-2">
                            <Label htmlFor="studentNumber" className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                <Hash className="h-4 w-4" />
                                Student Number
                            </Label>
                            <Input
                                id="studentNumber"
                                placeholder="Enter your student number (e.g. 2024-001)"
                                value={studentNumber}
                                onChange={(e) => setStudentNumber(e.target.value)}
                                className="h-12 text-lg border-slate-200 focus:ring-primary rounded-xl"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                <MapPin className="h-4 w-4" />
                                Your Location
                            </Label>

                            {!location ? (
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="w-full h-12 gap-2 border-dashed border-2 hover:border-primary hover:bg-primary/5 rounded-xl"
                                    onClick={requestLocation}
                                    disabled={isGettingLocation}
                                >
                                    {isGettingLocation ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            Detecting GPS...
                                        </>
                                    ) : (
                                        <>
                                            <MapPin className="h-4 w-4 text-primary" />
                                            Enable GPS Location
                                        </>
                                    )}
                                </Button>
                            ) : (
                                <div className="p-3 bg-green-50 rounded-xl border border-green-200 flex items-start gap-3">
                                    <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                                    <div className="overflow-hidden">
                                        <p className="text-xs font-bold text-green-700 uppercase">Location Locked</p>
                                        <p className="text-sm text-green-800 line-clamp-2">{location}</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={requestLocation}
                                        className="text-xs text-green-600 hover:text-green-800 underline ml-auto flex-shrink-0"
                                    >
                                        Change
                                    </button>
                                </div>
                            )}

                            {locationError && (
                                <p className="text-xs text-red-500 mt-1 flex items-center gap-1 font-medium bg-red-50 p-2 rounded-lg border border-red-100">
                                    <AlertCircle className="h-3 w-3 flex-shrink-0" />
                                    {locationError}
                                </p>
                            )}

                            {error && (
                                <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 mt-4">
                                    <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                                    <div className="overflow-hidden">
                                        <p className="text-xs font-bold text-red-700 uppercase">Input Error</p>
                                        <p className="text-sm text-red-800">{error}</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setError(null)}
                                        className="text-xs text-red-600 hover:text-red-800 underline ml-auto flex-shrink-0"
                                    >
                                        Dismiss
                                    </button>
                                </div>
                            )}
                        </div>

                        <Button
                            type="submit"
                            className="w-full h-14 text-lg font-bold rounded-2xl shadow-lg transition-all active:scale-[0.98]"
                            disabled={isSubmitting || !location}
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                                    Recording...
                                </>
                            ) : (
                                "Record Attendance"
                            )}
                        </Button>
                    </form>
                </CardContent>

                <CardFooter className="bg-slate-50 flex flex-col p-6 items-center border-t border-slate-100">
                    <p className="text-xs text-slate-400 text-center flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        GPS verification active for this event
                    </p>
                </CardFooter>
            </Card>
        </div>
    )
}
