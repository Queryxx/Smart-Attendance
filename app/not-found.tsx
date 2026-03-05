import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Footer } from "@/components/footer"
import { HelpCircle, ArrowLeft, Home, Ghost } from "lucide-react"

export default function NotFound() {
    return (
        <div className="h-screen flex flex-col items-center justify-center bg-white p-6 overflow-hidden relative">
            {/* Background Decorative Element */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-[0.03]">
                <Ghost className="absolute -top-20 -right-20 w-[400px] h-[400px]" />
                <Ghost className="absolute -bottom-20 -left-20 w-[300px] h-[300px]" />
            </div>

            <div className="w-full max-w-2xl flex-1 flex flex-col items-center justify-center z-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
                <div className="text-center mb-12">
                    <img
                        src="/logo.png"
                        alt="UA Logo"
                        className="w-28 h-28 rounded-full mx-auto mb-8 shadow-2xl border-4 border-slate-50 hover:scale-105 transition-transform duration-500"
                    />
                    <div className="inline-block px-4 py-1.5 bg-slate-100 rounded-full text-[10px] font-black tracking-[0.2em] text-slate-500 uppercase mb-4">
                        System Alert: 404
                    </div>
                    <h1 className="text-6xl font-black text-slate-900 tracking-tighter mb-4 lg:text-8xl">
                        LOST IN <span className="text-sidebar-primary">SPACE</span>
                    </h1>
                    <p className="text-slate-500 text-lg lg:text-xl font-medium max-w-lg mx-auto leading-relaxed">
                        The page you're looking for seems to have vanished into the digital void. Let's get you back on track.
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
                    <Button
                        className="flex-1 h-14 bg-sidebar-primary hover:bg-sidebar-primary/90 text-white font-bold text-base rounded-2xl shadow-xl hover:shadow-sidebar-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3"
                        asChild
                    >
                        <Link href="/dashboard">
                            <Home size={20} />
                            Dashboard
                        </Link>
                    </Button>

                    <Button
                        variant="outline"
                        className="flex-1 h-14 border-2 border-slate-200 hover:border-sidebar-primary hover:bg-slate-50 text-slate-600 hover:text-sidebar-primary font-bold text-base rounded-2xl transition-all flex items-center justify-center gap-3"
                        asChild
                    >
                        <Link href="/login">
                            <ArrowLeft size={20} />
                            Login Page
                        </Link>
                    </Button>
                </div>

                <div className="mt-12 flex items-center gap-2 text-slate-300">
                    <div className="h-[1px] w-8 bg-current"></div>
                    <span className="text-[10px] font-black uppercase tracking-widest">Smart Attendance Management</span>
                    <div className="h-[1px] w-8 bg-current"></div>
                </div>
            </div>

            <div className="py-8 z-10 w-full flex justify-center">
                <Footer />
            </div>
        </div>
    )
}
