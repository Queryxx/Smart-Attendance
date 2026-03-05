"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import { LogOut, LayoutGrid, Users, Calendar, BookOpen, Layers, CheckCircle, CreditCard, Settings, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

export function Sidebar() {
    const pathname = usePathname()
    const [adminName, setAdminName] = useState<string | null>(null)
    const [adminRole, setAdminRole] = useState<string | null>(null)

    useEffect(() => {
        async function fetchCurrentAdmin() {
            try {
                const response = await fetch("/api/auth/me")
                if (response.ok) {
                    const data = await response.json()
                    setAdminName(data.full_name || data.username)
                    setAdminRole(data.role)
                } else {
                    console.error("Failed to fetch admin:", response.status)
                    setAdminName("Admin")
                    setAdminRole(null)
                }
            } catch (error) {
                console.error("Error fetching admin info:", error)
                setAdminName("Admin")
                setAdminRole(null)
            }
        }

        fetchCurrentAdmin()
    }, [])

    // Define all possible navigation items
    const allNavigation = [
        { name: "Dashboard", href: "/dashboard", icon: LayoutGrid },
        { name: "Students", href: "/dashboard/students", icon: Users },
        { name: "Student List", href: "/dashboard/finance-user/students-list", icon: Users },
        { name: "Events", href: "/dashboard/events", icon: Calendar },
        { name: "Courses & Sections", href: "/dashboard/courses", icon: BookOpen },
        { name: "Attendance", href: "/dashboard/attendance", icon: CheckCircle },
        { name: "Fines", href: "/dashboard/fines", icon: CreditCard },
        { name: "Activity Logs", href: "/dashboard/logs", icon: Eye },
        { name: "Users", href: "/dashboard/admins", icon: Settings },
    ]

    // Filter navigation based on role
    const getFilteredNavigation = () => {
        if (!adminRole) return []

        switch (adminRole) {
            case 'superadmin':
                return allNavigation.filter(item => item.name !== 'Student List')
            case 'student_registrar':
                return allNavigation.filter(item =>
                    ['Dashboard', 'Students', 'Events', 'Courses & Sections', 'Activity Logs'].includes(item.name)
                )
            case 'fine_manager':
            case 'receipt_manager':
                return allNavigation.filter(item =>
                    ['Dashboard', 'Student List', 'Attendance', 'Fines', 'Activity Logs'].includes(item.name)
                )
            default:
                return [allNavigation[0]] // Just Dashboard for unknown roles
        }
    }

    const navigation = getFilteredNavigation()

    async function handleLogout() {
        await fetch("/api/auth/logout", { method: "POST" })
        window.location.href = "/login"
    }

    return (
        <div className="w-64 bg-sidebar text-sidebar-foreground border-r border-sidebar-border h-screen fixed left-0 top-0 flex flex-col">
            <div className="p-6 border-b border-sidebar-border flex items-center gap-3">
                <img
                    src="/logo.png"
                    alt="UA Logo"
                    className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                />
                <div>
                    <h1 className="text-lg font-bold text-sidebar-primary">UA E-Attendance</h1>
                    <p className="text-xs text-sidebar-foreground/80 font-medium">
                        {adminName ? (
                            <>
                                <span className="font-semibold">{adminName}</span>
                                {adminRole && (
                                    <span className="opacity-90 ml-1">
                                        ({adminRole === 'superadmin' ? 'Admin' : adminRole.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')})
                                    </span>
                                )}
                            </>
                        ) : "Loading..."}
                    </p>
                </div>
            </div>

            <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                {navigation.map((item) => {
                    const Icon = item.icon
                    const isActive = pathname === item.href
                    return (
                        <Link key={item.href} href={item.href}>
                            <Button variant={isActive ? "default" : "ghost"} className="w-full justify-start" asChild>
                                <span>
                                    <Icon className="mr-2 h-4 w-4" />
                                    {item.name}
                                </span>
                            </Button>
                        </Link>
                    )
                })}
            </nav>

            <div className="p-4 border-t border-sidebar-border">
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="outline" className="w-full justify-start bg-transparent hover:bg-destructive hover:text-destructive-foreground transition-colors group">
                            <LogOut className="mr-2 h-4 w-4 group-hover:scale-110 transition-transform" />
                            Logout
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle className="text-xl font-bold">Are you sure you want to logout?</AlertDialogTitle>
                            <AlertDialogDescription className="text-base text-slate-600">
                                You will need to enter your credentials again to access your dashboard. Are you sure you want to continue?
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter className="mt-2">
                            <AlertDialogCancel>Keep me signed in</AlertDialogCancel>
                            <AlertDialogAction
                                onClick={handleLogout}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90 font-semibold"
                            >
                                Yes, Logout
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </div>
    )
}
