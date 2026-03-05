import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import { formatReadableDate } from "./utils"

export interface FineReceipt {
    id: string
    student_id: number
    student_number: string
    student_name: string
    amount: number
    reason: string
    date: string
    status: string
    course?: string
}

export function exportFineReceiptPDF(fine: FineReceipt) {
    const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
    })

    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const margin = 15

    // Header - Receipt Title
    doc.setFontSize(20)
    doc.setFont("helvetica", "bold")
    doc.text("FINE RECEIPT", margin, margin + 10)

    // University Info
    doc.setFontSize(10)
    doc.setFont("helvetica", "normal")
    doc.text("University of Abra", margin, margin + 20)
    doc.text("Smart Attendance System", margin, margin + 26)

    // Receipt Number and Date
    doc.setFontSize(9)
    doc.setFont("helvetica", "bold")
    doc.text("Receipt #:", margin, margin + 35)
    doc.setFont("helvetica", "normal")
    doc.text(String(fine.id), margin + 20, margin + 35)

    doc.setFont("helvetica", "bold")
    doc.text("Date:", pageWidth - margin - 40, margin + 35)
    doc.setFont("helvetica", "normal")
    doc.text(formatReadableDate(fine.date), pageWidth - margin - 20, margin + 35)

    // Divider line
    doc.setLineWidth(0.5)
    doc.line(margin, margin + 40, pageWidth - margin, margin + 40)

    // Student Information
    doc.setFontSize(10)
    doc.setFont("helvetica", "bold")
    doc.text("STUDENT INFORMATION", margin, margin + 48)

    doc.setFontSize(9)
    doc.setFont("helvetica", "bold")
    doc.text("Student Name:", margin, margin + 55)
    doc.setFont("helvetica", "normal")
    doc.text(fine.student_name, margin + 35, margin + 55)

    let currentY = margin + 62
    doc.setFont("helvetica", "bold")
    doc.text("Student Number:", margin, currentY)
    doc.setFont("helvetica", "normal")
    doc.text(fine.student_number, margin + 35, currentY)

    if (fine.course) {
        currentY += 7
        doc.setFont("helvetica", "bold")
        doc.text("Course:", margin, currentY)
        doc.setFont("helvetica", "normal")
        doc.text(fine.course, margin + 35, currentY)
    }

    // Fine Details - Added margin top (gap from student info)
    currentY += 15
    doc.setFontSize(10)
    doc.setFont("helvetica", "bold")
    doc.text("FINE DETAILS", margin, currentY)

    currentY += 10
    doc.setFontSize(9)
    doc.setFont("helvetica", "bold")
    doc.text("Reason:", margin, currentY)
    doc.setFont("helvetica", "normal")
    const reasonLines = doc.splitTextToSize(String(fine.reason), pageWidth - margin * 2 - 35)
    doc.text(reasonLines, margin + 35, currentY)

    const reasonHeight = reasonLines.length * 5
    const amountYPos = currentY + reasonHeight + 10

    doc.setFont("helvetica", "bold")
    doc.text("Status:", margin, amountYPos)
    doc.setFont("helvetica", "normal")
    const statusText = fine.status ? fine.status.charAt(0).toUpperCase() + fine.status.slice(1) : "Unpaid"
    doc.text(statusText, margin + 35, amountYPos)

    // Amount Box
    doc.setFontSize(10)
    doc.setFont("helvetica", "bold")
    doc.setDrawColor(200)
    doc.setFillColor(240, 240, 240)
    doc.rect(margin, amountYPos + 10, pageWidth - margin * 2, 20, "FD")

    doc.setFontSize(11)
    doc.text("FINE AMOUNT", margin + 5, amountYPos + 17)

    doc.setFontSize(16)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(220, 38, 38) // Red color
    const amountText = `PHP ${Number(fine.amount).toFixed(2)}`
    doc.text(amountText, pageWidth - margin - 20, amountYPos + 17, { align: "right" })
    doc.setTextColor(0, 0, 0) // Reset to black

    // Footer
    const footerY = pageHeight - margin - 15
    doc.setFontSize(8)
    doc.setFont("helvetica", "normal")
    doc.setTextColor(100)
    doc.text("This is an official fine receipt from the University of Antique", pageWidth / 2, footerY, {
        align: "center",
    })
    doc.text(`Generated on ${new Date().toLocaleString()}`, pageWidth / 2, footerY + 5, { align: "center" })

    // Download
    const fileName = `Fine_Receipt_${fine.student_number}_${new Date().toISOString().split("T")[0]}.pdf`
    doc.save(fileName)
}

export function exportMultipleFinesPDF(fines: FineReceipt[]) {
    const doc = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
    })

    const pageWidth = doc.internal.pageSize.getWidth()
    const margin = 15

    // Header
    doc.setFontSize(18)
    doc.setFont("helvetica", "bold")
    doc.text("FINE MANAGEMENT REPORT", margin, margin + 10)

    doc.setFontSize(10)
    doc.setFont("helvetica", "normal")
    doc.text(`Generated: ${new Date().toLocaleString()}`, margin, margin + 18)

    // Table
    const tableData = fines.map((fine) => [
        String(fine.student_number),
        String(fine.student_name),
        String(fine.course || "N/A"),
        String(fine.reason),
        `PHP ${Number(fine.amount).toFixed(2)}`,
        formatReadableDate(fine.date),
        fine.status ? fine.status.charAt(0).toUpperCase() + fine.status.slice(1) : "Unpaid",
    ])

    autoTable(doc, {
        head: [["Student #", "Student Name", "Course", "Reason", "Amount", "Date", "Status"]],
        body: tableData,
        startY: margin + 25,
        margin: margin,
        headStyles: {
            fillColor: [51, 65, 85],
            textColor: [255, 255, 255],
            fontStyle: "bold",
            fontSize: 10,
        },
        bodyStyles: {
            fontSize: 9,
        },
        alternateRowStyles: {
            fillColor: [245, 245, 245],
        },
        columnStyles: {
            4: { halign: "center" },
        },
    })

    // Total
    const totalAmount = fines.reduce((sum, fine) => sum + Number(fine.amount || 0), 0)
    const finalY = (doc as any).lastAutoTable.finalY + 10

    doc.setFont("helvetica", "bold")
    doc.setFontSize(11)
    doc.text(`Total Fines: PHP ${Number(totalAmount).toFixed(2)}`, pageWidth - margin - 30, finalY, { align: "right" })

    // Download
    const fileName = `Fines_Report_${new Date().toISOString().split("T")[0]}.pdf`
    doc.save(fileName)
}
