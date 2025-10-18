const browserBase = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000/api/v1'
const serverBase = process.env.INTERNAL_API_BASE || browserBase

export const API_BASE = typeof window === 'undefined' ? serverBase : browserBase
