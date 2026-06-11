import { useEffect, useRef } from 'react'
import flatpickr from 'flatpickr'
import 'flatpickr/dist/flatpickr.min.css'

interface Props {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export default function DatePicker({ value, onChange, placeholder, className }: Props) {
  const ref = useRef<HTMLInputElement>(null)
  const fpRef = useRef<ReturnType<typeof flatpickr> | null>(null)

  useEffect(() => {
    if (!ref.current) return
    fpRef.current = flatpickr(ref.current, {
      dateFormat: 'Y-m-d',
      allowInput: true,
      onChange: ([date]) => {
        if (date) {
          const y = date.getFullYear()
          const m = String(date.getMonth() + 1).padStart(2, '0')
          const d = String(date.getDate()).padStart(2, '0')
          onChange(`${y}-${m}-${d}`)
        } else {
          onChange('')
        }
      },
    })
    return () => {
      ;(fpRef.current as flatpickr.Instance | null)?.destroy()
    }
  }, [])

  useEffect(() => {
    const fp = fpRef.current as flatpickr.Instance | null
    if (!fp) return
    if (value) {
      fp.setDate(value, false)
    } else {
      fp.clear()
    }
  }, [value])

  return (
    <input
      ref={ref}
      className={className}
      placeholder={placeholder ?? 'YYYY-MM-DD'}
      readOnly
    />
  )
}
