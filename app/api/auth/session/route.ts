import { cookies } from "next/headers"

export async function GET() {
  const cookieStore = await cookies()
  const session = cookieStore.get("admin_session")

  if (!session) {
    return Response.json({ message: "No session" }, { status: 401 })
  }

  return Response.json({ message: "Session exists" }, { status: 200 })
}
