"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Footer } from "@/components/footer"
import { ArrowLeft, Mail, ShieldCheck, Lock, Eye, EyeOff, CheckCircle2 } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"

type Step = "email" | "otp" | "reset" | "success"

export default function ForgotPasswordPage() {
    const [step, setStep] = useState<Step>("email")
    const [email, setEmail] = useState("")
    const [otp, setOtp] = useState("")
    const [newPassword, setNewPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [showPassword, setShowPassword] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")
    const router = useRouter()

    async function handleSendOtp(e: React.FormEvent) {
        e.preventDefault()
        setLoading(true)
        setError("")

        try {
            const res = await fetch("/api/auth/forgot-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "send-otp", email }),
            })

            const data = await res.json()
            if (!res.ok) throw new Error(data.message || "Failed to send OTP")

            toast.success("Verification code sent to your email")
            setStep("otp")
        } catch (err: any) {
            setError(err.message)
            toast.error(err.message)
        } finally {
            setLoading(false)
        }
    }

    async function handleVerifyOtp(e: React.FormEvent) {
        e.preventDefault()
        setLoading(true)
        setError("")

        try {
            const res = await fetch("/api/auth/forgot-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "verify-otp", email, otp }),
            })

            const data = await res.json()
            if (!res.ok) throw new Error(data.message || "Invalid or expired code")

            toast.success("Code verified successfully")
            setStep("reset")
        } catch (err: any) {
            setError(err.message)
            toast.error(err.message)
        } finally {
            setLoading(false)
        }
    }

    async function handleResetPassword(e: React.FormEvent) {
        e.preventDefault()
        if (newPassword !== confirmPassword) {
            setError("Passwords do not match")
            return
        }

        setLoading(true)
        setError("")

        try {
            const res = await fetch("/api/auth/forgot-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "reset-password", email, otp, newPassword }),
            })

            const data = await res.json()
            if (!res.ok) throw new Error(data.message || "Failed to reset password")

            toast.success("Password reset successfully")
            setStep("success")
        } catch (err: any) {
            setError(err.message)
            toast.error(err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="h-screen flex flex-col items-center justify-center bg-slate-50 p-4 overflow-hidden">
            <div className="w-full max-w-md flex-1 flex flex-col items-center justify-center">
                <div className="w-full text-center mb-6">
                    <img
                        src="/logo.png"
                        alt="UA Logo"
                        className="w-20 h-20 rounded-full mx-auto mb-4 shadow-xl border-4 border-white"
                    />
                    <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">SMART ATTENDANCE</h1>
                    <p className="text-slate-500 text-xs mt-1 font-medium tracking-widest uppercase">Security Portal</p>
                </div>

                <div className="w-full bg-white rounded-3xl p-8 shadow-2xl border border-slate-200 relative overflow-hidden">
                    {/* Progress indicator */}
                    <div className="absolute top-0 left-0 w-full h-1 bg-slate-100">
                        <div
                            className="h-full bg-sidebar-primary transition-all duration-500"
                            style={{ width: step === "email" ? "25%" : step === "otp" ? "50%" : step === "reset" ? "75%" : "100%" }}
                        />
                    </div>

                    {step === "email" && (
                        <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="mb-8 text-center">
                                <h2 className="text-2xl font-bold text-slate-900">Forgot Password?</h2>
                                <p className="text-slate-500 text-sm mt-2">Enter your email and we'll send you an OTP code to reset your password.</p>
                            </div>

                            <form onSubmit={handleSendOtp} className="space-y-6">
                                {error && <div className="p-3 bg-red-50 text-red-600 rounded-xl text-xs border border-red-100 flex items-center gap-2">
                                    <div className="w-1 h-1 bg-red-400 rounded-full" /> {error}
                                </div>}
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-700 uppercase ml-1">Account Email</label>
                                    <div className="relative">
                                        <Input
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="admin@institution.edu"
                                            required
                                            className="h-12 bg-slate-50 border-slate-200 focus:border-sidebar-primary rounded-xl pl-11 transition-all"
                                        />
                                        <Mail className="absolute left-4 top-3.5 text-slate-400" size={18} />
                                    </div>
                                </div>
                                <Button className="w-full h-12 bg-sidebar-primary hover:bg-sidebar-primary/90 text-white font-bold rounded-xl shadow-lg" disabled={loading}>
                                    {loading ? "Discovering Account..." : "Send Verification Code"}
                                </Button>
                                <div className="text-center pt-2">
                                    <Link href="/login" className="text-sm text-slate-500 hover:text-sidebar-primary font-medium flex items-center justify-center gap-2">
                                        <ArrowLeft size={16} /> Back to Login
                                    </Link>
                                </div>
                            </form>
                        </div>
                    )}

                    {step === "otp" && (
                        <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="mb-8 text-center">
                                <div className="w-14 h-14 bg-blue-50 text-sidebar-primary rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-100">
                                    <ShieldCheck size={28} />
                                </div>
                                <h2 className="text-2xl font-bold text-slate-900">Enter OTP Code</h2>
                                <p className="text-slate-500 text-sm mt-2">We've sent a 6-digit verification code to <span className="font-semibold text-slate-700">{email}</span></p>
                            </div>

                            <form onSubmit={handleVerifyOtp} className="space-y-6">
                                {error && <div className="p-3 bg-red-50 text-red-600 rounded-xl text-xs border border-red-100">
                                    {error}
                                </div>}
                                <div className="space-y-2 text-center">
                                    <label className="text-xs font-bold text-slate-700 uppercase">Verification Code</label>
                                    <Input
                                        type="text"
                                        value={otp}
                                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                                        placeholder="0 0 0 0 0 0"
                                        required
                                        className="h-14 bg-slate-50 border-slate-200 focus:border-sidebar-primary rounded-xl text-center text-2xl font-bold tracking-[0.5em] focus:ring-4 focus:ring-sidebar-primary/10 transition-all"
                                    />
                                    <p className="text-[10px] text-slate-400 mt-2 italic">Check your inbox and spam folder</p>
                                </div>
                                <Button className="w-full h-12 bg-sidebar-primary hover:bg-sidebar-primary/90 text-white font-bold rounded-xl shadow-lg" disabled={loading}>
                                    {loading ? "Verifying..." : "Verify Code"}
                                </Button>
                                <div className="text-center pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setStep("email")}
                                        className="text-xs text-slate-500 hover:text-sidebar-primary font-bold underline underline-offset-4"
                                    >
                                        Wrong email? Change it
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {step === "reset" && (
                        <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="mb-8 text-center">
                                <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-indigo-100">
                                    <Lock size={28} />
                                </div>
                                <h2 className="text-2xl font-bold text-slate-900">New Password</h2>
                                <p className="text-slate-500 text-sm mt-2">Your identity is verified. Please create a strong new password.</p>
                            </div>

                            <form onSubmit={handleResetPassword} className="space-y-5">
                                {error && <div className="p-3 bg-red-50 text-red-600 rounded-xl text-xs border border-red-100">
                                    {error}
                                </div>}
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-700 uppercase ml-1">New Password</label>
                                    <div className="relative">
                                        <Input
                                            type={showPassword ? "text" : "password"}
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            placeholder="••••••••"
                                            required
                                            className="h-12 bg-slate-50 border-slate-200 focus:border-sidebar-primary rounded-xl pl-11 transition-all"
                                        />
                                        <Lock className="absolute left-4 top-3.5 text-slate-400" size={18} />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-4 top-3.5 text-slate-400 hover:text-slate-600"
                                        >
                                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-700 uppercase ml-1">Confirm Password</label>
                                    <div className="relative">
                                        <Input
                                            type={showPassword ? "text" : "password"}
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            placeholder="••••••••"
                                            required
                                            className="h-12 bg-slate-50 border-slate-200 focus:border-sidebar-primary rounded-xl pl-11 transition-all"
                                        />
                                        <Lock className="absolute left-4 top-3.5 text-slate-400" size={18} />
                                    </div>
                                </div>
                                <Button className="w-full h-12 bg-sidebar-primary hover:bg-sidebar-primary/90 text-white font-bold rounded-xl shadow-lg mt-4" disabled={loading}>
                                    {loading ? "Updating..." : "Update Password"}
                                </Button>
                            </form>
                        </div>
                    )}

                    {step === "success" && (
                        <div className="text-center py-4 animate-in zoom-in duration-500">
                            <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                                <CheckCircle2 size={48} />
                            </div>
                            <h2 className="text-3xl font-black text-slate-900 mb-3">All Set!</h2>
                            <p className="text-slate-500 mb-8 leading-relaxed">Your password has been successfully updated. You can now log in with your new credentials.</p>
                            <Button className="w-full h-14 bg-sidebar-primary hover:bg-sidebar-primary/90 text-white font-black text-lg rounded-2xl shadow-xl hover:scale-[1.02] active:scale-95 transition-all" asChild>
                                <Link href="/login">Go to Login</Link>
                            </Button>
                        </div>
                    )}
                </div>
            </div>
            <div className="py-6">
                <Footer />
            </div>
        </div>
    )
}
