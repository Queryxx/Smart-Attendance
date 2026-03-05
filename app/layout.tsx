import type { Metadata } from 'next'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

export const metadata: Metadata = {
    title: 'UA Smart Attendace',
    description: 'Smart Attendance Tracking System for UA Students',
    generator: 'Next.js',
    icons: {
        icon: [
            {
                url: '/logo.png',
                media: '(prefers-color-scheme: light)',
            },
            {
                url: '/logo.png',
                media: '(prefers-color-scheme: dark)',
            },
            {
                url: '/icon.svg',
                type: 'image/svg+xml',
            },
        ],
        apple: '/logo.png',
    },
}

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode
}>) {
    return (
        <html lang="en">
            <body className="font-sans antialiased">
                {children}
                <Analytics />
            </body>
        </html>
    )
}
