import { z } from "zod";

export const batchStudentSchema = z.object({
    "First Name": z.string().min(1, "First Name is required"),
    "Last Name": z.string().min(1, "Last Name is required"),
    "Student Number": z.union([z.string(), z.number()]).transform(val => String(val)).refine(val => val.length > 0, "Student Number is required"),
    "Course": z.string().min(1, "Course is required"),
    "Email": z.string().email("Invalid email format").min(1, "Email is required"),
    "Year Level": z.union([z.number(), z.string(), z.null()]).transform((val) => {
        if (val === null || val === undefined) return null;
        const num = typeof val === "string" ? parseInt(val, 10) : val;
        return isNaN(num) ? null : num;
    }).refine(val => val === null || (val >= 1 && val <= 4), "Year Level must be between 1 and 4").optional().nullable(),
    "Section": z.string().optional().nullable(),
    "QR Code": z.string().optional().nullable(),
});

export const batchStudentsArraySchema = z.array(batchStudentSchema);

export type BatchStudentInput = z.infer<typeof batchStudentSchema>;
