"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"

interface Student {
    id: string
    student_number: string
    first_name: string
    last_name: string
}

interface Fine {
    id?: string
    student_id: string
    amount: number | string
    reason: string
    date: string
}

export function FineForm({ onSave, onCancel }: { onSave: () => void; onCancel: () => void }) {
    const [students, setStudents] = useState<Student[]>([])
    const [formData, setFormData] = useState<Fine>({
        student_id: "",
        amount: "",
        reason: "",
        date: new Date().toISOString().split("T")[0],
    })
    const [studentSearchTerm, setStudentSearchTerm] = useState("")
    const [showStudentDropdown, setShowStudentDropdown] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")
    const router = useRouter()

    useEffect(() => {
        fetchStudents()
    }, [])

    async function fetchStudents() {
        try {
            const response = await fetch("/api/students")
            if (!response.ok) {
                const err = await response.json().catch(() => ({}))
                console.error("Failed to load students:", response.status, err)
                setStudents([])
                if (response.status === 403) router.push("/login")
                return
            }

            const data = await response.json()
            if (!Array.isArray(data)) {
                console.error("Unexpected students payload:", data)
                setStudents([])
                return
            }

            setStudents(data)
        } catch (error) {
            console.error("Error fetching students:", error)
        }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setError("")

        if (!formData.student_id) {
            setError("Please select a student")
            return
        }
        if (!formData.amount || Number(formData.amount) <= 0) {
            setError("Please enter a valid fine amount")
            return
        }
        if (!formData.reason.trim()) {
            setError("Please enter a reason for the fine")
            return
        }

        setLoading(true)

        try {
            const response = await fetch("/api/fines", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    student_id: parseInt(formData.student_id),
                    amount: parseFloat(formData.amount.toString()),
                    reason: formData.reason.trim(),
                    date: formData.date,
                }),
            })

            if (!response.ok) {
                const data = await response.json()
                setError(data.message || "Failed to add fine")
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
                <CardTitle>Add Fine</CardTitle>
                <CardDescription>Issue a fine to a student</CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && <div className="p-3 bg-red-100 text-red-700 rounded-md text-sm">{error}</div>}

                    <div className="relative">
                        <Label htmlFor="student-search">Student *</Label>
                        <div className="relative">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                id="student-search"
                                placeholder="Search by name or student number..."
                                value={studentSearchTerm}
                                onChange={(e) => {
                                    setStudentSearchTerm(e.target.value)
                                    setShowStudentDropdown(true)
                                }}
                                onFocus={() => setShowStudentDropdown(true)}
                                className="pl-9"
                                autoComplete="off"
                            />
                        </div>

                        {showStudentDropdown && (
                            <div className="absolute z-10 w-full mt-1 max-h-60 overflow-auto bg-white border border-input rounded-md shadow-lg">
                                {students
                                    .filter(s =>
                                        !studentSearchTerm ||
                                        s.student_number.toLowerCase().includes(studentSearchTerm.toLowerCase()) ||
                                        `${s.first_name} ${s.last_name}`.toLowerCase().includes(studentSearchTerm.toLowerCase())
                                    )
                                    .slice(0, 100) // Limit to 100 for performance
                                    .map(student => (
                                        <div
                                            key={student.id}
                                            className="px-3 py-2 cursor-pointer hover:bg-slate-100 text-sm border-b last:border-0"
                                            onClick={() => {
                                                setFormData({ ...formData, student_id: student.id })
                                                setStudentSearchTerm(`${student.student_number} - ${student.first_name} ${student.last_name}`)
                                                setShowStudentDropdown(false)
                                            }}
                                        >
                                            <div className="font-medium">{student.first_name} {student.last_name}</div>
                                            <div className="text-xs text-muted-foreground">{student.student_number}</div>
                                        </div>
                                    ))
                                }
                                {students.filter(s =>
                                    !studentSearchTerm ||
                                    s.student_number.toLowerCase().includes(studentSearchTerm.toLowerCase()) ||
                                    `${s.first_name} ${s.last_name}`.toLowerCase().includes(studentSearchTerm.toLowerCase())
                                ).length === 0 && (
                                        <div className="px-3 py-4 text-center text-sm text-muted-foreground">
                                            No students found
                                        </div>
                                    )}
                            </div>
                        )}
                        {showStudentDropdown && (
                            <div
                                className="fixed inset-0 z-0"
                                onClick={() => setShowStudentDropdown(false)}
                            />
                        )}
                        {/* Hidden input to maintain required validation if needed, or just use error state */}
                        <input type="hidden" name="student_id" value={formData.student_id} required />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="amount">Amount (₱) *</Label>
                            <Input
                                id="amount"
                                type="number"
                                step="0.01"
                                min="0"
                                value={formData.amount}
                                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                placeholder="0.00"
                                required
                            />
                        </div>
                        <div>
                            <Label htmlFor="date">Date *</Label>
                            <Input
                                id="date"
                                type="date"
                                value={formData.date}
                                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <Label htmlFor="reason">Reason *</Label>
                        <textarea
                            id="reason"
                            value={formData.reason}
                            onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                            placeholder="Reason for the fine"
                            className="w-full border border-input rounded-md px-3 py-2 text-sm"
                            rows={3}
                            required
                        />
                    </div>

                    <div className="flex gap-4 pt-4">
                        <Button type="submit" disabled={loading}>
                            {loading ? "Adding..." : "Add Fine"}
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
