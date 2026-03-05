"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { useSearchParams } from "next/navigation"
import * as faceapi from "face-api.js"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { getAsiaTimeFormatted, getAsiaDateFormatted, formatReadableDate, formatTo12Hour } from "@/lib/utils"

export default function Detect() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const eventId = searchParams?.get("eventId")
    const [modelsLoaded, setModelsLoaded] = useState(false)
    const [status, setStatus] = useState("Open camera to start detection")
    const [isAuthorized, setIsAuthorized] = useState(false)
    const [authLoading, setAuthLoading] = useState(true)
    const [currentStudent, setCurrentStudent] = useState<any>(null)
    const [error, setError] = useState<string | null>(null)
    const [attendanceType, setAttendanceType] = useState("in")
    const [threshold, setThreshold] = useState(0.4)
    const [showDialog, setShowDialog] = useState(false)
    const [attendanceMessage, setAttendanceMessage] = useState<{ name: string; status: string; time: string } | null>(null)
    const [multipleDetections, setMultipleDetections] = useState<Array<{ name: string; status: string; time: string }>>([])
    const [eventData, setEventData] = useState<any>(null)
    const [detectionMethod, setDetectionMethod] = useState<"face" | "qr">("face")
    const [formUrl, setFormUrl] = useState("")
    const videoRef = useRef<HTMLVideoElement>(null)
    const overlayRef = useRef<HTMLDivElement>(null)
    const [boxes, setBoxes] = useState<any[]>([])
    const streamRef = useRef<MediaStream | null>(null)
    const [lastAttendanceCheck, setLastAttendanceCheck] = useState<Record<string, number>>({})
    const [attendedStudents, setAttendedStudents] = useState<Set<number>>(new Set())
    const [loadingAttendance, setLoadingAttendance] = useState(false)
    const pendingAttendanceRef = useRef<Set<number>>(new Set())
    const attendedStudentsRef = useRef<Set<number>>(new Set()) // Track attended students with ref for detection loop
    const detectionTimersRef = useRef<Record<string, number>>({}) // Track detection time for each student
    const detectionActiveRef = useRef<boolean>(false) // Track if detection loop is running
    const [currentSession, setCurrentSession] = useState<{ type: "AM" | "PM" | null; inWindow: boolean; message: string }>({
        type: null,
        inWindow: false,
        message: "No active session",
    })
    const [timeValidationError, setTimeValidationError] = useState<string | null>(null)
    const [isCameraActive, setIsCameraActive] = useState(false)
    const [courses, setCourses] = useState<any[]>([])
    const [realTime, setRealTime] = useState<string>("")

    useEffect(() => {
        checkAuthorization()
        fetchCourses()

        // Update real time clock
        const updateClock = () => {
            setRealTime(new Date().toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: true
            }))
        }

        updateClock()
        const timer = setInterval(updateClock, 1000)

        return () => clearInterval(timer)
    }, [])

    async function fetchCourses() {
        try {
            const res = await fetch("/api/courses")
            if (res.ok) {
                const data = await res.json()
                setCourses(data)
            }
        } catch (err) {
            console.error("Error fetching courses:", err)
        }
    }

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
        const loadModels = async () => {
            try {
                const MODEL_URL = "/models"
                console.log("Loading models from:", MODEL_URL)
                await Promise.all([
                    faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
                    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
                    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
                ])

                const modelLoaded =
                    faceapi.nets.ssdMobilenetv1.isLoaded &&
                    faceapi.nets.faceLandmark68Net.isLoaded &&
                    faceapi.nets.faceRecognitionNet.isLoaded

                if (!modelLoaded) {
                    throw new Error("Models did not load correctly")
                }
                console.log("✅ All models loaded successfully")
                setModelsLoaded(true)
            } catch (error) {
                console.error("Failed to load models:", error)
                setStatus("Error loading models. Please refresh and try again.")
            }
        }

        loadModels()

        // Cleanup function
        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach((track: MediaStreamTrack) => track.stop())
            }
        }
    }, [])

    // Helper function to validate if current time is within session windows
    const validateSessionTime = (event: any): { isValid: boolean; session: string; message: string } => {
        if (!event) return { isValid: false, session: "Invalid Event", message: "Event data missing" }

        // 1. Check if current date matches event date
        const currentDate = getAsiaDateFormatted('Asia/Manila') // returns YYYY-MM-DD

        // Use local date components to avoid UTC shifting
        const dateObj = new Date(event.event_date)
        const eventYear = dateObj.getFullYear()
        const eventMonth = String(dateObj.getMonth() + 1).padStart(2, '0')
        const eventDay = String(dateObj.getDate()).padStart(2, '0')
        const eventDate = `${eventYear}-${eventMonth}-${eventDay}`

        if (currentDate !== eventDate) {
            return {
                isValid: false,
                session: "Wrong Date",
                message: `Current date ${currentDate} does not match event date ${eventDate}`,
            }
        }

        if (!event.am_in_start_time && !event.pm_in_start_time) {
            // No sessions configured, allow attendance
            return { isValid: true, session: "No sessions", message: "No time restrictions" }
        }

        // Get current time in Asia/Manila timezone (HH:MM format)
        const currentTimeStr = getAsiaTimeFormatted('Asia/Manila').substring(0, 5)

        // Helper to ensure HH:MM format for comparison
        const formatTime = (time: string | null) => time ? time.substring(0, 5) : null

        // Check AM session
        if (event.am_in_start_time) {
            const amInStart = formatTime(event.am_in_start_time)!
            const amInEnd = formatTime(event.am_in_end_time)!
            const amOutStart = formatTime(event.am_out_start_time)!
            const amOutEnd = formatTime(event.am_out_end_time)!

            const inAmCheckIn = currentTimeStr >= amInStart && currentTimeStr <= amInEnd
            const inAmCheckOut = currentTimeStr >= amOutStart && currentTimeStr <= amOutEnd

            if (inAmCheckIn) {
                return {
                    isValid: true,
                    session: "AM Check-In",
                    message: `Valid: AM Check-In (${formatTo12Hour(amInStart)} - ${formatTo12Hour(amInEnd)})`,
                }
            }
            if (inAmCheckOut) {
                return {
                    isValid: true,
                    session: "AM Check-Out",
                    message: `Valid: AM Check-Out (${formatTo12Hour(amOutStart)} - ${formatTo12Hour(amOutEnd)})`,
                }
            }
        }

        // Check PM session
        if (event.pm_in_start_time) {
            const pmInStart = formatTime(event.pm_in_start_time)!
            const pmInEnd = formatTime(event.pm_in_end_time)!
            const pmOutStart = formatTime(event.pm_out_start_time)!
            const pmOutEnd = formatTime(event.pm_out_end_time)!

            const inPmCheckIn = currentTimeStr >= pmInStart && currentTimeStr <= pmInEnd
            const inPmCheckOut = currentTimeStr >= pmOutStart && currentTimeStr <= pmOutEnd

            if (inPmCheckIn) {
                return {
                    isValid: true,
                    session: "PM Check-In",
                    message: `Valid: PM Check-In (${formatTo12Hour(pmInStart)} - ${formatTo12Hour(pmInEnd)})`,
                }
            }
            if (inPmCheckOut) {
                return {
                    isValid: true,
                    session: "PM Check-Out",
                    message: `Valid: PM Check-Out (${formatTo12Hour(pmOutStart)} - ${formatTo12Hour(pmOutEnd)})`,
                }
            }
        }

        // Outside all time windows
        return {
            isValid: false,
            session: "Outside Session Times",
            message: `Current time ${currentTimeStr} is outside all valid session windows`,
        }
    }

    // Separate useEffect for loading event data
    useEffect(() => {
        const loadEventData = async () => {
            if (eventId) {
                try {
                    console.log("Loading event data for eventId:", eventId)
                    const res = await fetch(`/api/events/${eventId}`)
                    console.log("Event fetch response status:", res.status)
                    if (res.ok) {
                        const data = await res.json()
                        console.log("Event data loaded:", data)
                        setEventData(data)
                        setStatus(`Attendance for: ${data.event_name}`)

                        // Validate session time
                        const validation = validateSessionTime(data)
                        setCurrentSession({
                            type: validation.session.includes("AM")
                                ? "AM"
                                : validation.session.includes("PM")
                                    ? "PM"
                                    : null,
                            inWindow: validation.isValid,
                            message: validation.message,
                        })
                    } else {
                        console.error("Event fetch failed with status:", res.status)
                        const errorData = await res.json()
                        console.error("Error response:", errorData)
                    }
                } catch (error) {
                    console.error("Error loading event data:", error)
                }
            } else {
                console.log("No eventId provided in URL")
            }
        }

        loadEventData()

        // Generate form URL when eventId is available
        if (eventId && typeof window !== 'undefined') {
            const baseUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin
            setFormUrl(`${baseUrl}/dashboard/qr/qr-form?eventId=${eventId}`)
        }
    }, [eventId])

    const openCamera = async () => {
        try {
            setError(null)
            setStatus("Requesting camera access...")

            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { min: 640, ideal: 1280, max: 1920 },
                    height: { min: 480, ideal: 720, max: 1080 },
                    facingMode: "user",
                },
            })

            streamRef.current = stream
            const video = videoRef.current
            if (!video) {
                throw new Error("Video element not found")
            }

            // Set video source
            video.srcObject = stream
            video.setAttribute("playsinline", "true")

            // Show video element first so it can play
            setIsCameraActive(true)

            // Wait for video to be ready and play
            await new Promise<void>((resolve) => {
                const onVideoReady = async () => {
                    try {
                        await video.play()
                        console.log("Video playing successfully")
                        resolve()
                    } catch (e) {
                        console.error("Error playing video:", e)
                        // Even if play fails, we try to proceed or handle the error
                        resolve()
                    }
                }

                if (video.readyState >= 2) {
                    onVideoReady()
                } else {
                    video.onloadeddata = onVideoReady
                }
            })

            console.log("Starting face detection...")
            startDetection()
        } catch (error) {
            console.error("Camera access error:", error)
            setIsCameraActive(false)
            setError("Failed to access camera. Please ensure camera permissions are granted.")
            setStatus("Camera error - check permissions")
        }
    }

    const startDetection = async () => {
        try {
            setStatus("Loading student data...")
            const res = await fetch("/api/students")
            if (!res.ok) {
                throw new Error(`Failed to fetch students: ${res.status} ${res.statusText}`)
            }
            const data = await res.json()
            let students = data

            // Do not pre-filter by course anymore, keep all students to detect "Wrong Course"
            // if (eventId && eventData && eventData.course_ids && eventData.course_ids.length > 0) {
            //     students = students.filter((s: any) =>
            //         eventData.course_ids.some((cid: any) => String(cid) === String(s.course_id))
            //     )
            // }

            console.log(`Loaded ${students.length} students from server`)
            console.log("Students with face_encoding:", students.filter((s: any) => s.face_encoding).length)
            console.log("Sample student:", students[0])

            // Load existing attendance records for this event BEFORE starting detection
            if (eventId) {
                try {
                    setLoadingAttendance(true)
                    const attendanceRes = await fetch(`/api/attendance?eventId=${eventId}`)
                    if (attendanceRes.ok) {
                        const attendanceData = await attendanceRes.json()
                        const recordedStudentIds = new Set<number>(
                            attendanceData.map((record: any) => Number(record.student_id))
                        )
                        // Update both the ref and state
                        attendedStudentsRef.current = recordedStudentIds
                        setAttendedStudents(recordedStudentIds)
                        console.log("Already recorded students:", recordedStudentIds)
                    }
                } catch (error) {
                    console.error("Error loading attendance records:", error)
                } finally {
                    setLoadingAttendance(false)
                }
            }

            // Build labeled descriptors
            const labeled = students
                .filter((student: any) => student.face_encoding)
                .map((student: any) => {
                    try {
                        const parsed = JSON.parse(student.face_encoding)
                        if (Array.isArray(parsed) && parsed.length === 128) {
                            const descriptor = new Float32Array(parsed)
                            return new faceapi.LabeledFaceDescriptors(String(student.id), [descriptor])
                        }
                        console.warn(`Skipping student ${student.id} (${student.first_name}) - Invalid face encoding length: ${parsed?.length}. Expected: 128`)
                        return null
                    } catch (e) {
                        console.error(`Failed to parse face encoding for student ${student.id}`, e)
                        return null
                    }
                })
                .filter((item: any): item is faceapi.LabeledFaceDescriptors => item !== null)

            // Create matcher only if we have registered students
            const matcher = labeled.length > 0 ? new faceapi.FaceMatcher(labeled, threshold) : null

            setStatus("Detecting...")

            const video = videoRef.current
            const overlay = overlayRef.current
            if (!video || !overlay) {
                throw new Error("Video or overlay element not found")
            }

            detectionActiveRef.current = true
            let frameCount = 0

            const detectFaces = async (): Promise<void> => {
                if (!detectionActiveRef.current) return
                try {
                    frameCount++
                    // Wait for video to be ready
                    if (video.readyState < 2) {
                        requestAnimationFrame(() => detectFaces())
                        return
                    }
                    // Get video intrinsic dimensions
                    const videoWidth = video.videoWidth
                    const videoHeight = video.videoHeight
                    if (videoWidth > 0 && videoHeight > 0) {
                        // Get the displayed size of the video element (may be scaled by CSS)
                        const rect = video.getBoundingClientRect()
                        const displayWidth = rect.width
                        const displayHeight = rect.height

                        // Detect faces
                        const detections = await faceapi
                            .detectAllFaces(video, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.3 }))
                            .withFaceLandmarks()
                            .withFaceDescriptors()

                        if (frameCount % 30 === 0) {
                            console.log("Faces detected:", detections.length)
                        }

                        // Compute scaling factors from intrinsic video to displayed size
                        const scaleX = displayWidth / videoWidth
                        const scaleY = displayHeight / videoHeight

                        // Map detections to overlay boxes and handle attendance
                        const recordedThisFrame: Array<{ name: string; status: string; time: string }> = []
                        const newBoxes = detections.map((d: any) => {
                            const b = d.detection.box

                            // If no registered students or matcher not created, mark all faces as unregistered
                            if (!matcher) {
                                return {
                                    x: b.x * scaleX,
                                    y: b.y * scaleY,
                                    width: b.width * scaleX,
                                    height: b.height * scaleY,
                                    student: null,
                                    distance: 1,
                                    unregistered: true,
                                }
                            }

                            const best = matcher.findBestMatch(d.descriptor)
                            const student = students.find((s: any) => String(s.id) === best.label)

                            // If distance is too high, treat as unregistered
                            if (best.distance >= threshold) {
                                return {
                                    x: b.x * scaleX,
                                    y: b.y * scaleY,
                                    width: b.width * scaleX,
                                    height: b.height * scaleY,
                                    student: null,
                                    distance: best.distance,
                                    unregistered: true,
                                }
                            }

                            // Process if we found a matching student
                            if (student) {
                                // 1. Check if student belongs to the correct course for this event
                                let isCorrectCourse = true
                                if (eventId && eventData && eventData.course_ids && eventData.course_ids.length > 0) {
                                    isCorrectCourse = eventData.course_ids.some((cid: any) => String(cid) === String(student.course_id))
                                }

                                if (!isCorrectCourse) {
                                    return {
                                        x: b.x * scaleX,
                                        y: b.y * scaleY,
                                        width: b.width * scaleX,
                                        height: b.height * scaleY,
                                        student: student,
                                        distance: best.distance,
                                        wrongCourse: true,
                                    }
                                }

                                // 2. Check if current time is within session windows (Immediate Check)
                                const timeValidation = validateSessionTime(eventData || {})
                                if (!timeValidation.isValid) {
                                    return {
                                        x: b.x * scaleX,
                                        y: b.y * scaleY,
                                        width: b.width * scaleX,
                                        height: b.height * scaleY,
                                        student: student,
                                        distance: best.distance,
                                        outsideTimeWindow: true,
                                    }
                                }

                                // 3. Skip if already recorded in database for this event OR pending recording
                                if (attendedStudentsRef.current.has(student.id) || pendingAttendanceRef.current.has(student.id)) {
                                    // Clear detection timer if student was already attended
                                    const detectionKey = String(student.id)
                                    if (detectionTimersRef.current[detectionKey]) {
                                        delete detectionTimersRef.current[detectionKey]
                                    }
                                    return {
                                        x: b.x * scaleX,
                                        y: b.y * scaleY,
                                        width: b.width * scaleX,
                                        height: b.height * scaleY,
                                        student: student,
                                        distance: best.distance,
                                        alreadyAttended: true,
                                    }
                                }

                                const now = Date.now()
                                const detectionKey = String(student.id)
                                const lastCheck = lastAttendanceCheck[student.id] || 0

                                // Track continuous detection time for 3-second requirement
                                if (!detectionTimersRef.current[detectionKey]) {
                                    // First detection of this student
                                    detectionTimersRef.current[detectionKey] = now
                                } else {
                                    const detectionDuration = now - detectionTimersRef.current[detectionKey]

                                    // Only process attendance after 3 seconds of continuous stable detection
                                    if (detectionDuration >= 3000 && now - lastCheck >= 2000) {
                                        setLastAttendanceCheck((prev) => ({
                                            ...prev,
                                            [student.id]: now,
                                        }))

                                        // Mark as pending IMMEDIATELY to prevent duplicate recordings
                                        pendingAttendanceRef.current.add(student.id)
                                        // Reset detection timer after recording
                                        delete detectionTimersRef.current[detectionKey]

                                        // Extract session (AM/PM) from validation message
                                        const session = timeValidation.session.includes("AM") ? "AM" : "PM"
                                        const type = timeValidation.session.includes("Check-In") ? "IN" : "OUT"

                                        // Record attendance
                                        fetch("/api/attendance", {
                                            method: "POST",
                                            headers: { "Content-Type": "application/json" },
                                            body: JSON.stringify({
                                                student_id: student.id,
                                                event_id: eventId ? parseInt(eventId) : null,
                                                session: session,
                                                type: type,
                                                status: attendanceType,
                                                method: "face",
                                                location: eventData?.location || "On-site Camera",
                                            }),
                                        })
                                            .then((res) => {
                                                if (!res.ok) {
                                                    console.error("Failed to record attendance")
                                                    pendingAttendanceRef.current.delete(student.id)
                                                } else {
                                                    // Add to attended set (both ref and state)
                                                    attendedStudentsRef.current.add(student.id)
                                                    setAttendedStudents((prev) => new Set([...prev, student.id]))

                                                    // Show dialog immediately with student details
                                                    const time = new Date().toLocaleTimeString('en-US', { hour12: true })
                                                    const message = {
                                                        name: `${student.first_name} ${student.last_name}`,
                                                        status: attendanceType === "in" ? "Time In" : "Time Out",
                                                        time: time,
                                                    }
                                                    setAttendanceMessage(message)
                                                    setMultipleDetections([message])
                                                    setShowDialog(true)
                                                    setTimeout(() => setShowDialog(false), 3000)

                                                    console.log(`✅ Attendance recorded for ${student.first_name} ${student.last_name}`)
                                                }
                                            })
                                            .catch((err) => {
                                                console.error("Attendance recording error:", err)
                                                pendingAttendanceRef.current.delete(student.id)
                                            })
                                    }
                                }

                                return {
                                    x: b.x * scaleX,
                                    y: b.y * scaleY,
                                    width: b.width * scaleX,
                                    height: b.height * scaleY,
                                    student: student,
                                    distance: best.distance,
                                }
                            }

                            // Also record attendance for unregistered faces
                            if (best.distance >= threshold) {
                                const now = Date.now()
                                const faceKey = `unregistered_${best.label}`
                                const lastCheck = lastAttendanceCheck[faceKey] || 0

                                if (now - lastCheck >= 2000) {
                                    setLastAttendanceCheck((prev) => ({
                                        ...prev,
                                        [faceKey]: now,
                                    }))

                                    // Show unregistered detection dialog
                                    const time = new Date().toLocaleTimeString('en-US', { hour12: true })
                                    setAttendanceMessage({
                                        name: "Unknown Person",
                                        status: "Not Registered",
                                        time: time,
                                    })
                                    setShowDialog(true)
                                    setTimeout(() => setShowDialog(false), 3000)
                                }
                            }

                            return {
                                x: b.x * scaleX,
                                y: b.y * scaleY,
                                width: b.width * scaleX,
                                height: b.height * scaleY,
                                student: null,
                                distance: best.distance,
                            }
                        })

                        setBoxes(detectionActiveRef.current ? newBoxes : [])
                        // Update currentStudent if any known face
                        const known = newBoxes.find((b) => b.student)
                        setCurrentStudent(detectionActiveRef.current && known ? known.student : null)
                    }
                    // Continue detection loop
                    if (detectionActiveRef.current) {
                        requestAnimationFrame(() => detectFaces())
                    }
                } catch (error) {
                    console.error("Detection frame error:", error)
                    // Continue detection even if one frame fails
                    if (detectionActiveRef.current) {
                        requestAnimationFrame(() => detectFaces())
                    }
                }
            }

            // Start detection loop
            detectFaces()
        } catch (error) {
            console.error("startDetection error:", error)
            setError("Failed to start detection. Please refresh and try again.")
            setStatus("Detection error - please refresh")
        }
    }

    const stopCamera = () => {
        // Stop detection loop immediately
        detectionActiveRef.current = false

        // Stop video stream
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((track: MediaStreamTrack) => track.stop())
            streamRef.current = null
        }

        // Clear video element
        const video = videoRef.current
        if (video) {
            video.srcObject = null
        }

        setCurrentStudent(null)
        setBoxes([])
        attendedStudentsRef.current.clear()
        setAttendedStudents(new Set())
        pendingAttendanceRef.current.clear()
        detectionTimersRef.current = {} // Clear detection timers
        setIsCameraActive(false)
        setStatus("Camera stopped - click Open Camera to start again")
    }

    if (authLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
                <div className="text-center">Loading...</div>
            </div>
        )
    }

    if (!isAuthorized) {
        return null // This won't render as user will be redirected
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
            {/* Header with Back Button */}
            <div className="border-b border-slate-200 bg-white">
                <div className="px-6 py-4 flex items-center gap-4">
                    <button
                        onClick={() => router.back()}
                        className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                        <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">
                            {eventData ? eventData.event_name : "Face Detection & Attendance"}
                        </h1>
                        <p className="text-sm text-slate-500">Real-time face recognition attendance system</p>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="p-6">
                <div className="max-w-7xl mx-auto">
                    {/* Event Info Cards */}
                    {eventData && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                            <div className="bg-white rounded-lg p-4 border border-slate-200 shadow-sm">
                                <p className="text-xs text-slate-500 font-semibold uppercase mb-1">Event Date</p>
                                <p className="text-lg font-bold text-slate-900">{formatReadableDate(eventData.event_date)}</p>
                            </div>
                            <div className="bg-white rounded-lg p-4 border border-slate-200 shadow-sm">
                                <p className="text-xs text-slate-500 font-semibold uppercase mb-1">Time</p>
                                <p className="text-lg font-bold text-slate-900">{formatTo12Hour(eventData.start_time)} - {formatTo12Hour(eventData.end_time)}</p>
                            </div>
                            <div className="bg-white rounded-lg p-4 border border-slate-200 shadow-sm relative group">
                                <p className="text-xs text-slate-500 font-semibold uppercase mb-1">Course Scope</p>
                                <div className="text-slate-900">
                                    {(() => {
                                        if (!eventData.course_ids || eventData.course_ids.length === 0) {
                                            return <p className="text-sm font-bold">All Courses</p>;
                                        }

                                        const ids = Array.isArray(eventData.course_ids) ? eventData.course_ids : [eventData.course_ids];
                                        if (ids.length === 1) {
                                            const course = courses.find(c => String(c.id) === String(ids[0]));
                                            return (
                                                <p className="text-sm font-bold truncate" title={course?.course_name}>
                                                    {course ? course.course_name : `Course ${ids[0]}`}
                                                </p>
                                            );
                                        }

                                        // Show summary for multiple
                                        const includedCourses = courses.filter(c => ids.map(String).includes(String(c.id)));
                                        const names = includedCourses.map(c => c.course_code || c.course_name).join(", ");

                                        return (
                                            <div>
                                                <p className="text-sm font-bold">{ids.length} Courses</p>
                                                <p className="text-[10px] text-slate-500 truncate" title={names}>
                                                    {names}
                                                </p>
                                            </div>
                                        );
                                    })()}
                                </div>
                            </div>
                            <div className="bg-white rounded-lg p-4 border border-slate-200 shadow-sm">
                                <p className="text-xs text-slate-500 font-semibold uppercase mb-1">Fine Amount</p>
                                <p className="text-lg font-bold text-slate-900">₱{parseFloat(eventData.fine_amount).toFixed(2)}</p>
                            </div>
                        </div>
                    )}

                    {/* Main Content Grid */}
                    <div className="grid grid-cols-4 gap-6">
                        {/* Left Column: Camera (3 cols) */}
                        <div className="col-span-3">
                            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-lg">
                                {/* Session Status Display */}
                                {eventData && (eventData.am_in_start_time || eventData.pm_in_start_time) && (
                                    <div className={`mb-4 p-4 rounded-lg border-2 ${currentSession.inWindow ? "bg-green-50 border-green-300" : "bg-yellow-50 border-yellow-300"}`}>
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className={`font-semibold ${currentSession.inWindow ? "text-green-700" : "text-yellow-700"}`}>
                                                    {currentSession.inWindow ? "✓ Session Active" : "⚠ Outside Session Hours"}
                                                </p>
                                                <p className={`text-sm ${currentSession.inWindow ? "text-green-600" : "text-yellow-600"}`}>
                                                    {currentSession.message}
                                                </p>
                                            </div>
                                            {currentSession.type && (
                                                <div className="px-3 py-1 rounded-full bg-white font-semibold">
                                                    <span className={currentSession.type === "AM" ? "text-blue-600 text-lg" : "text-orange-600 text-lg"}>
                                                        {currentSession.type}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Time Validation Error */}
                                {timeValidationError && (
                                    <div className="mb-4 p-3 bg-red-50 border-2 border-red-300 rounded-lg">
                                        <div className="flex items-center text-red-700 font-semibold text-sm">
                                            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            {timeValidationError}
                                        </div>
                                    </div>
                                )}

                                {/* Method Selection */}
                                <div className="flex p-1 bg-slate-100 rounded-xl mb-6 w-fit mx-auto shadow-inner border border-slate-200">
                                    <button
                                        onClick={() => {
                                            setDetectionMethod("face")
                                            setError(null)
                                        }}
                                        className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-bold transition-all duration-200 ${detectionMethod === "face"
                                            ? "bg-white text-blue-600 shadow-md scale-105"
                                            : "text-slate-500 hover:text-slate-700"
                                            }`}
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        Face Detection
                                    </button>
                                    <button
                                        onClick={() => {
                                            setDetectionMethod("qr")
                                            stopCamera()
                                            setError(null)
                                        }}
                                        className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-bold transition-all duration-200 ${detectionMethod === "qr"
                                            ? "bg-white text-blue-600 shadow-md scale-105"
                                            : "text-slate-500 hover:text-slate-700"
                                            }`}
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                                        </svg>
                                        QR Login Form
                                    </button>
                                </div>

                                {/* Controls */}
                                <div className={`flex flex-col gap-4 mb-4 ${detectionMethod === 'qr' ? 'hidden' : ''}`}>
                                    <div className="grid grid-cols-1 md:grid-cols-3 items-center gap-4">
                                        {/* Left Side: Buttons */}
                                        <div className="flex gap-3">
                                            <button
                                                disabled={!modelsLoaded || isCameraActive}
                                                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                                                onClick={openCamera}
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                </svg>
                                                Open Camera
                                            </button>
                                            <button
                                                disabled={!isCameraActive}
                                                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                                                onClick={stopCamera}
                                            >
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                Stop
                                            </button>
                                        </div>

                                        {/* Center: Real-time Clock */}
                                        <div className="flex justify-center flex-shrink-0">
                                            <div className="flex items-center gap-3 px-6 py-2 bg-slate-50 text-indigo-700 rounded-xl shadow-sm border-2 border-slate-200 min-w-[240px] justify-center">
                                                <div className="w-3 h-3 rounded-full bg-indigo-500 animate-pulse flex-shrink-0"></div>
                                                <span className="text-3xl font-extrabold tracking-tight tabular-nums drop-shadow-sm">{realTime}</span>
                                            </div>
                                        </div>

                                        {/* Right Side: Threshold */}
                                        <div className="flex items-center gap-3 md:justify-end">
                                            <span className="text-sm font-medium text-slate-700">Threshold:</span>
                                            <input
                                                type="range"
                                                min="0.3"
                                                max="0.8"
                                                step="0.05"
                                                value={threshold}
                                                onChange={(e) => setThreshold(parseFloat(e.target.value))}
                                                className="w-24 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                                            />
                                            <span className="text-sm font-bold text-blue-600 w-10">{threshold.toFixed(2)}</span>
                                        </div>
                                    </div>
                                    <div className="inline-flex items-center px-4 py-2 rounded-lg bg-blue-50 text-blue-700 text-sm w-fit font-medium">
                                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                                        </svg>
                                        {status}
                                    </div>
                                </div>

                                {error && (
                                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                                        <div className="flex items-center text-red-700 text-sm font-medium">
                                            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            {error}
                                        </div>
                                    </div>
                                )}

                                {/* Camera & QR Section */}
                                <div className={`relative rounded-xl overflow-hidden shadow-xl border border-slate-300 min-h-[520px] flex ${detectionMethod === 'qr' ? 'bg-white' : 'bg-slate-900 justify-center'}`}>
                                    {detectionMethod === "qr" ? (
                                        <div className="flex flex-col items-center justify-center p-6 sm:p-10 w-full z-30">
                                            <div className="bg-slate-50 p-4 sm:p-6 rounded-3xl border-2 border-slate-100 shadow-xl mb-6">
                                                <img
                                                    src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(formUrl)}`}
                                                    alt="Attendance QR Code"
                                                    className="w-56 h-56 sm:w-72 sm:h-72"
                                                />
                                            </div>
                                            <div className="text-center max-w-sm">
                                                <h3 className="text-2xl font-bold text-slate-900 mb-2">Scan to Login</h3>
                                                <p className="text-slate-500 text-sm">Scan this QR code using your smartphone to access the attendance form for this event.</p>
                                            </div>
                                            <div className="mt-8 p-4 bg-blue-50 border border-blue-100 rounded-xl text-blue-700 text-xs sm:text-sm font-medium flex items-center gap-2">
                                                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                <span>Students will need to provide their Student Number and Location.</span>
                                            </div>
                                        </div>
                                    ) : !isCameraActive && (
                                        <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 z-20">
                                            <div className="w-20 h-20 rounded-full bg-slate-800 flex items-center justify-center mb-4 border border-slate-700">
                                                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                </svg>
                                            </div>
                                            <p className="text-xl font-bold">Camera is off</p>
                                            <p className="text-sm text-slate-500 mt-2">Click "Open Camera" to start student detection</p>
                                        </div>
                                    )}
                                    <video
                                        ref={videoRef}
                                        className="max-w-full h-auto"
                                        style={{ display: (isCameraActive && detectionMethod === 'face') ? "block" : "none", objectFit: "contain", maxHeight: "70vh", zIndex: 10, transform: "scaleX(-1)" }}
                                        muted
                                        playsInline
                                    />
                                    <div
                                        ref={overlayRef}
                                        className="absolute top-0 left-0 w-full h-full pointer-events-none"
                                        style={{ maxHeight: "70vh", zIndex: 9999 }}
                                    >
                                        {isCameraActive && boxes.map((b, i) => {
                                            const labelText = b.student
                                                ? b.wrongCourse
                                                    ? ` ${b.student.first_name} - Not Included to this Event`
                                                    : b.alreadyAttended
                                                        ? `✓ ${b.student.first_name} - Recorded`
                                                        : b.outsideTimeWindow
                                                            ? ` ${b.student.first_name} - Outside Hours`
                                                            : `${b.student.first_name} (${(b.distance * 100).toFixed(0)}%)`
                                                : b.unregistered
                                                    ? `Unknown (${(b.distance * 100).toFixed(0)}%)`
                                                    : ""
                                            const overlayWidth = overlayRef.current ? overlayRef.current.clientWidth : 0
                                            const overlayHeight = overlayRef.current ? overlayRef.current.clientHeight : 0

                                            const flippedX = overlayWidth - b.x - b.width

                                            const estLabelPadding = 16
                                            const estLabelHeight = 28
                                            const estCharWidth = 8
                                            const estLabelWidth = labelText ? Math.min(overlayWidth, labelText.length * estCharWidth + estLabelPadding) : 0

                                            let labelLeft = flippedX + (b.width - estLabelWidth) / 2
                                            labelLeft = Math.max(4, Math.min(labelLeft, Math.max(4, overlayWidth - estLabelWidth - 4)))

                                            let labelTop = b.y - estLabelHeight - 6
                                            if (labelTop < 0) {
                                                labelTop = b.y + b.height + 6
                                            }
                                            if (labelTop + estLabelHeight > overlayHeight) {
                                                labelTop = Math.max(4, overlayHeight - estLabelHeight - 4)
                                            }

                                            return (
                                                <div
                                                    key={i}
                                                    className="absolute"
                                                    style={{
                                                        left: `${flippedX}px`,
                                                        top: `${b.y}px`,
                                                        width: `${b.width}px`,
                                                        height: `${b.height}px`,
                                                        pointerEvents: "none",
                                                    }}
                                                >
                                                    <div
                                                        className="absolute border-2 rounded-lg"
                                                        style={{
                                                            left: 0,
                                                            top: 0,
                                                            width: "100%",
                                                            height: "100%",
                                                            boxSizing: "border-box",
                                                            borderColor: b.wrongCourse
                                                                ? "#a855f7" // Purple-500
                                                                : b.alreadyAttended
                                                                    ? "#3b82f6"
                                                                    : b.outsideTimeWindow
                                                                        ? "#f59e0b" // Yellow
                                                                        : b.student
                                                                            ? "#22c55e"
                                                                            : b.unregistered
                                                                                ? "#ef4444" // Red
                                                                                : "#ef4444",
                                                            zIndex: 9999,
                                                            pointerEvents: "none",
                                                        }}
                                                    />

                                                    {labelText && (
                                                        <div
                                                            aria-hidden
                                                            style={{
                                                                position: "absolute",
                                                                left: `${labelLeft - b.x}px`,
                                                                top: `${labelTop - b.y}px`,
                                                                background: b.wrongCourse
                                                                    ? "rgba(168,85,247,0.92)"
                                                                    : b.alreadyAttended
                                                                        ? "rgba(59,130,246,0.92)"
                                                                        : b.outsideTimeWindow
                                                                            ? "rgba(245,158,11,0.92)" // Yellow
                                                                            : b.unregistered
                                                                                ? "rgba(239,68,68,0.92)" // Red
                                                                                : "rgba(34,197,94,0.92)",
                                                                color: "#fff",
                                                                padding: "5px 10px",
                                                                fontWeight: 700,
                                                                borderRadius: 6,
                                                                whiteSpace: "nowrap",
                                                                transform: "translateZ(0)",
                                                                boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
                                                                fontSize: "14px",
                                                            }}
                                                        >
                                                            {labelText}
                                                        </div>
                                                    )}
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right Column: Info & Legends (1 col) */}
                        <div className="col-span-1 space-y-4">
                            {/* Legend */}
                            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-lg">
                                <h3 className="text-sm font-bold text-slate-900 uppercase mb-3 border-b border-slate-200 pb-2">Legend</h3>
                                <div className="space-y-3">
                                    <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                                        <div className="w-4 h-4 rounded border-2 border-green-500 flex-shrink-0"></div>
                                        <div className="text-sm">
                                            <p className="font-semibold text-green-700">Green</p>
                                            <p className="text-xs text-green-600">New Attendance</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                                        <div className="w-4 h-4 rounded border-2 border-blue-500 flex-shrink-0"></div>
                                        <div className="text-sm">
                                            <p className="font-semibold text-blue-700">Blue</p>
                                            <p className="text-xs text-blue-600">Already Recorded</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                                        <div className="w-4 h-4 rounded border-2 border-yellow-500 flex-shrink-0"></div>
                                        <div className="text-sm">
                                            <p className="font-semibold text-yellow-700">Yellow</p>
                                            <p className="text-xs text-yellow-600">Outside Hours</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 p-3 bg-red-50 rounded-lg border border-red-200">
                                        <div className="w-4 h-4 rounded border-2 border-red-500 flex-shrink-0"></div>
                                        <div className="text-sm">
                                            <p className="font-semibold text-red-700">Red</p>
                                            <p className="text-xs text-red-600">Not Registered</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
                                        <div className="w-4 h-4 rounded border-2 border-purple-500 flex-shrink-0"></div>
                                        <div className="text-sm">
                                            <p className="font-semibold text-purple-700">Purple</p>
                                            <p className="text-xs text-purple-600">Not Included to this Event</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Student Detected Info */}
                            {currentStudent && (
                                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-lg border-l-4 border-l-green-500">
                                    <div className="flex items-center mb-4">
                                        <svg className="w-7 h-7 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                        </svg>
                                        <h3 className="text-sm font-bold text-slate-900">Detected</h3>
                                    </div>
                                    <div className="grid grid-cols-2 gap-y-4 gap-x-2 text-sm">
                                        <div>
                                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Student ID</p>
                                            <p className="font-bold text-slate-900 truncate">{currentStudent.student_number}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Year Level</p>
                                            <p className="font-bold text-slate-900">{currentSession.type ? `Year ${currentStudent.year_level}` : currentStudent.year_level || "1st Year"}</p>
                                        </div>
                                        <div className="col-span-2 border-t border-slate-100 pt-3">
                                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Student Name</p>
                                            <p className="font-bold text-slate-900 text-base">
                                                {currentStudent.first_name} {currentStudent.last_name}
                                            </p>
                                        </div>
                                        <div className="col-span-2">
                                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Section</p>
                                            <p className="font-bold text-slate-900">
                                                {currentStudent.section_id || "N/A"}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Attendance Success Dialog */}
            <Dialog open={showDialog} onOpenChange={setShowDialog}>
                <DialogContent className={multipleDetections.length > 1 ? "sm:max-w-2xl" : "sm:max-w-md"}>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {multipleDetections.length > 1
                                ? `${multipleDetections.length} Students Detected`
                                : "Attendance Recorded"}
                        </DialogTitle>
                    </DialogHeader>
                    {multipleDetections.length > 1 ? (
                        <div className="space-y-4">
                            <p className="text-sm text-gray-600 font-medium">
                                The following students have been recorded:
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto">
                                {multipleDetections.map((detection, idx) => (
                                    <div key={idx} className="bg-green-50 rounded-lg p-4 border border-green-200">
                                        <div className="mb-2">
                                            <p className="text-xs text-gray-600">Name</p>
                                            <p className="font-semibold text-gray-900">{detection.name}</p>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <p className="text-xs text-gray-600">Status</p>
                                                <p className="text-sm font-medium text-blue-600">{detection.status}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-600">Time</p>
                                                <p className="text-sm font-medium text-purple-600">{detection.time}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : attendanceMessage ? (
                        <div className="space-y-4">
                            <div className="bg-green-50 rounded-lg p-4">
                                <p className="text-sm text-gray-600">Student Name</p>
                                <p className="text-lg font-bold text-gray-900">{attendanceMessage.name}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-blue-50 rounded-lg p-4">
                                    <p className="text-sm text-gray-600">Status</p>
                                    <p className="text-lg font-bold text-blue-600">{attendanceMessage.status}</p>
                                </div>
                                <div className="bg-purple-50 rounded-lg p-4">
                                    <p className="text-sm text-gray-600">Time</p>
                                    <p className="text-lg font-bold text-purple-600">{attendanceMessage.time}</p>
                                </div>
                            </div>
                        </div>
                    ) : null}
                </DialogContent>
            </Dialog>
        </div>

    )
}
