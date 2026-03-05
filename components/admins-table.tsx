"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Edit2, Trash2 } from "lucide-react"

interface Admin {
    id: string
    username: string
    full_name: string
    email: string
    role: string
}

export function AdminsTable({ onEdit, onDelete }: { onEdit: (admin: Admin) => void; onDelete: (id: string) => void }) {
    const [admins, setAdmins] = useState<Admin[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState("")

    useEffect(() => {
        fetchAdmins()
    }, [])

    async function fetchAdmins() {
        try {
            const response = await fetch("/api/admin-users")
            const data = await response.json()
            setAdmins(data)
        } catch (error) {
            console.error("Error fetching admins:", error)
        } finally {
            setLoading(false)
        }
    }

    const filteredAdmins = admins.filter(
        (admin) =>
            admin.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
            admin.full_name.toLowerCase().includes(searchTerm.toLowerCase()),
    )

    async function handleDelete(id: string) {
        if (confirm("Are you sure you want to delete this admin?")) {
            try {
                await fetch(`/api/admin-users/${id}`, { method: "DELETE" })
                setAdmins(admins.filter((a) => a.id !== id))
            } catch (error) {
                console.error("Error deleting admin:", error)
            }
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Admin Users</CardTitle>
                <CardDescription>Manage admin accounts</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="mb-4">
                    <Input
                        placeholder="Search by username or full name..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                {loading ? (
                    <div className="text-center py-8 text-muted-foreground">Loading...</div>
                ) : filteredAdmins.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">No admins found</div>
                ) : (
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Username</TableHead>
                                    <TableHead>Full Name</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Role</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredAdmins.map((admin) => (
                                    <TableRow key={admin.id}>
                                        <TableCell className="font-medium">{admin.username}</TableCell>
                                        <TableCell>{admin.full_name}</TableCell>
                                        <TableCell>{admin.email}</TableCell>
                                        <TableCell className="capitalize">{admin.role === 'superadmin' ? 'Admin' : admin.role.replace('_', ' ')}</TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="sm" onClick={() => onEdit(admin)} className="gap-2">
                                                <Edit2 className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleDelete(admin.id)}
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
