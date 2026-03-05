import pkg from "pg"
const { Pool } = pkg

const pool = new Pool({
  user: process.env.PGUSER,
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  password: process.env.PGPASSWORD,
  port: parseInt(process.env.PGPORT || "5432"),
})

async function sql(query: string, params?: any[]) {
  try {
    const result = await pool.query(query, params)
    return result.rows
  } catch (error) {
    console.error("Database error:", error)
    throw error
  }
}

export default sql

