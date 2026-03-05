"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"

interface Section {
  id?: string
  section_name: string
  course_id: string
}

interface Course {
  id?: string
  course_name: string
}

export function SectionForm({
  section,
  courses,
  onSave,
  onCancel,
}: { section?: Section; courses: Course[]; onSave: () => void; onCancel: () => void }) {
  const [formData, setFormData] = useState<Section>(
    section || { section_name: "", course_id: "" },
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (section) {
      setFormData(section)
    }
  }, [section])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")

    // Validate required fields
    if (!formData.section_name.trim()) {
      setError("Section name is required")
      return
    }
    if (!formData.course_id) {
      setError("Please select a course")
      return
    }

    setLoading(true)

    try {
      const method = formData.id ? "PUT" : "POST"
      const url = formData.id ? `/api/sections/${formData.id}` : "/api/sections"

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          section_name: formData.section_name.trim(),
          course_id: parseInt(formData.course_id, 10),
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
        <CardTitle>{formData.id ? "Edit Section" : "Add New Section"}</CardTitle>
        <CardDescription>Enter section information</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="p-3 bg-red-100 text-red-700 rounded-md text-sm">{error}</div>}

          <div>
            <Label htmlFor="course">Course *</Label>
            <select
              id="course"
              value={formData.course_id}
              onChange={(e) => setFormData({ ...formData, course_id: e.target.value })}
              required
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
            <Label htmlFor="sectionName">Section Name *</Label>
            <Input
              id="sectionName"
              value={formData.section_name}
              onChange={(e) => setFormData({ ...formData, section_name: e.target.value })}
              placeholder="e.g., A, B, C"
              required
            />
          </div>

          <div className="flex gap-4 pt-4">
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save Section"}
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
