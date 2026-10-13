import type { ChatTransport } from './transport/ChatTransport'
import { MockTransport } from './transport/MockTransport'

export const APP_NAME = '匿名聊天室'
export const NICKNAME_MAX = 12
export const MESSAGE_MAX = 200
export const HISTORY_LIMIT = 50

// 離開寬限期:別人斷線後,等這麼久還沒回來才顯示「離開了」。
// 測試時可在網址加上 ?grace=3 縮短成 3 秒。
const DEFAULT_GRACE_SECONDS = 30
export function graceMs(): number {
  const raw = new URLSearchParams(window.location.search).get('grace')
  const n = raw === null ? NaN : Number(raw)
  const seconds = Number.isFinite(n) && n >= 0 ? n : DEFAULT_GRACE_SECONDS
  return seconds * 1000
}

// 階段一:一律使用假的通訊層。
// 階段二:在這裡改成依設定回傳 SupabaseTransport,畫面程式完全不用動。
export function createTransport(): ChatTransport {
  return new MockTransport()
}
