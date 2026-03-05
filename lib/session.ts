import { cookies } from "next/headers"

const SESSION_DURATION = 24 * 60 * 60 * 1000 // 24 hours

export async function createSession(adminId: string) {
  const sessionToken = require("crypto").randomBytes(32).toString("hex")
  const expiresAt = new Date(Date.now() + SESSION_DURATION)

  const cookieStore = await cookies()
  cookieStore.set("session", sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_DURATION / 1000,
    path: "/",
  })

  return { sessionToken, expiresAt }
}

export async function getAdminFromSession() {
  const cookieStore = await cookies()
  const sessionToken = cookieStore.get("session")?.value

  if (!sessionToken) return null

  try {
    // In a production app, you'd validate the session token in the database
    // For now, we're using a simple JWT-like approach with the admin ID in the token
    return sessionToken
  } catch (error) {
    return null
  }
}

export async function destroySession() {
  const cookieStore = await cookies()
  cookieStore.delete("session")
}
