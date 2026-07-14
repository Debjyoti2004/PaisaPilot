'use client'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
export default function CalcRedirect() {
  const router = useRouter()
  useEffect(() => { router.replace('/investments') }, [router])
  return null
}
