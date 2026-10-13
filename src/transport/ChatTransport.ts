import type { ChatMessage, OnlineUser, TransportEventName, TransportEvents } from '../types'

// 「合約」:畫面只認這份清單。階段一由 MockTransport 實作,階段二由 SupabaseTransport 實作。
// 對應 docs/architecture.md 第 4 節。

export interface ConnectResult {
  nickname: string // 實際使用的代號(重複時會被加上 #2)
  senderId: string // 匿名身分編號,不顯示給使用者
}

// 階段一專用的測試工具;真正的通訊層不需要提供。
export interface DevTools {
  simulateOffline(seconds: number): void
  isBotEnabled(): boolean
  setBotEnabled(enabled: boolean): void
}

export interface ChatTransport {
  connect(nickname: string): Promise<ConnectResult>
  disconnect(): void
  sendMessage(text: string): Promise<void>
  reportMessage(messageId: number): Promise<void>
  loadRecent(limit: number): Promise<ChatMessage[]>
  loadSince(lastId: number): Promise<ChatMessage[]>
  getOnlineUsers(): OnlineUser[]
  on<K extends TransportEventName>(event: K, handler: (payload: TransportEvents[K]) => void): () => void
  dev?: DevTools
}
