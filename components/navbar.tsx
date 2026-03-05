"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import { LogOut, LayoutGrid, Users, Calendar, BookOpen, CheckCircle, CreditCard, Settings, Menu, X, Key, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ChangePasswordDialog } from "@/components/change-password-dialog"
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

export function Navbar() {
    const pathname = usePathname()
    const [adminName, setAdminName] = useState<string | null>(null)
    const [adminRole, setAdminRole] = useState<string | null>(null)
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
    const [passwordDialogOpen, setPasswordDialogOpen] = useState(false)

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
        <nav className="bg-sidebar text-sidebar-foreground border-b border-sidebar-border sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    {/* Logo & Brand */}
                    <div className="flex items-center gap-3 flex-shrink-0">
                        <img
                            src="/logo.png"
                            alt="UA Logo"
                            className="w-9 h-9 rounded-full object-cover"
                        />
                        <div className="hidden sm:block text-left">
                            <h1 className="text-base font-bold text-sidebar-primary leading-tight">UA E-Attendance</h1>
                            <div className="text-[11px] text-sidebar-foreground/70 font-medium leading-tight">
                                {adminName ? (
                                    <div className="flex items-center gap-1.5 pt-0.5">
                                        <Badge variant="outline" className="font-bold border-sidebar-border bg-sidebar-foreground/5 py-0 px-2 h-5">
                                            {adminName}
                                        </Badge>
                                        {adminRole && (
                                            <Badge className="bg-primary/90 hover:bg-primary text-[10px] font-bold py-0 px-2 h-5 uppercase tracking-tight">
                                                {adminRole === 'superadmin'
                                                    ? 'Superadmin'
                                                    : adminRole.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                                            </Badge>
                                        )}
                                    </div>
                                ) : "Loading..."}
                            </div>
                        </div>
                    </div>

                    {/* Desktop Nav Links */}
                    <div className="hidden md:flex items-center gap-1">
                        {navigation.map((item) => {
                            const Icon = item.icon
                            const isActive = pathname === item.href
                            return (
                                <Link key={item.href} href={item.href}>
                                    <Button
                                        variant={isActive ? "default" : "ghost"}
                                        size="sm"
                                        className="gap-1.5 text-sm"
                                        asChild
                                    >
                                        <span>
                                            <Icon className="h-4 w-4" />
                                            {item.name}
                                        </span>
                                    </Button>
                                </Link>
                            )
                        })}
                    </div>

                    {/* Logout + Mobile Menu Toggle */}
                    <div className="flex items-center gap-2">
                        {/* Change Password (desktop) */}
                        <div className="hidden md:block">
                            <Button
                                variant="outline"
                                size="sm"
                                className="gap-1.5"
                                title="Change Password"
                                onClick={() => setPasswordDialogOpen(true)}
                            >
                                <Key className="h-4 w-4" />
                                <span className="sr-only">Password</span>
                            </Button>
                        </div>

                        {/* Logout (desktop) */}
                        <div className="hidden md:block">
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="bg-transparent hover:bg-destructive hover:text-destructive-foreground transition-colors group gap-1.5"
                                    >
                                        <LogOut className="h-4 w-4 group-hover:scale-110 transition-transform" />
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

                        {/* Mobile menu button */}
                        <Button
                            variant="ghost"
                            size="sm"
                            className="md:hidden"
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        >
                            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                        </Button>
                    </div>
                </div>
            </div>

            {/* Mobile dropdown menu */}
            {mobileMenuOpen && (
                <div className="md:hidden border-t border-sidebar-border bg-sidebar">
                    <div className="px-4 py-3 space-y-1">
                        {/* Mobile user info */}
                        <div className="sm:hidden pb-2 mb-2 border-b border-sidebar-border">
                            <div className="flex items-start flex-col gap-1.5">
                                {adminName ? (
                                    <>
                                        <Badge variant="outline" className="font-bold border-sidebar-border h-6">
                                            {adminName}
                                        </Badge>
                                        {adminRole && (
                                            <Badge className="bg-primary/90 text-[10px] font-bold py-0.5 px-2 uppercase tracking-tight">
                                                {adminRole === 'superadmin' ? 'Superadmin' : adminRole.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                                            </Badge>
                                        )}
                                    </>
                                ) : "Loading..."}
                            </div>
                        </div>

                        {navigation.map((item) => {
                            const Icon = item.icon
                            const isActive = pathname === item.href
                            return (
                                <Link key={item.href} href={item.href} onClick={() => setMobileMenuOpen(false)}>
                                    <Button variant={isActive ? "default" : "ghost"} className="w-full justify-start" asChild>
                                        <span>
                                            <Icon className="mr-2 h-4 w-4" />
                                            {item.name}
                                        </span>
                                    </Button>
                                </Link>
                            )
                        })}

                        {/* Account Settings (mobile) */}
                        <div className="pt-2 mt-2 border-t border-sidebar-border">
                            <Button
                                variant="outline"
                                className="w-full justify-start gap-2"
                                onClick={() => {
                                    setMobileMenuOpen(false)
                                    setPasswordDialogOpen(true)
                                }}
                            >
                                <Key className="h-4 w-4" />
                                Change Password
                            </Button>
                        </div>

                        {/* Logout (mobile) */}
                        <div className="pt-2 mt-2">
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
                </div>
            )}

            <ChangePasswordDialog
                open={passwordDialogOpen}
                onOpenChange={setPasswordDialogOpen}
            />
        </nav>
    )
}
