"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { DashboardShell } from "@/components/dashboard-shell"
import { AdminsTable } from "@/components/admins-table"
import { AdminForm } from "@/components/admin-form"
import { Button } from "@/components/ui/button"
import { ChangePasswordDialog } from "@/components/change-password-dialog"
import { Key, UserPlus } from "lucide-react"

interface Admin {
    id?: string
    username: string
    full_name: string
    email?: string
    role?: string
}

export default function AdminsPage() {
    const [showForm, setShowForm] = useState(false)
    const [selectedAdmin, setSelectedAdmin] = useState<Admin | null>(null)
    const [refreshKey, setRefreshKey] = useState(0)
    const [isAuthorized, setIsAuthorized] = useState(false)
    const [loading, setLoading] = useState(true)
    const [passwordDialogOpen, setPasswordDialogOpen] = useState(false)
    const router = useRouter()

    useEffect(() => {
        checkAuthorization()
    }, [])

    async function checkAuthorization() {
        try {
            const response = await fetch("/api/auth/me")
            if (response.ok) {
                const data = await response.json()
                if (data.role === 'superadmin') {
                    setIsAuthorized(true)
                } else {
                    router.push("/dashboard")
                    return
                }
            } else {
                router.push("/login")
                return
            }
        } catch (error) {
            console.error("Error checking authorization:", error)
            router.push("/login")
            return
        } finally {
            setLoading(false)
        }
    }

    function handleEdit(admin: Admin) {
        setSelectedAdmin(admin)
        setShowForm(true)
    }

    function handleSave() {
        setShowForm(false)
        setSelectedAdmin(null)
        setRefreshKey((prev) => prev + 1)
    }

    function handleCancel() {
        setShowForm(false)
        setSelectedAdmin(null)
    }

    if (loading) {
        return (
            <DashboardShell>
                <div className="text-center py-8">Loading...</div>
            </DashboardShell>
        )
    }

    if (!isAuthorized) {
        return null // This won't render as user will be redirected
    }

    return (
        <DashboardShell>
            <div className="mb-8">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold">Admin Users</h1>
                        <p className="text-muted-foreground">Manage admin accounts and permissions</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setPasswordDialogOpen(true)}
                            className="gap-2"
                        >
                            <Key className="h-4 w-4" />
                            Change Password
                        </Button>
                        <Button onClick={() => setShowForm(true)} className="bg-primary hover:bg-primary/90 gap-2">
                            <UserPlus className="h-4 w-4" />
                            Add User
                        </Button>
                    </div>
                </div>
            </div>

            <div className="grid gap-6">
                {showForm && (
                    <AdminForm admin={selectedAdmin || undefined} onSave={handleSave} onCancel={handleCancel} />
                )}
                <AdminsTable key={refreshKey} onEdit={handleEdit} onDelete={() => setRefreshKey((prev) => prev + 1)} />
            </div>

            <ChangePasswordDialog
                open={passwordDialogOpen}
                onOpenChange={setPasswordDialogOpen}
            />
        </DashboardShell>
    )
}
