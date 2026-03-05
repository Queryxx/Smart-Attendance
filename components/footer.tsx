import Link from "next/link"
import { Facebook, Mail, Code } from "lucide-react"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
    DialogDescription
} from "@/components/ui/dialog"

export function Footer() {
    return (
        <footer className="w-full py-6 border-t border-slate-200">
            <div className="flex justify-center gap-6 mb-4 items-center">
                <a href="https://www.facebook.com/asistictso" target="_blank" rel="noopener noreferrer" className="text-slate-600 hover:text-slate-900 transition-colors flex items-center gap-1">
                    <Facebook size={18} />
                    Facebook
                </a>
                <a href="mailto:bsit@asist.edu.ph.com" className="text-slate-600 hover:text-slate-900 transition-colors flex items-center gap-1">
                    <Mail size={18} />
                    Email
                </a>
            </div>
            <div className="flex flex-col items-center gap-2 text-sm text-slate-600">
                <p>&copy; 2026 UA Smart Attendance System. All rights reserved.</p>
                <Dialog>
                    <DialogTrigger asChild>
                        <button className="text-slate-600 hover:text-sidebar-primary transition-all flex items-center gap-1 group">
                            <Code size={18} className="group-hover:scale-110 transition-transform" />
                            Developed by: <span className="font-semibold underline decoration-dotted underline-offset-4">BSIT 3</span>
                        </button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md bg-white border-2 border-sidebar-primary/10">
                        <DialogHeader>
                            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-sidebar-primary to-sidebar-primary/60 bg-clip-text text-transparent">
                                Development Team
                            </DialogTitle>
                            <DialogDescription>
                                The brilliant minds behind UA Smart Attendance System.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-6 py-4">
                            <div className="space-y-3">
                                <h3 className="text-sm font-bold text-sidebar-primary flex items-center gap-2">
                                    <span className="w-1 h-4 bg-sidebar-primary rounded-full"></span>
                                    Student Management & Admin Side
                                </h3>
                                <div className="grid grid-cols-2 gap-2 pl-3">
                                    {["John Rix Domaoal", "Abigail Ola", "Mark Arvin Leppago", "Catherine Joy Brillantes"].map((name) => (
                                        <p key={name} className="text-sm text-slate-700 font-medium">• {name}</p>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-3">
                                <h3 className="text-sm font-bold text-sidebar-primary flex items-center gap-2">
                                    <span className="w-1 h-4 bg-sidebar-primary rounded-full"></span>
                                    Fine Management
                                </h3>
                                <div className="grid grid-cols-2 gap-2 pl-3">
                                    {["Juan Miguel Barbosa", "Jobelyn Britos", "Allysa Ban-o", "Art Jan Villamor"].map((name) => (
                                        <p key={name} className="text-sm text-slate-700 font-medium">• {name}</p>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-3">
                                <h3 className="text-sm font-bold text-sidebar-primary flex items-center gap-2">
                                    <span className="w-1 h-4 bg-sidebar-primary rounded-full"></span>
                                    Receipt Management
                                </h3>
                                <div className="grid grid-cols-2 gap-2 pl-3">
                                    {["Joseph Zen Castro", "Reynalyn Alagao"].map((name) => (
                                        <p key={name} className="text-sm text-slate-700 font-medium">• {name}</p>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <div className="w-full text-center text-xs text-slate-400 italic">
                                Abra State Institute of Sciences and Technology
                            </div>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </footer>
    )
}
