"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus } from "lucide-react"

interface Receipt {
  id: string
  receipt_number: string
  fine_id: string
  payment_date: string
  amount_paid: number
  payment_method: string
}

export function FineReceipts() {
  const [receipts, setReceipts] = useState<Receipt[]>([])
  const [fines, setFines] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({ fine_id: "", amount_paid: "", payment_method: "cash", payment_date: "" })

  useEffect(() => {
    fetchReceipts()
    fetchFines()
  }, [])

  async function fetchReceipts() {
    try {
      const response = await fetch("/api/fine-receipts")
      const data = await response.json()
      setReceipts(data)
    } catch (error) {
      console.error("Error fetching receipts:", error)
    } finally {
      setLoading(false)
    }
  }

  async function fetchFines() {
    try {
      const response = await fetch("/api/fines?status=pending")
      const data = await response.json()
      setFines(data)
    } catch (error) {
      console.error("Error fetching fines:", error)
    }
  }

  async function handleAddReceipt(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch("/api/fine-receipts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fine_id: formData.fine_id,
          amount_paid: Number.parseFloat(formData.amount_paid),
          payment_method: formData.payment_method,
          payment_date: formData.payment_date,
        }),
      })

      if (response.ok) {
        setShowForm(false)
        setFormData({ fine_id: "", amount_paid: "", payment_method: "cash", payment_date: "" })
        fetchReceipts()
        fetchFines()
      }
    } catch (error) {
      console.error("Error creating receipt:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Fine Receipts</CardTitle>
            <CardDescription>Track fine payments and receipts</CardDescription>
          </div>
          <Button onClick={() => setShowForm(!showForm)} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Receipt
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {showForm && (
          <form onSubmit={handleAddReceipt} className="border border-border rounded-lg p-4 space-y-4">
            <div>
              <Label htmlFor="fine">Fine</Label>
              <select
                id="fine"
                value={formData.fine_id}
                onChange={(e) => setFormData({ ...formData, fine_id: e.target.value })}
                required
                className="w-full border border-input rounded-md px-3 py-2 text-sm"
              >
                <option value="">Select a fine</option>
                {fines.map((fine) => (
                  <option key={fine.id} value={fine.id}>
                    {fine.student_name} - Rs. {fine.amount}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="amountPaid">Amount Paid</Label>
              <Input
                id="amountPaid"
                type="number"
                step="0.01"
                value={formData.amount_paid}
                onChange={(e) => setFormData({ ...formData, amount_paid: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="paymentMethod">Payment Method</Label>
              <select
                id="paymentMethod"
                value={formData.payment_method}
                onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                className="w-full border border-input rounded-md px-3 py-2 text-sm"
              >
                <option value="cash">Cash</option>
                <option value="check">Check</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="online">Online</option>
              </select>
            </div>

            <div>
              <Label htmlFor="paymentDate">Payment Date</Label>
              <Input
                id="paymentDate"
                type="date"
                value={formData.payment_date}
                onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                required
              />
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={loading}>
                {loading ? "Adding..." : "Add Receipt"}
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            </div>
          </form>
        )}

        {loading ? (
          <div className="text-center py-8">Loading...</div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Receipt Number</TableHead>
                  <TableHead>Amount Paid</TableHead>
                  <TableHead>Payment Method</TableHead>
                  <TableHead>Payment Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {receipts.map((receipt) => (
                  <TableRow key={receipt.id}>
                    <TableCell className="font-medium">{receipt.receipt_number}</TableCell>
                    <TableCell>Rs. {receipt.amount_paid}</TableCell>
                    <TableCell>{receipt.payment_method}</TableCell>
                    <TableCell>{new Date(receipt.payment_date).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
