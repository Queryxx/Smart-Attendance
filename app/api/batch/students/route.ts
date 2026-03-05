import sql from "@/lib/db";
import { cookies } from "next/headers";
import { batchStudentsArraySchema, BatchStudentInput } from "../../validators/batch-students";

async function checkRegistrarAccess() {
    const cookieStore = await cookies();
    const adminSession = cookieStore.get("admin_session")?.value;

    if (!adminSession) return false;

    const adminId = parseInt(adminSession, 10);
    if (isNaN(adminId)) return false;

    const user = await sql("SELECT role FROM admins WHERE id = $1", [adminId]);
    if (user.length === 0) return false;

    return user[0].role === "superadmin" || user[0].role === "student_registrar";
}

export async function POST(request: Request) {
    if (!(await checkRegistrarAccess())) {
        return Response.json({ message: "Unauthorized" }, { status: 403 });
    }

    try {
        const body = await request.json();
        const validation = batchStudentsArraySchema.safeParse(body);

        if (!validation.success) {
            const formattedErrors = validation.error.errors.map(err => {
                const rowNum = Number(err.path[0]) + 2; // +1 for 0-index, +1 for header row
                const field = err.path[1];
                return `Row ${rowNum} (${field}): ${err.message}`;
            });
            return Response.json(
                { message: "Validation failed", errors: formattedErrors },
                { status: 400 }
            );
        }


        const studentsToImport = validation.data;

        // Fetch courses and sections for resolution
        const [courses, sections] = await Promise.all([
            sql("SELECT id, course_code, course_name FROM courses"),
            sql("SELECT id, course_id, section_name FROM sections"),
        ]);

        const courseMap = new Map<string, number>();
        courses.forEach((c: any) => {
            courseMap.set(c.course_code.toLowerCase(), c.id);
            courseMap.set(c.course_name.toLowerCase(), c.id);
        });

        const sectionMap = new Map<string, number>();
        sections.forEach((s: any) => {
            sectionMap.set(`${s.course_id}-${s.section_name.toLowerCase()}`, s.id);
        });

        let successCount = 0;
        let skipCount = 0;
        const errors: string[] = [];

        for (const student of studentsToImport) {
            try {
                const courseId = courseMap.get(student.Course.trim().toLowerCase());
                if (!courseId) {
                    errors.push(`Course "${student.Course}" not found for student ${student["Student Number"]}`);
                    skipCount++;
                    continue;
                }

                let sectionId = null;
                if (student.Section) {
                    sectionId = sectionMap.get(`${courseId}-${student.Section.trim().toLowerCase()}`);
                    if (!sectionId) {
                        // Optional: Auto-create section? For now, let's just log it and leave as null or skip
                        // The prompt didn't specify, so I'll skip if section is provided but not found
                        errors.push(`Section "${student.Section}" not found in course "${student.Course}" for student ${student["Student Number"]}`);
                        skipCount++;
                        continue;
                    }
                }

                let finalQrCode = student["QR Code"];
                if (!finalQrCode) {
                    finalQrCode = `STU-${Math.random().toString(36).substring(2, 10).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
                }

                await sql(
                    `INSERT INTO students (student_number, first_name, last_name, email, qr_code, year_level, course_id, section_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT (student_number) 
           DO UPDATE SET 
             first_name = EXCLUDED.first_name,
             last_name = EXCLUDED.last_name,
             email = EXCLUDED.email,
             qr_code = EXCLUDED.qr_code,
             year_level = EXCLUDED.year_level,
             course_id = EXCLUDED.course_id,
             section_id = EXCLUDED.section_id`,
                    [
                        student["Student Number"],
                        student["First Name"],
                        student["Last Name"],
                        student["Email"],
                        finalQrCode,
                        student["Year Level"] || null,
                        courseId,
                        sectionId,
                    ]
                );
                successCount++;
            } catch (err: any) {
                console.error("Error importing student:", err);
                errors.push(`Failed to import student ${student["Student Number"]}: ${err.message}`);
                skipCount++;
            }
        }

        return Response.json({
            message: "Batch import completed",
            summary: {
                total: studentsToImport.length,
                success: successCount,
                skipped: skipCount,
            },
            errors: errors.length > 0 ? errors : undefined,
        });
    } catch (error: any) {
        console.error("Batch import error:", error);
        return Response.json({ message: "Internal server error" }, { status: 500 });
    }
}
