import { MESSAGE_MAX, NICKNAME_MAX } from '../config'

// 用「字」(Unicode 字元)計算,表情符號算 1 個字。
export function charCount(s: string): number {
  return Array.from(s).length
}

export function clamp(s: string, max: number): string {
  const chars = Array.from(s)
  return chars.length <= max ? s : chars.slice(0, max).join('')
}

export function clampNickname(s: string): string {
  return clamp(s, NICKNAME_MAX)
}

export function clampMessage(s: string): string {
  return clamp(s, MESSAGE_MAX)
}

export function validateNickname(raw: string): { ok: true; value: string } | { ok: false; error: string } {
  const value = raw.trim()
  if (value.length === 0) {
    return { ok: false, error: '代號不能是空白,請輸入至少一個字。' }
  }
  if (charCount(value) > NICKNAME_MAX) {
    return { ok: false, error: `代號最多 ${NICKNAME_MAX} 個字。` }
  }
  return { ok: true, value }
}

export function normalizeMessage(raw: string): string | null {
  const value = raw.trim()
  if (value.length === 0 || charCount(value) > MESSAGE_MAX) return null
  return value
}

export function formatTime(iso: string): string {
  const d = new Date(iso)
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
}
