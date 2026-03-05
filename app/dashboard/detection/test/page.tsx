"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import * as faceapi from "face-api.js"

interface DetectedStudent {
    id: number
    first_name: string
    last_name: string
    student_number: string
    distance: number
    confidence: number
}

export default function FaceRecognitionTest() {
    const router = useRouter()
    const videoRef = useRef<HTMLVideoElement>(null)
    const overlayRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const streamRef = useRef<MediaStream | null>(null)

    const [modelsLoaded, setModelsLoaded] = useState(false)
    const [cameraOpen, setCameraOpen] = useState(false)
    const [status, setStatus] = useState("Loading face recognition models...")
    const [detectedStudents, setDetectedStudents] = useState<DetectedStudent[]>([])
    const [frameCount, setFrameCount] = useState(0)
    const [fps, setFps] = useState(0)
    const [isAuthorized, setIsAuthorized] = useState(false)
    const [authLoading, setAuthLoading] = useState(true)
    const [threshold, setThreshold] = useState(0.4)
    const detectionActiveRef = useRef<boolean>(false)

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
        const loadModels = async () => {
            try {
                const MODEL_URL = "/models"
                console.log("Loading models from:", MODEL_URL)
                await Promise.all([
                    faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
                    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
                    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
                ])
                console.log("✅ All models loaded successfully")
                setModelsLoaded(true)
                setStatus("Ready to test. Click 'Start Camera' to begin.")
            } catch (error) {
                console.error("Failed to load models:", error)
                setStatus("Error loading models. Please refresh and try again.")
            }
        }

        loadModels()

        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach((track) => track.stop())
            }
        }
    }, [])

    const openCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { min: 640, ideal: 1280, max: 1920 },
                    height: { min: 480, ideal: 720, max: 1080 },
                    facingMode: "user",
                },
            })

            streamRef.current = stream
            const video = videoRef.current
            if (!video) throw new Error("Video element not found")

            video.srcObject = stream
            video.setAttribute("playsinline", "true")

            await new Promise<void>((resolve) => {
                if (video.onloadedmetadata === null) {
                    video.onloadedmetadata = () => resolve()
                }
            })

            await video.play()
            setCameraOpen(true)
            setStatus("Camera started. Testing face recognition...")
            startDetection()
        } catch (error) {
            console.error("Camera error:", error)
            setStatus("Failed to access camera. Please check permissions.")
        }
    }

    const startDetection = async () => {
        try {
            const response = await fetch("/api/students")
            const students = await response.json()

            const labeled = students
                .filter((student: any) => student.face_encoding)
                .map((student: any) => {
                    try {
                        const parsed = JSON.parse(student.face_encoding)
                        if (Array.isArray(parsed) && parsed.length === 128) {
                            const descriptor = new Float32Array(parsed)
                            return new faceapi.LabeledFaceDescriptors(String(student.id), [descriptor])
                        }
                        console.warn(`Skipping student ${student.id} - Invalid encoding length: ${parsed?.length}`)
                        return null
                    } catch (e) {
                        return null
                    }
                })
                .filter((item: any): item is faceapi.LabeledFaceDescriptors => item !== null)

            const matcher = labeled.length > 0 ? new faceapi.FaceMatcher(labeled, threshold) : null

            const video = videoRef.current
            const overlay = overlayRef.current
            if (!video || !overlay) throw new Error("Video or overlay element not found")

            detectionActiveRef.current = true
            let frameCounter = 0
            const startTime = Date.now()

            const detectFaces = async (): Promise<void> => {
                if (!detectionActiveRef.current) return

                try {
                    frameCounter++
                    setFrameCount(frameCounter)

                    // Calculate FPS every 30 frames
                    if (frameCounter % 30 === 0) {
                        const elapsed = (Date.now() - startTime) / 1000
                        const calculatedFps = Math.round(frameCounter / elapsed)
                        setFps(calculatedFps)
                    }

                    if (video.readyState < 2) {
                        requestAnimationFrame(() => detectFaces())
                        return
                    }

                    const videoWidth = video.videoWidth
                    const videoHeight = video.videoHeight
                    if (videoWidth > 0 && videoHeight > 0) {
                        const rect = video.getBoundingClientRect()
                        const displayWidth = rect.width
                        const displayHeight = rect.height

                        const detections = await faceapi
                            .detectAllFaces(video, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.3 }))
                            .withFaceLandmarks()
                            .withFaceDescriptors()

                        const scaleX = displayWidth / videoWidth
                        const scaleY = displayHeight / videoHeight

                        const detectedList: DetectedStudent[] = []
                        let overlayHTML = ""

                        detections.forEach((d: any) => {
                            const b = d.detection.box
                            const x = b.x * scaleX
                            const y = b.y * scaleY
                            const width = b.width * scaleX
                            const height = b.height * scaleY

                            // Flip X coordinate to match the mirrored video (scaleX(-1))
                            const flippedX = displayWidth - x - width

                            if (!matcher) {
                                overlayHTML += `
                  <div style="position: absolute; left: ${flippedX}px; top: ${y}px; width: ${width}px; height: ${height}px; border: 3px solid red; border-radius: 4px;">
                    <div style="position: absolute; top: -25px; left: 0; background: red; color: white; padding: 2px 8px; font-size: 12px; font-weight: bold; border-radius: 3px;">
                      No registered students
                    </div>
                  </div>
                `
                                return
                            }

                            const best = matcher.findBestMatch(d.descriptor)
                            const student = students.find((s: any) => String(s.id) === best.label)

                            const confidence = Math.max(0, 100 - best.distance * 100)
                            const isMatched = best.distance < threshold

                            if (student && isMatched) {
                                detectedList.push({
                                    id: student.id,
                                    first_name: student.first_name,
                                    last_name: student.last_name,
                                    student_number: student.student_number,
                                    distance: parseFloat(best.distance.toFixed(3)),
                                    confidence: parseFloat(confidence.toFixed(1)),
                                })

                                overlayHTML += `
                  <div style="position: absolute; left: ${flippedX}px; top: ${y}px; width: ${width}px; height: ${height}px; border: 3px solid #22c55e; border-radius: 4px;">
                    <div style="position: absolute; top: -55px; left: 0; background: #22c55e; color: white; padding: 4px 8px; font-size: 12px; font-weight: bold; border-radius: 3px; white-space: nowrap;">
                      ✓ ${student.first_name} ${student.last_name}
                    </div>
                    <div style="position: absolute; top: -30px; left: 0; background: rgba(34, 197, 94, 0.7); color: white; padding: 2px 6px; font-size: 11px; border-radius: 2px;">
                      ${confidence.toFixed(1)}% match
                    </div>
                  </div>
                `
                            } else {
                                overlayHTML += `
                  <div style="position: absolute; left: ${flippedX}px; top: ${y}px; width: ${width}px; height: ${height}px; border: 3px solid orange; border-radius: 4px;">
                    <div style="position: absolute; top: -25px; left: 0; background: orange; color: white; padding: 2px 8px; font-size: 12px; font-weight: bold; border-radius: 3px;">
                      ? Unknown (${confidence.toFixed(1)}%)
                    </div>
                  </div>
                `
                            }
                        })

                        overlay.innerHTML = overlayHTML
                        setDetectedStudents(detectedList)
                    }

                    if (detectionActiveRef.current) {
                        requestAnimationFrame(() => detectFaces())
                    }
                } catch (error) {
                    console.error("Detection frame error:", error)
                    if (detectionActiveRef.current) {
                        requestAnimationFrame(() => detectFaces())
                    }
                }
            }

            detectFaces()
        } catch (error) {
            console.error("startDetection error:", error)
            setStatus("Failed to start detection")
        }
    }

    const stopCamera = () => {
        detectionActiveRef.current = false
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop())
            streamRef.current = null
        }
        const video = videoRef.current
        if (video) video.srcObject = null
        setCameraOpen(false)
        setDetectedStudents([])
        setStatus("Camera stopped")
    }

    if (authLoading) {
        return <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center"><div>Loading...</div></div>
    }

    if (!isAuthorized) {
        return null
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
            {/* Header */}
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
                        <h1 className="text-2xl font-bold text-slate-900">Face Recognition Test</h1>
                        <p className="text-sm text-slate-500">Test face detection and recognition</p>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="p-6">
                <div className="max-w-6xl mx-auto">
                    <div className="grid grid-cols-3 gap-6">
                        {/* Camera (2 cols) */}
                        <div className="col-span-2">
                            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-lg">
                                {/* Controls */}
                                <div className="flex gap-3 mb-4">
                                    <Button
                                        onClick={openCamera}
                                        disabled={!modelsLoaded || cameraOpen}
                                        className="bg-blue-600 hover:bg-blue-700 text-white"
                                    >
                                        {cameraOpen ? "Camera Running" : "Start Camera"}
                                    </Button>
                                    <Button
                                        onClick={stopCamera}
                                        disabled={!cameraOpen}
                                        variant="outline"
                                        className="text-red-600 border-red-200 hover:bg-red-50"
                                    >
                                        Stop Camera
                                    </Button>
                                </div>

                                {/* Status */}
                                <div className="mb-4 p-3 rounded-lg bg-blue-50 border border-blue-200">
                                    <p className="text-sm text-blue-700 font-medium">{status}</p>
                                    {cameraOpen && (
                                        <p className="text-xs text-blue-600 mt-1">
                                            Frames: {frameCount} | FPS: {fps} | Detected: {detectedStudents.length} face(s)
                                        </p>
                                    )}
                                </div>

                                {/* Threshold Control */}
                                <div className="mb-4 p-4 rounded-lg bg-slate-50 border border-slate-200">
                                    <label className="text-sm font-medium text-slate-700 block mb-2">
                                        Recognition Threshold: {threshold.toFixed(2)}
                                    </label>
                                    <input
                                        type="range"
                                        min="0"
                                        max="1"
                                        step="0.05"
                                        value={threshold}
                                        onChange={(e) => setThreshold(parseFloat(e.target.value))}
                                        disabled={cameraOpen}
                                        className="w-full"
                                    />
                                    <p className="text-xs text-slate-500 mt-1">Lower = stricter matching, Higher = more permissive</p>
                                </div>

                                {/* Camera */}
                                <div className="relative rounded-xl overflow-hidden shadow-xl bg-black border border-slate-300" style={{ minHeight: "400px" }}>
                                    {!cameraOpen && (
                                        <div className="absolute inset-0 bg-black flex flex-col items-center justify-center z-10">
                                            <svg className="w-16 h-16 text-slate-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                            </svg>
                                            <p className="text-slate-400 text-lg font-semibold">Camera is off</p>
                                            <p className="text-slate-500 text-sm mt-1">Click "Start Camera" to begin</p>
                                        </div>
                                    )}
                                    <video
                                        ref={videoRef}
                                        className="w-full h-auto"
                                        style={{ display: cameraOpen ? "block" : "none", objectFit: "contain", maxHeight: "500px", transform: "scaleX(-1)" }}
                                        muted
                                        playsInline
                                    />
                                    <div
                                        ref={overlayRef}
                                        className="absolute top-0 left-0 w-full h-full pointer-events-none"
                                        style={{ maxHeight: "500px" }}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Sidebar (1 col) */}
                        <div className="col-span-1 space-y-4">
                            {/* Legend */}
                            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-lg">
                                <h3 className="text-sm font-bold text-slate-900 uppercase mb-3 pb-2 border-b border-slate-200">
                                    Legend
                                </h3>
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 p-2 bg-green-50 rounded">
                                        <div className="w-3 h-3 rounded" style={{ border: "2px solid #22c55e" }} />
                                        <span className="text-xs text-slate-700">Recognized Student</span>
                                    </div>
                                    <div className="flex items-center gap-2 p-2 bg-orange-50 rounded">
                                        <div className="w-3 h-3 rounded" style={{ border: "2px solid orange" }} />
                                        <span className="text-xs text-slate-700">Unknown Face</span>
                                    </div>
                                    <div className="flex items-center gap-2 p-2 bg-red-50 rounded">
                                        <div className="w-3 h-3 rounded" style={{ border: "2px solid red" }} />
                                        <span className="text-xs text-slate-700">No Registered Data</span>
                                    </div>
                                </div>
                            </div>

                            {/* Detected Students */}
                            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-lg">
                                <h3 className="text-sm font-bold text-slate-900 uppercase mb-3 pb-2 border-b border-slate-200">
                                    Detected Students
                                </h3>
                                {detectedStudents.length > 0 ? (
                                    <div className="space-y-2 max-h-96 overflow-y-auto">
                                        {detectedStudents.map((student, idx) => (
                                            <div key={idx} className="p-3 bg-green-50 rounded-lg border border-green-200">
                                                <p className="text-sm font-semibold text-slate-900">
                                                    {student.first_name} {student.last_name}
                                                </p>
                                                <p className="text-xs text-slate-600">{student.student_number}</p>
                                                <div className="flex justify-between mt-2">
                                                    <span className="text-xs font-medium text-green-700">
                                                        {student.confidence.toFixed(1)}% match
                                                    </span>
                                                    <span className="text-xs text-slate-500">
                                                        Distance: {student.distance.toFixed(3)}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-slate-500 text-center py-4">No faces detected</p>
                                )}
                            </div>

                            {/* Info */}
                            <div className="bg-blue-50 rounded-2xl p-4 border border-blue-200">
                                <p className="text-xs text-blue-700 leading-relaxed">
                                    <strong>Tip:</strong> Adjust the threshold to fine-tune recognition accuracy. Start with 0.4 for standard recognition.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
