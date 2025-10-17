"use client"
import axios from 'axios'
import { useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { API_BASE } from '@/lib/env'

export function useAuthedAxios() {
  const { data: session } = useSession()
  const token = (session as any)?.accessToken as string | undefined
  return useMemo(() => {
    const instance = axios.create({ baseURL: API_BASE, withCredentials: true })
    if (token) {
      instance.interceptors.request.use((config) => {
        config.headers = config.headers || {}
        config.headers.Authorization = `Bearer ${token}`
        return config
      })
    }
    return instance
  }, [token])
}
