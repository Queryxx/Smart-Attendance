"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import * as faceapi from "face-api.js"

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
    face_encoding?: number[]
    photo?: string
}

interface Course {
    id?: string
    course_name: string
}

interface Section {
    id: string
    section_name: string
    course_id: string
}

export function StudentForm({
    student,
    onSave,
    onCancel,
}: { student?: Student; onSave: () => void; onCancel: () => void }) {
    const router = useRouter()
    const [formData, setFormData] = useState<Student>({
        student_number: student?.student_number ?? "",
        first_name: student?.first_name ?? "",
        last_name: student?.last_name ?? "",
        email: student?.email ?? "",
        qr_code: student?.qr_code ?? "",
        year_level: student?.year_level ?? undefined,
        course_id: student?.course_id ?? "",
        section_id: student?.section_id ?? "",
        id: student?.id,
        face_encoding: student?.face_encoding,
        photo: student?.photo,
    })
    const [courses, setCourses] = useState<Course[]>([])
    const [sections, setSections] = useState<Section[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")
    const [modelsLoaded, setModelsLoaded] = useState(false)
    const [cameraOpen, setCameraOpen] = useState(false)
    const [photoTaken, setPhotoTaken] = useState(false)
    const [cameraStatus, setCameraStatus] = useState("Load camera and take a snapshot")
    const [useUpload, setUseUpload] = useState(false)
    const [registrationProgress, setRegistrationProgress] = useState(0)
    const [isRegistering, setIsRegistering] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const videoRef = useRef<HTMLVideoElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)

    useEffect(() => {
        fetchCourses()
        loadFaceModels()
    }, [])

    useEffect(() => {
        setFormData({
            student_number: student?.student_number ?? "",
            first_name: student?.first_name ?? "",
            last_name: student?.last_name ?? "",
            email: student?.email ?? "",
            qr_code: student?.qr_code ?? "",
            year_level: student?.year_level ?? undefined,
            course_id: student?.course_id ?? "",
            section_id: student?.section_id ?? "",
            id: student?.id,
            face_encoding: student?.face_encoding,
            photo: student?.photo,
        })
    }, [student])

    useEffect(() => {
        if (formData.course_id) {
            fetchSections(formData.course_id)
        } else {
            setSections([])
        }
    }, [formData.course_id])

    async function loadFaceModels() {
        try {
            const MODEL_URL = "/models"
            await Promise.all([
                faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
                faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
                faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
            ])
            setModelsLoaded(true)
        } catch (err) {
            console.error("Error loading face models:", err)
            setError("Failed to load face recognition models")
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

    async function fetchSections(courseId: string) {
        try {
            const response = await fetch(`/api/sections?course_id=${courseId}`)
            const data = await response.json()
            setSections(data)
        } catch (error) {
            console.error("Error fetching sections:", error)
        }
    }

    async function openCamera() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } })
            if (videoRef.current) {
                videoRef.current.srcObject = stream
                await videoRef.current.play()
                setCameraOpen(true)
                setCameraStatus("Camera opened. Position your face and click 'Capture & Register'")
            }
        } catch (err) {
            setError("Failed to open camera. Please check permissions.")
            console.error("Camera error:", err)
        }
    }

    async function takeSnapshotAndRegister() {
        setIsRegistering(true)
        setRegistrationProgress(10)
        setCameraStatus("Processing...")

        try {
            // Validate required fields
            if (!formData.first_name.trim()) {
                setCameraStatus("First name is required")
                return
            }
            if (!formData.last_name.trim()) {
                setCameraStatus("Last name is required")
                return
            }
            if (!formData.student_number.trim()) {
                setCameraStatus("Student number is required")
                return
            }

            // Check if video is ready
            if (!videoRef.current || !videoRef.current.srcObject) {
                setCameraStatus("Please open the camera first")
                return
            }

            const video = videoRef.current
            const canvas = canvasRef.current
            if (!canvas) {
                setCameraStatus("Canvas not available")
                return
            }

            const ctx = canvas.getContext("2d", { willReadFrequently: true })
            if (!ctx) {
                setCameraStatus("Failed to get canvas context")
                return
            }

            canvas.width = video.videoWidth
            canvas.height = video.videoHeight
            // Flip canvas horizontally for natural display
            ctx.save()
            ctx.scale(-1, 1)
            ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height)
            ctx.restore()

            // Get face descriptor with proper error handling
            setRegistrationProgress(30)
            setCameraStatus("Detecting face...")

            const detection = await faceapi.detectSingleFace(canvas).withFaceLandmarks().withFaceDescriptor()

            if (!detection) {
                setRegistrationProgress(0)
                setIsRegistering(false)
                setCameraStatus("No face detected. Please try again with clear lighting.")
                return
            }

            // Convert Float32Array to regular array
            const face_encoding = Array.from(detection.descriptor)
            console.log("Face encoding captured, length:", face_encoding.length)
            console.log("Sample values:", face_encoding.slice(0, 5))

            // Validate face encoding
            if (!face_encoding || face_encoding.length !== 128) {
                setRegistrationProgress(0)
                setIsRegistering(false)
                setCameraStatus(`Face encoding failed. Expected 128 data points, got ${face_encoding?.length || 0}. Please try again.`)
                return
            }

            // Convert canvas to base64 for photo storage
            setRegistrationProgress(70)
            const photo = canvas.toDataURL("image/jpeg", 0.9)

            // Update form data with face encoding and photo
            setFormData((prev) => {
                const updated = {
                    ...prev,
                    face_encoding,
                    photo,
                }
                console.log("Updated formData with face_encoding:", updated.face_encoding?.length)
                return updated
            })

            setRegistrationProgress(100)
            setPhotoTaken(true)
            setCameraStatus("Face captured successfully! Click 'Save Student' to complete registration.")
            setTimeout(() => {
                setIsRegistering(false)
                setRegistrationProgress(0)
            }, 1000)

            // Close camera
            const stream = video.srcObject as MediaStream
            const tracks = stream.getTracks()
            tracks.forEach((track) => track.stop())
            setCameraOpen(false)
        } catch (err) {
            console.error("Snapshot error:", err)
            setRegistrationProgress(0)
            setIsRegistering(false)
            setCameraStatus(err instanceof Error ? err.message : "Failed to capture snapshot")
        }
    }

    async function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0]
        if (!file) return

        setIsRegistering(true)
        setRegistrationProgress(10)
        setCameraStatus("Processing uploaded image...")

        try {
            // Validate required fields
            if (!formData?.first_name?.trim()) {
                setCameraStatus("First name is required")
                return
            }
            if (!formData?.last_name?.trim()) {
                setCameraStatus("Last name is required")
                return
            }
            if (!formData?.student_number?.trim()) {
                setCameraStatus("Student number is required")
                return
            }

            // Read file as data URL using Promise
            const dataUrl = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader()
                reader.onload = (e) => resolve(e.target?.result as string)
                reader.onerror = () => reject(new Error("Failed to read file"))
                reader.readAsDataURL(file)
            })

            // Load image and wait for it to load
            const img = await new Promise<HTMLImageElement>((resolve, reject) => {
                const image = new Image()
                image.onload = () => resolve(image)
                image.onerror = () => reject(new Error("Failed to load image"))
                image.src = dataUrl
            })

            setCameraStatus("Detecting face in image...")

            // Draw image to canvas with normalized size (same as video capture)
            const canvas = canvasRef.current
            if (!canvas) {
                setCameraStatus("Canvas not available")
                return
            }

            const ctx = canvas.getContext("2d", { willReadFrequently: true })
            if (!ctx) {
                setCameraStatus("Failed to get canvas context")
                return
            }

            // Normalize to camera dimensions (640x480) for consistent face detection
            const MAX_WIDTH = 640
            const MAX_HEIGHT = 480

            let width = img.width
            let height = img.height

            // Calculate aspect ratio and scale to fit within bounds while maintaining ratio
            const imgAspect = width / height
            const boxAspect = MAX_WIDTH / MAX_HEIGHT

            let scaledWidth: number
            let scaledHeight: number

            if (imgAspect > boxAspect) {
                // Image is wider - scale by width
                scaledWidth = MAX_WIDTH
                scaledHeight = Math.floor(MAX_WIDTH / imgAspect)
            } else {
                // Image is taller - scale by height
                scaledHeight = MAX_HEIGHT
                scaledWidth = Math.floor(MAX_HEIGHT * imgAspect)
            }

            // Use letterboxing: center the image in 640x480 canvas with gray background
            canvas.width = MAX_WIDTH
            canvas.height = MAX_HEIGHT
            ctx.fillStyle = "#808080" // Gray background for consistent padding
            ctx.fillRect(0, 0, MAX_WIDTH, MAX_HEIGHT)

            // Center the scaled image
            const offsetX = (MAX_WIDTH - scaledWidth) / 2
            const offsetY = (MAX_HEIGHT - scaledHeight) / 2
            ctx.drawImage(img, offsetX, offsetY, scaledWidth, scaledHeight)

            console.log("Canvas dimensions:", canvas.width, "x", canvas.height, "| Image scaled to:", scaledWidth, "x", scaledHeight)

            // Get face descriptor with proper error handling
            setRegistrationProgress(40)
            setCameraStatus("Detecting face in image...")
            const detection = await faceapi.detectSingleFace(canvas).withFaceLandmarks().withFaceDescriptor()

            if (!detection) {
                setRegistrationProgress(0)
                setIsRegistering(false)
                setCameraStatus("No face detected in the uploaded image. Please try another photo.")
                if (fileInputRef.current) fileInputRef.current.value = ""
                return
            }

            // Convert Float32Array to regular array
            const face_encoding = Array.from(detection.descriptor)
            console.log("Face encoding from upload, length:", face_encoding.length)
            console.log("Sample values:", face_encoding.slice(0, 5))

            // Validate face encoding
            if (!face_encoding || face_encoding.length !== 128) {
                setRegistrationProgress(0)
                setIsRegistering(false)
                setCameraStatus(`Face encoding failed. Expected 128 data points, got ${face_encoding?.length || 0}. Please try another photo.`)
                if (fileInputRef.current) fileInputRef.current.value = ""
                return
            }

            // Convert canvas to base64 for photo storage
            setRegistrationProgress(70)
            const photo = canvas.toDataURL("image/jpeg", 0.9)

            // Update form data with face encoding and photo
            setFormData((prev) => {
                const updated = {
                    ...prev,
                    face_encoding,
                    photo,
                }
                console.log("Updated formData with face_encoding from upload:", updated.face_encoding?.length)
                return updated
            })

            setRegistrationProgress(100)
            setPhotoTaken(true)
            setCameraStatus("Face captured successfully! Click 'Save Student' to complete registration.")
            setTimeout(() => {
                setIsRegistering(false)
                setRegistrationProgress(0)
            }, 1000)
        } catch (err) {
            console.error("Upload error:", err)
            setRegistrationProgress(0)
            setIsRegistering(false)
            setCameraStatus(err instanceof Error ? err.message : "Failed to process upload")
            if (fileInputRef.current) fileInputRef.current.value = ""
        }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setError("")

        // Validate required fields
        if (!formData.first_name.trim()) {
            setError("First name is required")
            return
        }
        if (!formData.last_name.trim()) {
            setError("Last name is required")
            return
        }
        if (!formData.student_number.trim()) {
            setError("Student number is required")
            return
        }

        setLoading(true)

        try {
            const method = formData.id ? "PUT" : "POST"
            const url = formData.id ? `/api/students/${formData.id}` : "/api/students"

            const payload = {
                first_name: formData.first_name.trim(),
                last_name: formData.last_name.trim(),
                email: formData.email?.trim(),
                qr_code: formData.qr_code?.trim() || null,
                student_number: formData.student_number.trim(),
                year_level: formData.year_level ? parseInt(formData.year_level.toString(), 10) : null,
                course_id: formData.course_id ? parseInt(formData.course_id, 10) : null,
                section_id: formData.section_id ? parseInt(formData.section_id, 10) : null,
                face_encoding: formData.face_encoding ? JSON.stringify(formData.face_encoding) : null,
                photo: formData.photo || null,
            }

            console.log("Submitting student with face_encoding:", payload.face_encoding ? "Yes" : "No", payload.face_encoding ? payload.face_encoding.length : 0)
            console.log("Full payload:", payload)

            const response = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            })

            if (!response.ok) {
                const data = await response.json()
                // Handle duplicate student number error
                if (data.message && data.message.includes("duplicate")) {
                    setError(`Student number "${formData.student_number}" already exists in the database. Please use a different student number.`)
                } else {
                    setError(data.message || "Operation failed")
                }
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

    return (
        <Card>
            <CardHeader>
                <CardTitle>{formData.id ? "Edit Student" : "Add New Student"}</CardTitle>
                <CardDescription>Enter student information and capture face for recognition</CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && <div className="p-3 bg-red-100 text-red-700 rounded-md text-sm">{error}</div>}

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="first_name">First Name *</Label>
                            <Input
                                id="first_name"
                                value={formData.first_name}
                                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                                required
                            />
                        </div>
                        <div>
                            <Label htmlFor="last_name">Last Name *</Label>
                            <Input
                                id="last_name"
                                value={formData.last_name}
                                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                                required
                            />
                        </div>
                        <div>
                            <Label htmlFor="student_number">Student Number *</Label>
                            <Input
                                id="student_number"
                                value={formData.student_number}
                                onChange={(e) => setFormData({ ...formData, student_number: e.target.value })}
                                required
                            />
                        </div>
                        <div>
                            <Label htmlFor="email">Email *</Label>
                            <Input
                                id="email"
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                required
                            />
                        </div>
                        <div>
                            <Label htmlFor="year_level">Year Level</Label>
                            <select
                                id="year_level"
                                value={formData.year_level?.toString() || ""}
                                onChange={(e) => setFormData({ ...formData, year_level: e.target.value ? parseInt(e.target.value) : undefined })}
                                className="w-full border border-input rounded-md px-3 py-2 text-sm"
                            >
                                <option value="">Select year level</option>
                                <option value="1">1</option>
                                <option value="2">2</option>
                                <option value="3">3</option>
                                <option value="4">4</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="course">Course</Label>
                            <select
                                id="course"
                                value={formData.course_id || ""}
                                onChange={(e) => setFormData({ ...formData, course_id: e.target.value, section_id: "" })}
                                className="w-full border border-input rounded-md px-3 py-2 text-sm"
                            >
                                <option value="">Select a course</option>
                                {courses.map((course) => (
                                    <option key={course.id} value={course.id}>
                                        {course.course_name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <Label htmlFor="section">Section</Label>
                            <select
                                id="section"
                                value={formData.section_id || ""}
                                onChange={(e) => setFormData({ ...formData, section_id: e.target.value })}
                                disabled={!formData.course_id}
                                className="w-full border border-input rounded-md px-3 py-2 text-sm disabled:opacity-50"
                            >
                                <option value="">Select a section</option>
                                {sections.map((section) => (
                                    <option key={section.id} value={section.id}>
                                        {section.section_name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Face Recognition Section */}
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <Label className="text-base font-semibold mb-4 block">Face Recognition (Optional)</Label>

                        {/* Mode Toggle - Segmented Buttons */}
                        <div className="flex rounded-lg border border-gray-300 overflow-hidden mb-4">
                            <button
                                type="button"
                                onClick={() => { setUseUpload(false); if (!photoTaken) setCameraStatus("Load camera and take a snapshot") }}
                                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors ${!useUpload
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-white text-gray-600 hover:bg-gray-100"
                                    }`}
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                                Camera Capture
                            </button>
                            <button
                                type="button"
                                onClick={() => { setUseUpload(true); if (!photoTaken) setCameraStatus("Select a photo to upload") }}
                                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-l border-gray-300 ${useUpload
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-white text-gray-600 hover:bg-gray-100"
                                    }`}
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                Upload Photo
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            {/* Left: Camera or Upload Preview */}
                            <div>
                                {photoTaken ? (
                                    <div className="relative rounded-lg overflow-hidden shadow-md aspect-square">
                                        {formData.photo && <img src={formData.photo} alt="Captured face" className="w-full h-full object-cover" />}
                                    </div>
                                ) : useUpload ? (
                                    <div className="relative rounded-lg overflow-hidden shadow-md bg-slate-100 aspect-square flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-300">
                                        <div className="w-16 h-16 rounded-full bg-slate-200 flex items-center justify-center mb-4 text-slate-500">
                                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                            </svg>
                                        </div>
                                        <p className="text-slate-600 text-center text-sm font-medium">Click "Select Photo" below to upload</p>
                                        <p className="text-slate-400 text-center text-xs mt-2">Support JPG, PNG</p>
                                        <canvas ref={canvasRef} className="hidden" />
                                    </div>
                                ) : (
                                    <div className="relative rounded-lg overflow-hidden shadow-md bg-slate-900 aspect-square flex items-center justify-center">
                                        {!cameraOpen && (
                                            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 z-20 bg-slate-900">
                                                <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mb-4 border border-slate-700">
                                                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                    </svg>
                                                </div>
                                                <p className="text-lg font-bold">Camera is off</p>
                                                <p className="text-xs text-slate-500 mt-2">Click "Open Camera" to capture face</p>
                                            </div>
                                        )}
                                        <video
                                            ref={videoRef}
                                            className="w-full h-full object-cover"
                                            style={{ display: cameraOpen ? "block" : "none", transform: "scaleX(-1)" }}
                                        />
                                        <canvas ref={canvasRef} className="absolute inset-0 hidden" />
                                    </div>
                                )}
                            </div>

                            {/* Right: Status & Controls */}
                            <div className="flex flex-col gap-4">
                                <div className="bg-blue-50 rounded-lg p-6 border border-blue-200 flex-1 flex flex-col justify-center">
                                    <p className="text-center text-lg text-blue-700 font-semibold mb-4">{cameraStatus}</p>
                                    {isRegistering && registrationProgress > 0 && (
                                        <div className="space-y-2">
                                            <Progress value={registrationProgress} className="w-full h-2" />
                                            <p className="text-center text-xs text-blue-600 font-medium">{registrationProgress}% complete</p>
                                        </div>
                                    )}
                                </div>

                                {photoTaken && (
                                    <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                                        <p className="text-sm text-green-700 font-medium flex items-center gap-2">
                                            <span className="text-lg">✓</span> Face captured successfully
                                        </p>
                                    </div>
                                )}

                                <div className="flex flex-col gap-2">
                                    {useUpload ? (
                                        <>
                                            <input
                                                ref={fileInputRef}
                                                type="file"
                                                accept="image/*"
                                                onChange={handleFileUpload}
                                                className="hidden"
                                            />
                                            <Button
                                                type="button"
                                                disabled={!modelsLoaded || photoTaken || !formData.first_name.trim() || !formData.last_name.trim() || !formData.student_number.trim()}
                                                onClick={() => fileInputRef.current?.click()}
                                                className="w-full"
                                                variant="outline"
                                            >
                                                Select Photo
                                            </Button>
                                        </>
                                    ) : (
                                        <>
                                            <Button
                                                type="button"
                                                disabled={!modelsLoaded || photoTaken || !formData.first_name.trim() || !formData.last_name.trim() || !formData.student_number.trim()}
                                                onClick={openCamera}
                                                className="w-full"
                                                variant="outline"
                                            >
                                                {cameraOpen ? "Camera Open" : "Open Camera"}
                                            </Button>
                                            <Button
                                                type="button"
                                                disabled={!modelsLoaded || !cameraOpen || photoTaken || isRegistering}
                                                onClick={takeSnapshotAndRegister}
                                                className="w-full"
                                                variant="secondary"
                                            >
                                                {isRegistering ? "Capturing..." : "Capture Face"}
                                            </Button>
                                        </>
                                    )}
                                </div>

                                {photoTaken && (
                                    <Button
                                        type="button"
                                        onClick={() => {
                                            setPhotoTaken(false)
                                            setRegistrationProgress(0)
                                            setIsRegistering(false)
                                            setCameraStatus("Load camera and take a snapshot")
                                            setFormData((prev) => ({
                                                ...prev,
                                                face_encoding: undefined,
                                                photo: undefined,
                                            }))
                                        }}
                                        variant="outline"
                                        className="w-full"
                                    >
                                        Retake
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-4 pt-4">
                        <Button type="submit" disabled={loading}>
                            {loading ? "Saving..." : "Save Student"}
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
