"use client"

import { useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Loader2, User, Mail, GraduationCap, Hash, Layout, UserCheck, UserX, Upload, QrCode } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import Script from "next/script"

declare global {
    interface Window {
        jsQR: any;
    }
}

interface Student {
    id: string
    student_number: string
    first_name: string
    last_name: string
    email: string
    qr_code: string
    year_level: number
    course_name: string
    section_name: string
    photo: string | null
    face_encoding: string | null
}

export default function StudentQRDetailsPage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const qrData = searchParams.get("data")
    const [qrCodeData, setQrCodeData] = useState<string | null>(null)
    const [student, setStudent] = useState<Student | null>(null)
    const [loading, setLoading] = useState(false)
    const [isScanning, setIsScanning] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (qrData && !qrCodeData) {
            setQrCodeData(qrData)
        }
    }, [qrData, qrCodeData])

    useEffect(() => {
        if (qrCodeData) {
            fetchStudentDetails(qrCodeData)
        } else {
            setLoading(false)
            setStudent(null)
        }
    }, [qrCodeData])

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setIsScanning(true)
        setError(null)

        try {
            const reader = new FileReader()
            reader.onload = async (event) => {
                const img = new Image()
                img.onload = () => {
                    const canvas = document.createElement("canvas")
                    const context = canvas.getContext("2d")
                    if (!context) return

                    canvas.width = img.width
                    canvas.height = img.height
                    context.drawImage(img, 0, 0)

                    const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
                    if (window.jsQR) {
                        const code = window.jsQR(imageData.data, imageData.width, imageData.height, {
                            inversionAttempts: "dontInvert",
                        })

                        if (code) {
                            // Extract data from URL if it's a link
                            let value = code.data
                            if (value.includes("?data=")) {
                                value = value.split("?data=")[1]
                            }
                            setQrCodeData(value)
                        } else {
                            setError("No QR code found in this image. Please ensure the QR code is clear and visible.")
                        }
                    } else {
                        setError("QR Scanner engine not loaded. Please wait a moment and try again.")
                    }
                    setIsScanning(false)
                }
                img.src = event.target?.result as string
            }
            reader.readAsDataURL(file)
        } catch (err) {
            console.error("Scan error:", err)
            setError("Failed to process the image.")
            setIsScanning(false)
        }
    }

    async function fetchStudentDetails(code: string) {
        try {
            setLoading(true)
            const response = await fetch(`/api/students/qr/${code}`)

            if (!response.ok) {
                const data = await response.json()
                throw new Error(data.message || "Failed to fetch student details")
            }

            const data = await response.json()
            setStudent(data)
            setError(null)
        } catch (err: any) {
            console.error("Error:", err)
            setError(err.message)
            setStudent(null)
        } finally {
            setLoading(false)
        }
    }

    const renderContent = () => {
        if (loading || isScanning) {
            return (
                <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                    <p className="text-muted-foreground animate-pulse">
                        {isScanning ? "Scanning QR Code..." : "Retrieving student information..."}
                    </p>
                    <Script
                        src="https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js"
                        strategy="lazyOnload"
                    />
                </div>
            )
        }

        if (!qrCodeData || error) {
            return (
                <div className="max-w-2xl mx-auto">
                    <Script
                        src="https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js"
                        strategy="lazyOnload"
                    />
                    <Card className="border-dashed border-2">
                        <CardHeader className="text-center">
                            <div className="flex justify-center mb-4">
                                <div className="bg-primary/10 p-4 rounded-full">
                                    <QrCode className="h-12 w-12 text-primary" />
                                </div>
                            </div>
                            <CardTitle className="text-2xl">QR Identification</CardTitle>
                            <CardDescription>
                                {error || "Scan a student QR code or upload an image to verify identity"}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg bg-slate-50">
                                <Upload className="h-10 w-10 text-slate-400 mb-4" />
                                <p className="text-sm text-slate-500 mb-4 text-center">
                                    Upload a photo of the QR code to decode its content
                                </p>
                                <label className="cursor-pointer">
                                    <Button asChild variant="outline">
                                        <span>
                                            <Hash className="mr-2 h-4 w-4" />
                                            Select Image
                                        </span>
                                    </Button>
                                    <input
                                        type="file"
                                        className="hidden"
                                        accept="image/*"
                                        onChange={handleFileUpload}
                                    />
                                </label>
                            </div>

                            {qrData && (
                                <Button className="w-full" onClick={() => fetchStudentDetails(qrData)}>
                                    Retry Last Scan
                                </Button>
                            )}
                        </CardContent>
                    </Card>
                </div>
            )
        }

        return (
            <div className="max-w-2xl mx-auto">
                <Card className="overflow-hidden border-t-4 border-t-primary shadow-xl">
                    <CardHeader className="bg-slate-50/50 pb-8 text-center border-b">
                        <div className="flex justify-center mb-6">
                            <div className="relative">
                                <Avatar className="h-32 w-32 border-4 border-white shadow-lg">
                                    <AvatarImage src={student?.photo || ""} alt={student?.first_name} className="object-cover" />
                                    <AvatarFallback className="bg-slate-100">
                                        <User className="h-16 w-16 text-slate-400" />
                                    </AvatarFallback>
                                </Avatar>
                                <div className="absolute -bottom-2 -right-2">
                                    {student?.face_encoding ? (
                                        <Badge className="bg-green-500 hover:bg-green-600 border-2 border-white px-2 py-1 gap-1">
                                            <UserCheck className="h-3 w-3" />
                                            Verified
                                        </Badge>
                                    ) : (
                                        <Badge variant="destructive" className="border-2 border-white px-2 py-1 gap-1">
                                            <UserX className="h-3 w-3" />
                                            Unregistered
                                        </Badge>
                                    )}
                                </div>
                            </div>
                        </div>
                        <CardTitle className="text-3xl font-bold text-slate-900 capitalize">
                            {student?.first_name} {student?.last_name}
                        </CardTitle>
                        <CardDescription className="text-lg mt-2 font-medium">
                            {student?.course_name || "Course Not Assigned"}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x">
                            <div className="p-6 space-y-6">
                                <div className="flex items-start gap-4">
                                    <div className="bg-primary/10 p-2 rounded-lg">
                                        <Hash className="h-5 w-5 text-primary" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Student Number</p>
                                        <p className="text-lg font-bold text-slate-800">{student?.student_number}</p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-4">
                                    <div className="bg-primary/10 p-2 rounded-lg">
                                        <Mail className="h-5 w-5 text-primary" />
                                    </div>
                                    <div className="overflow-hidden">
                                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Email Address</p>
                                        <p className="text-lg font-bold text-slate-800 truncate">{student?.email || "N/A"}</p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-4">
                                    <div className="bg-primary/10 p-2 rounded-lg">
                                        <Layout className="h-5 w-5 text-primary" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">QR Unique Identifier</p>
                                        <p className="text-sm font-mono bg-slate-50 px-2 py-1 rounded border text-slate-600">{student?.qr_code}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="p-6 space-y-6 bg-slate-50/30">
                                <div className="flex items-start gap-4">
                                    <div className="bg-primary/10 p-2 rounded-lg">
                                        <GraduationCap className="h-5 w-5 text-primary" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Year Level</p>
                                        <p className="text-lg font-bold text-slate-800">
                                            {student?.year_level ? `${student.year_level}${getOrdinal(student.year_level)} Year` : "N/A"}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-4">
                                    <div className="bg-primary/10 p-2 rounded-lg">
                                        <Layout className="h-5 w-5 text-primary" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Section</p>
                                        <p className="text-lg font-bold text-slate-800">{student?.section_name || "N/A"}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <div className="mt-8 flex justify-center">
                    <Button variant="outline" className="gap-2" onClick={() => {
                        setQrCodeData(null)
                        setStudent(null)
                        setError(null)
                    }}>
                        <QrCode className="h-4 w-4" />
                        Scan Another Code
                    </Button>
                </div>
            </div>
        )
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
                        <h1 className="text-2xl font-bold text-slate-900">QR Identification Test</h1>
                        <p className="text-sm text-slate-500">Verify student identity using QR codes</p>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="p-6">
                {renderContent()}
            </div>
        </div>
    )
}

function getOrdinal(n: number) {
    const s = ["th", "st", "nd", "rd"]
    const v = n % 100
    return s[(v - 20) % 10] || s[v] || s[0]
}
