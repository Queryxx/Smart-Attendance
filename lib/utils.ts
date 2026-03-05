import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

/**
 * Get current time in Asia/Manila timezone
 * @returns {Date} Current date and time in Asia/Manila
 */
export function getAsiaTime(): Date {
    const now = new Date()
    const asiaTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Manila' }))
    return asiaTime
}

/**
 * Get formatted current time in Asia timezone
 * @param timezone - Timezone (default: 'Asia/Manila'), other options: 'Asia/Bangkok', 'Asia/Tokyo', 'Asia/Singapore', etc.
 * @returns {string} Formatted time string (HH:MM:SS)
 */
export function getAsiaTimeFormatted(timezone: string = 'Asia/Manila'): string {
    const now = new Date()
    const timeString = now.toLocaleString('en-US', {
        timeZone: timezone,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
    })
    return timeString
}

/**
 * Get formatted current date in Asia timezone
 * @param timezone - Timezone (default: 'Asia/Manila')
 * @returns {string} Formatted date string (YYYY-MM-DD)
 */
export function getAsiaDateFormatted(timezone: string = 'Asia/Manila'): string {
    const now = new Date()
    const dateString = now.toLocaleString('en-US', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    })
    const [month, day, year] = dateString.split('/')
    return `${year}-${month}-${day}`
}

/**
 * Format a date to readable format (e.g., "January 14, 2026")
 * @param date - Date object or date string
 * @returns {string} Readable date string
 */
export function formatReadableDate(date: Date | string): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    return dateObj.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    })
}

/**
 * Format time to 12-hour format with AM/PM (e.g., "2:30 PM")
 * @param time - Time string in HH:MM or HH:MM:SS format
 * @returns {string} 12-hour formatted time
 */
export function formatTo12Hour(time: string): string {
    // Handle HH:MM or HH:MM:SS format
    const parts = time.split(':')
    let hours = parseInt(parts[0], 10)
    const minutes = parts[1]

    const ampm = hours >= 12 ? 'PM' : 'AM'
    hours = hours % 12
    hours = hours ? hours : 12 // 0 should be 12

    return `${hours}:${minutes} ${ampm}`
}

/**
 * Format current time to 12-hour format with AM/PM
 * @param timezone - Timezone (default: 'Asia/Manila')
 * @returns {string} 12-hour formatted time with AM/PM
 */
export function getCurrentTime12Hour(timezone: string = 'Asia/Manila'): string {
    const now = new Date()
    const timeString = now.toLocaleString('en-US', {
        timeZone: timezone,
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
    })
    return timeString
}

/**
 * Get full formatted date and time in Asia timezone
 * @param timezone - Timezone (default: 'Asia/Manila')
 * @returns {string} Formatted datetime string (YYYY-MM-DD HH:MM:SS)
 */
export function getAsiaDateTime(timezone: string = 'Asia/Manila'): string {
    const date = getAsiaDateFormatted(timezone)
    const time = getAsiaTimeFormatted(timezone)
    return `${date} ${time}`
}

/**
 * Get current time details in Asia timezone
 * @param timezone - Timezone (default: 'Asia/Manila')
 * @returns {Object} Object with date, time, and full datetime
 */
export function getAsiaTimeDetails(timezone: string = 'Asia/Manila') {
    return {
        date: getAsiaDateFormatted(timezone),
        time: getAsiaTimeFormatted(timezone),
        dateTime: getAsiaDateTime(timezone),
        timestamp: new Date().getTime(),
    }
}

/**
 * Format a date/string into a readable localized string (e.g., "Jan 15, 2024, 10:30 AM")
 * @param date - Date object or date string
 * @returns {string} Readable localized date and time string
 */
export function toReadableDate(date: string | Date): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    return dateObj.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
    })
}
