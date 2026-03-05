import sql from "@/lib/db"

export async function GET() {
  try {
    const receipts = await sql("SELECT * FROM fine_receipts ORDER BY payment_date DESC")
    return Response.json(receipts)
  } catch (error) {
    console.error("Error fetching receipts:", error)
    return Response.json({ message: "Error fetching receipts" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { fine_id, amount_paid, payment_method, payment_date } = await request.json()

    // Generate receipt number
    const receiptNumber = `RCP-${Date.now()}`

    await sql(
      `INSERT INTO fine_receipts (fine_id, receipt_number, payment_date, amount_paid, payment_method)
       VALUES ($1, $2, $3, $4, $5)`,
      [fine_id, receiptNumber, payment_date, amount_paid, payment_method],
    )

    // Update fine status to paid
    await sql(`UPDATE fines SET status = 'paid', paid_date = $1 WHERE id = $2`, [payment_date, fine_id])

    return Response.json({ message: "Receipt created" }, { status: 201 })
  } catch (error) {
    console.error("Error creating receipt:", error)
    return Response.json({ message: "Error creating receipt" }, { status: 500 })
  }
}
