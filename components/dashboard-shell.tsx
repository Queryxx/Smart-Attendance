"use client"

import { useEffect, useState } from "react"
import { Sidebar } from "@/components/sidebar"
import { Navbar } from "@/components/navbar"

interface DashboardShellProps {
    children: React.ReactNode
}

export function DashboardShell({ children }: DashboardShellProps) {
    const [adminRole, setAdminRole] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function fetchRole() {
            try {
                const response = await fetch("/api/auth/me")
                if (response.ok) {
                    const data = await response.json()
                    setAdminRole(data.role)
                }
            } catch (error) {
                console.error("Error fetching admin role:", error)
            } finally {
                setLoading(false)
            }
        }
        fetchRole()
    }, [])

    const isAdmin = adminRole === 'superadmin'

    // While loading, show sidebar layout as default (it will switch once role loads)
    if (loading) {
        return (
            <div className="flex">
                <Sidebar />
                <div className="ml-64 flex-1 p-8 bg-background">
                    <div className="text-center py-8">Loading...</div>
                </div>
            </div>
        )
    }

    if (isAdmin) {
        return (
            <div className="flex">
                <Sidebar />
                <div className="ml-64 flex-1 p-8 bg-background">
                    <div className="max-w-7xl">
                        {children}
                    </div>
                </div>
            </div>
        )
    }

    // Non-admin layout: top navigation bar
    return (
        <div className="min-h-screen bg-background">
            <Navbar />
            <div className="p-8">
                <div className="max-w-7xl mx-auto">
                    {children}
                </div>
            </div>
        </div>
    )
}
