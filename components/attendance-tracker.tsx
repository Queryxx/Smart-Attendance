"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

interface AttendanceRecord {
  id: string
  student_id: string
  student_name: string
  attendance_date: string
  status: string
}

export function AttendanceTracker() {
  const [students, setStudents] = useState<any[]>([])
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0])
  const [attendance, setAttendance] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
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
    setLoading(true)

    try {
      const records = students.map((student) => ({
        student_id: student.id,
        section_id: "default-section-id", // You may want to add section selection
        attendance_date: selectedDate,
        status: attendance[student.id] || "absent",
      }))

      const response = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ records }),
      })

      if (response.ok) {
        alert("Attendance recorded successfully")
      }
    } catch (error) {
      console.error("Error recording attendance:", error)
      alert("Error recording attendance")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Track Attendance</CardTitle>
        <CardDescription>Record student attendance for today</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="date">Date</Label>
            <Input id="date" type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student Name</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell>{student.name}</TableCell>
                    <TableCell>
                      <select
                        value={attendance[student.id] || "absent"}
                        onChange={(e) => setAttendance({ ...attendance, [student.id]: e.target.value })}
                        className="border border-input rounded-md px-3 py-2 text-sm"
                      >
                        <option value="present">Present</option>
                        <option value="absent">Absent</option>
                        <option value="late">Late</option>
                        <option value="excused">Excused</option>
                      </select>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <Button type="submit" disabled={loading}>
            {loading ? "Saving..." : "Save Attendance"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
