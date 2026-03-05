import sql from "@/lib/db";
import { cookies } from "next/headers";

export async function GET(
    request: Request,
    { params }: { params: Promise<{ code: string }> }
) {
    try {
        const { code } = await params;

        const students = await sql(
            `SELECT s.*, c.course_name, sec.section_name 
             FROM students s
             LEFT JOIN courses c ON s.course_id = c.id
             LEFT JOIN sections sec ON s.section_id = sec.id
             WHERE s.qr_code = $1`,
            [code]
        );

        if (students.length === 0) {
            return Response.json({ message: "Student not found" }, { status: 404 });
        }

        return Response.json(students[0]);
    } catch (error) {
        console.error("Error fetching student by QR:", error);
        return Response.json({ message: "Internal server error" }, { status: 500 });
    }
}
