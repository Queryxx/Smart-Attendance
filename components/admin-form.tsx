"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Eye, EyeOff, Save, Loader2 } from "lucide-react"

interface Admin {
    id?: string
    username: string
    full_name: string
    email?: string
    password?: string
    role?: string
}

export function AdminForm({ admin, onSave, onCancel }: { admin?: Admin; onSave: () => void; onCancel: () => void }) {
    const [formData, setFormData] = useState<Admin>(admin || { username: "", full_name: "", email: "", password: "", role: "" })
    const [confirmPassword, setConfirmPassword] = useState("")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)

    useEffect(() => {
        if (admin) {
            setFormData(admin)
        }
    }, [admin])

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setError("")

        // Validate required fields
        if (!formData.full_name.trim()) {
            setError("Full name is required")
            return
        }
        if (!formData.username.trim()) {
            setError("Username is required")
            return
        }
        if (!formData.email?.trim()) {
            setError("Email is required")
            return
        }
        if (!formData.role?.trim()) {
            setError("Role is required")
            return
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(formData.email)) {
            setError("Please enter a valid email address")
            return
        }

        // Password will be auto-generated for new admins and emailed to the provided address

        setLoading(true)

        try {
            const method = formData.id ? "PUT" : "POST"
            const url = formData.id ? `/api/admin-users/${formData.id}` : "/api/admin-users"

            const response = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    full_name: formData.full_name.trim(),
                    username: formData.username.trim(),
                    email: formData.email.trim(),
                    role: formData.role?.trim(),
                    password: formData.password?.trim(),
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

    return (
        <Card>
            <CardHeader>
                <CardTitle>{formData.id ? "Edit Admin" : "Add New Admin"}</CardTitle>
                <CardDescription>Enter admin user information</CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && <div className="p-3 bg-red-100 text-red-700 rounded-md text-sm">{error}</div>}

                    <div>
                        <Label htmlFor="full_name">Full Name *</Label>
                        <Input
                            id="full_name"
                            value={formData.full_name}
                            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                            placeholder="Enter full name"
                            required
                        />
                    </div>

                    <div>
                        <Label htmlFor="username">Username *</Label>
                        <Input
                            id="username"
                            value={formData.username}
                            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                            placeholder="Choose a username"
                            required
                        />
                    </div>

                    <div>
                        <Label htmlFor="email">Email *</Label>
                        <Input
                            id="email"
                            type="email"
                            value={formData.email || ""}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            placeholder="Enter email address"
                            required
                        />
                    </div>

                    <div>
                        <Label htmlFor="role">Role *</Label>
                        <Select value={formData.role || ""} onValueChange={(value) => setFormData({ ...formData, role: value })} required>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a role" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="superadmin">Admin</SelectItem>
                                <SelectItem value="fine_manager">Fine Manager</SelectItem>
                                <SelectItem value="receipt_manager">Receipt Manager</SelectItem>
                                <SelectItem value="student_registrar">Student Registrar</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {!formData.id && (
                        <div className="p-2 rounded-md bg-yellow-50 border border-yellow-100 text-yellow-900 text-sm">
                            A password will be auto-generated and emailed to the address you provide.
                        </div>
                    )}

                    <div className="flex gap-4 pt-4">
                        <Button type="submit" disabled={loading} className="gap-2">
                            {loading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Save className="h-4 w-4" />
                            )}
                            {loading ? "Saving..." : "Save Admin"}
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
