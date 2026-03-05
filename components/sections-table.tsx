"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Edit2, Trash2, Plus } from "lucide-react"

interface Section {
    id: string
    section_name: string
    course_id: string
    course_name?: string
}

export function SectionsTable({
    onEdit,
    onDelete,
}: { onEdit: (section: Section) => void; onDelete: (id: string) => void }) {
    const [sections, setSections] = useState<Section[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState("")
    const router = useRouter()

    useEffect(() => {
        fetchSections()
    }, [])

    async function fetchSections() {
        try {
            setLoading(true)
            const response = await fetch("/api/sections")
            const data = await response.json()

            if (!response.ok) {
                console.error("Error fetching sections:", data)
                setSections([])
                if (response.status === 403) {
                    // Not authorized - redirect to login
                    router.push("/login")
                }
                return
            }

            if (Array.isArray(data)) {
                setSections(data)
            } else if (data && Array.isArray((data as any).sections)) {
                setSections((data as any).sections)
            } else {
                console.error("Unexpected sections response shape:", data)
                setSections([])
            }
        } catch (error) {
            console.error("Error fetching sections:", error)
            setSections([])
        } finally {
            setLoading(false)
        }
    }

    const filteredSections = sections.filter(
        (section) =>
            section.section_name.toLowerCase().includes(searchTerm.toLowerCase()),
    )

    async function handleDelete(id: string) {
        if (confirm("Are you sure you want to delete this section?")) {
            try {
                await fetch(`/api/sections/${id}`, { method: "DELETE" })
                setSections(sections.filter((s) => s.id !== id))
            } catch (error) {
                console.error("Error deleting section:", error)
            }
        }
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle>Sections</CardTitle>
                        <CardDescription>Manage course sections</CardDescription>
                    </div>
                    <Button onClick={() => onEdit({} as Section)} className="gap-2">
                        <Plus className="h-4 w-4" />
                        Add Section
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                <div className="mb-4">
                    <Input
                        placeholder="Search by section name or instructor..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                {loading ? (
                    <div className="text-center py-8 text-muted-foreground">Loading...</div>
                ) : filteredSections.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">No sections found</div>
                ) : (
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Section Name</TableHead>
                                    <TableHead>Course</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredSections.map((section) => (
                                    <TableRow key={section.id}>
                                        <TableCell className="font-medium">{section.section_name}</TableCell>
                                        <TableCell>{section.course_name || "N/A"}</TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="sm" onClick={() => onEdit(section)} className="gap-2">
                                                <Edit2 className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleDelete(section.id)}
                                                className="gap-2 text-destructive"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
