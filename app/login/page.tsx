"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Footer } from "@/components/footer"
import { Eye, EyeOff } from "lucide-react"
import Link from "next/link"

export default function LoginPage() {
    const [username, setUsername] = useState("")
    const [password, setPassword] = useState("")
    const [showPassword, setShowPassword] = useState(false)
    const [rememberMe, setRememberMe] = useState(false)
    const [error, setError] = useState("")
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setError("")
        setLoading(true)

        try {
            const response = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password }),
            })

            if (!response.ok) {
                const data = await response.json()
                setError(data.message || "Login failed")
                return
            }

            router.push("/dashboard")
        } catch (err) {
            setError("An error occurred. Please try again.")
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="h-screen flex flex-col items-center justify-center bg-slate-50 p-6 overflow-hidden">
            <div className="w-full max-w-md flex-1 flex flex-col items-center justify-center">
                <div className="w-full text-center mb-6">
                    <img
                        src="/logo.png"
                        alt="UA Logo"
                        className="w-20 h-20 rounded-full mx-auto mb-4 shadow-xl border-4 border-white"
                    />
                    <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">SMART ATTENDANCE</h1>
                    <p className="text-slate-500 text-sm mt-2 font-medium">Student Organization Attendance System</p>
                </div>

                <div className="w-full bg-white rounded-2xl p-6 shadow-2xl border border-slate-200">
                    <div className="mb-6 text-center">
                        <h2 className="text-2xl font-bold text-slate-900">Sign In</h2>
                        <p className="text-slate-500 text-sm mt-1">Access your administrative dashboard</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {error && (
                            <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm border border-red-200 animate-in fade-in zoom-in duration-200">
                                {error}
                            </div>
                        )}
                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-slate-700">Username</label>
                            <Input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="Enter your username"
                                required
                                className="h-11 bg-slate-50/50 border-slate-200 focus:border-sidebar-primary focus:ring-1 focus:ring-sidebar-primary rounded-xl"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-slate-700">Password</label>
                            <div className="relative">
                                <Input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Enter your password"
                                    required
                                    className="h-11 bg-slate-50/50 border-slate-200 focus:border-sidebar-primary focus:ring-1 focus:ring-sidebar-primary rounded-xl pr-12"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-3 text-slate-400 hover:text-slate-600 transition-colors"
                                >
                                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>
                        </div>
                        <div className="flex items-center justify-between pb-2">
                            <div className="flex items-center gap-2">
                                <Checkbox
                                    id="rememberMe"
                                    checked={rememberMe}
                                    onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                                    className="rounded border-slate-300 data-[state=checked]:bg-sidebar-primary data-[state=checked]:border-sidebar-primary"
                                />
                                <label htmlFor="rememberMe" className="text-sm text-slate-600 cursor-pointer font-medium">
                                    Remember me
                                </label>
                            </div>
                            <Link href="/forgot-password" title="Recover your account password" className="text-sm text-sidebar-primary hover:underline font-medium">
                                Forgot password?
                            </Link>
                        </div>
                        <Button
                            type="submit"
                            className="w-full h-11 bg-sidebar-primary hover:bg-sidebar-primary/90 text-white font-bold rounded-xl transition-all shadow-lg active:scale-[0.98]"
                            disabled={loading}
                        >
                            {loading ? (
                                <span className="flex items-center gap-2">
                                    <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    Signing in...
                                </span>
                            ) : "Sign In"}
                        </Button>
                    </form>
                </div>
            </div>
            <div className="py-4">
                <Footer />
            </div>
        </div>
    )
}
