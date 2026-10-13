// 通訊約定:對應 docs/architecture.md 第 5 節。畫面與通訊層都只依賴這份型別。

export interface ChatMessage {
  id: number
  nickname: string
  text: string
  sentAt: string
  senderId: string
}

export interface OnlineUser {
  senderId: string
  nickname: string
  joinedAt: string
}

export type ConnectionState = 'connected' | 'reconnecting' | 'disconnected'

export interface TransportEvents {
  message: ChatMessage
  presence: OnlineUser[]
  user_joined: OnlineUser
  user_left: OnlineUser
  connection: ConnectionState
}

export type TransportEventName = keyof TransportEvents
