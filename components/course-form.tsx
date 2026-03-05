"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"

interface Course {
    id?: string
    course_name: string
    course_code: string
}

export function CourseForm({
    course,
    onSave,
    onCancel,
}: { course?: Course; onSave: () => void; onCancel: () => void }) {
    const [formData, setFormData] = useState<Course>(course || { course_name: "", course_code: "" })
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")

    useEffect(() => {
        if (course) {
            setFormData(course)
        }
    }, [course])

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setError("")
        setLoading(true)

        try {
            const method = formData.id ? "PUT" : "POST"
            const url = formData.id ? `/api/courses/${formData.id}` : "/api/courses"

            const response = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
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
                <CardTitle>{formData.id ? "Edit Course" : "Add New Course"}</CardTitle>
                <CardDescription>Enter course information</CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && <div className="p-3 bg-red-100 text-red-700 rounded-md text-sm">{error}</div>}

                    <div>
                        <Label htmlFor="course_name">Course Name *</Label>
                        <Input
                            id="course_name"
                            value={formData.course_name}
                            onChange={(e) => setFormData({ ...formData, course_name: e.target.value })}
                            placeholder="e.g. Bachelor of Science in Information Technology"
                            required
                        />
                    </div>

                    <div>
                        <Label htmlFor="course_code">Course Code *</Label>
                        <Input
                            id="course_code"
                            value={formData.course_code}
                            onChange={(e) => setFormData({ ...formData, course_code: e.target.value })}
                            placeholder="e.g. BSIT"
                            required
                        />
                    </div>

                    <div className="flex gap-4 pt-4">
                        <Button type="submit" disabled={loading}>
                            {loading ? "Saving..." : "Save Course"}
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
