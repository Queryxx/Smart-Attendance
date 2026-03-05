import { z } from "zod";

export const batchFineSchema = z.object({
    "Student Number": z.union([z.string(), z.number()]).transform(val => String(val)).refine(val => val.length > 0, "Student Number is required"),
    "Student Name": z.string().optional().nullable(),
    "Fine Amount": z.union([z.number(), z.string()]).transform((val) => {
        const num = typeof val === "string" ? parseFloat(val) : val;
        return isNaN(num) ? 0 : num;
    }).refine(val => val >= 0, "Fine Amount must be a positive number"),
    "Reason": z.string().min(1, "Reason is required"),
    "Event": z.string().optional().nullable(),
    "Date": z.union([z.date(), z.string(), z.number(), z.null()]).transform((val) => {
        if (!val) return null;
        try {
            let dateObj: Date;
            if (typeof val === 'number') {
                dateObj = new Date((val - 25569) * 86400 * 1000);
            } else if (typeof val === 'string') {
                const parts = val.split(/[/-]/);
                if (parts.length === 3) {
                    if (parts[0].length === 4) {
                        dateObj = new Date(val); // YYYY-MM-DD
                    } else {
                        const m = parseInt(parts[0], 10);
                        const d = parseInt(parts[1], 10);
                        const y = parseInt(parts[2], 10);
                        dateObj = new Date(y, m - 1, d); // MM/DD/YYYY
                    }
                } else {
                    dateObj = new Date(val);
                }
            } else if (val instanceof Date) {
                dateObj = val;
            } else {
                return null;
            }

            if (isNaN(dateObj.getTime())) return null;
            return dateObj.toISOString().split("T")[0];
        } catch {
            return null;
        }
    }).refine((val) => {
        if (!val) return true;
        const now = new Date();
        const manilaTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
        const todayStr = manilaTime.toISOString().split('T')[0];
        return val <= todayStr;
    }, { message: "Fine date cannot be a future date" }).optional().nullable(),
});

export const batchFinesArraySchema = z.array(batchFineSchema);

export type BatchFineInput = z.infer<typeof batchFineSchema>;
