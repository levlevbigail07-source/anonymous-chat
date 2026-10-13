import type { ChatMessage, OnlineUser, TransportEventName, TransportEvents } from '../types'
import type { ChatTransport, ConnectResult, DevTools } from './ChatTransport'

// 階段一的「假」通訊層。
// 用 BroadcastChannel(同一個瀏覽器的不同分頁互傳訊息)模擬「別人」,
// 用 localStorage 保存歷史訊息。所以只有同一個瀏覽器的分頁之間會互通。

const CHANNEL_NAME = 'anonymous-chat-v1'
const MESSAGES_KEY = 'anonchat:v1:messages'
const REPORTS_KEY = 'anonchat:v1:reports'
const SENDER_ID_KEY = 'anonchat:v1:senderId'
const STORE_CAP = 500
const PING_MS = 2000
const STALE_MS = 6000
const DISCOVER_MS = 400
const BOT_MESSAGE_MS = 9000

type Wire =
  | { t: 'ping'; user: OnlineUser }
  | { t: 'who' }
  | { t: 'leave'; senderId: string }
  | { t: 'message'; msg: ChatMessage }

type AnyHandler = (payload: never) => void

const BOT_LINES = [
  '大家好,我是示範用的小幫手。',
  '今天天氣不錯,有人在嗎?',
  '這是階段一的假資料,真正的聊天要等接上 Supabase。',
  '你可以試試開第二個分頁,用不同的代號進來。',
  '往上滑動,再等我說話,就會看到「有新訊息」按鈕。',
]

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // 儲存空間滿了或被停用:忽略,畫面仍可繼續使用
  }
}

function loadSenderId(): string {
  try {
    const existing = sessionStorage.getItem(SENDER_ID_KEY)
    if (existing) return existing
    const id = crypto.randomUUID()
    sessionStorage.setItem(SENDER_ID_KEY, id)
    return id
  } catch {
    return crypto.randomUUID()
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export class MockTransport implements ChatTransport {
  private channel = new BroadcastChannel(CHANNEL_NAME)
  private handlers = new Map<string, Set<AnyHandler>>()
  private others = new Map<string, { user: OnlineUser; seen: number; bot?: boolean }>()
  private me: OnlineUser | null = null
  private senderId = loadSenderId()
  private tickTimer: ReturnType<typeof setInterval> | null = null
  private botTimer: ReturnType<typeof setInterval> | null = null
  private botUser: OnlineUser | null = null
  private offline = false
  private discovering = false

  dev: DevTools = {
    simulateOffline: (seconds) => this.simulateOffline(seconds),
    isBotEnabled: () => this.botUser !== null,
    setBotEnabled: (enabled) => this.setBot(enabled),
  }

  constructor() {
    this.channel.onmessage = (ev: MessageEvent<Wire>) => this.onWire(ev.data)
    window.addEventListener('pagehide', () => this.announceLeave())
  }

  // ---- 合約 ----

  async connect(nickname: string): Promise<ConnectResult> {
    // 先探測目前有誰在線(探測期間 me 還是空的,但要收得到回應)
    this.discovering = true
    this.channel.postMessage({ t: 'who' } satisfies Wire)
    await sleep(DISCOVER_MS)
    this.discovering = false

    // 「複製分頁」會連 sessionStorage 一起複製,兩個分頁會拿到同一個身分編號。
    // 發現已有在線的人用同一個編號,就換一個新的,否則會被當成同一個人。
    if (this.others.has(this.senderId)) {
      this.senderId = crypto.randomUUID()
      try {
        sessionStorage.setItem(SENDER_ID_KEY, this.senderId)
      } catch {
        // 無法儲存也沒關係,這次連線仍使用新的編號
      }
    }

    // 同名時自動加編號:小明 → 小明#2 → 小明#3
    const taken = new Set<string>()
    for (const o of this.others.values()) taken.add(o.user.nickname)
    let name = nickname
    let n = 2
    while (taken.has(name)) name = `${nickname}#${n++}`

    this.me = { senderId: this.senderId, nickname: name, joinedAt: new Date().toISOString() }
    this.startTicking()
    this.sendPing()
    this.emit('presence', this.onlineUsers())
    this.emit('connection', 'connected')
    return { nickname: name, senderId: this.senderId }
  }

  disconnect(): void {
    this.announceLeave()
    this.setBot(false)
    if (this.tickTimer) clearInterval(this.tickTimer)
    this.tickTimer = null
    this.me = null
  }

  async sendMessage(text: string): Promise<void> {
    if (!this.me) throw new Error('尚未進入聊天室')
    if (this.offline) throw new Error('連線中斷')
    const msg = this.appendMessage(this.me.nickname, this.me.senderId, text)
    this.channel.postMessage({ t: 'message', msg } satisfies Wire)
    this.emit('message', msg)
  }

  async reportMessage(messageId: number): Promise<void> {
    if (!this.me) throw new Error('尚未進入聊天室')
    const key = `${this.me.senderId}:${messageId}`
    const reports = readJson<string[]>(REPORTS_KEY, [])
    // 同一人對同一則訊息只算一次
    if (!reports.includes(key)) writeJson(REPORTS_KEY, [...reports, key])
  }

  async loadRecent(limit: number): Promise<ChatMessage[]> {
    return readJson<ChatMessage[]>(MESSAGES_KEY, []).slice(-limit)
  }

  async loadSince(lastId: number): Promise<ChatMessage[]> {
    return readJson<ChatMessage[]>(MESSAGES_KEY, []).filter((m) => m.id > lastId)
  }

  getOnlineUsers(): OnlineUser[] {
    return this.onlineUsers()
  }

  on<K extends TransportEventName>(event: K, handler: (payload: TransportEvents[K]) => void): () => void {
    let set = this.handlers.get(event)
    if (!set) {
      set = new Set()
      this.handlers.set(event, set)
    }
    const h = handler as unknown as AnyHandler
    set.add(h)
    return () => {
      set.delete(h)
    }
  }

  // ---- 內部 ----

  private emit<K extends TransportEventName>(event: K, payload: TransportEvents[K]): void {
    this.handlers.get(event)?.forEach((h) => (h as unknown as (p: TransportEvents[K]) => void)(payload))
  }

  private onlineUsers(): OnlineUser[] {
    const list: OnlineUser[] = []
    if (this.me) list.push(this.me)
    for (const o of this.others.values()) list.push(o.user)
    return list
  }

  private appendMessage(nickname: string, senderId: string, text: string): ChatMessage {
    const all = readJson<ChatMessage[]>(MESSAGES_KEY, [])
    const nextId = all.reduce((max, m) => Math.max(max, m.id), 0) + 1
    const msg: ChatMessage = { id: nextId, nickname, text, sentAt: new Date().toISOString(), senderId }
    writeJson(MESSAGES_KEY, [...all, msg].slice(-STORE_CAP))
    return msg
  }

  private sendPing(): void {
    if (this.offline) return
    if (this.me) this.channel.postMessage({ t: 'ping', user: this.me } satisfies Wire)
    if (this.botUser) this.channel.postMessage({ t: 'ping', user: this.botUser } satisfies Wire)
  }

  private announceLeave(): void {
    if (this.me) this.channel.postMessage({ t: 'leave', senderId: this.me.senderId } satisfies Wire)
    if (this.botUser) this.channel.postMessage({ t: 'leave', senderId: this.botUser.senderId } satisfies Wire)
  }

  private startTicking(): void {
    if (this.tickTimer) return
    this.tickTimer = setInterval(() => {
      if (this.offline) return
      this.sendPing()
      const now = Date.now()
      for (const [id, o] of this.others) {
        if (!o.bot && now - o.seen > STALE_MS) {
          this.others.delete(id)
          this.emit('user_left', o.user)
          this.emit('presence', this.onlineUsers())
        }
      }
    }, PING_MS)
  }

  private onWire(data: Wire): void {
    // 探測期間(discovering)也要收別人的回應;但還沒進入時不通知畫面
    if (this.offline || (!this.me && !this.discovering)) return
    switch (data.t) {
      case 'who':
        this.sendPing()
        break
      case 'ping': {
        const known = this.others.has(data.user.senderId)
        this.others.set(data.user.senderId, { user: data.user, seen: Date.now() })
        if (!known && this.me) {
          this.emit('user_joined', data.user)
          this.emit('presence', this.onlineUsers())
        }
        break
      }
      case 'leave': {
        const o = this.others.get(data.senderId)
        if (o) {
          this.others.delete(data.senderId)
          this.emit('user_left', o.user)
          this.emit('presence', this.onlineUsers())
        }
        break
      }
      case 'message':
        this.emit('message', data.msg)
        break
    }
  }

  // ---- 測試工具 ----

  private simulateOffline(seconds: number): void {
    if (!this.me || this.offline) return
    this.offline = true
    this.emit('connection', 'reconnecting')
    setTimeout(() => {
      this.offline = false
      const now = Date.now()
      for (const o of this.others.values()) o.seen = now
      this.channel.postMessage({ t: 'who' } satisfies Wire)
      this.sendPing()
      this.emit('connection', 'connected')
    }, seconds * 1000)
  }

  private setBot(enabled: boolean): void {
    if (enabled === (this.botUser !== null)) return
    if (enabled) {
      const bot: OnlineUser = {
        senderId: `bot-${this.senderId}`,
        nickname: '示範小幫手',
        joinedAt: new Date().toISOString(),
      }
      this.botUser = bot
      this.others.set(bot.senderId, { user: bot, seen: Date.now(), bot: true })
      this.emit('user_joined', bot)
      this.emit('presence', this.onlineUsers())
      this.sendPing()
      this.botTimer = setInterval(() => {
        if (this.offline) return
        const line = BOT_LINES[Math.floor(Math.random() * BOT_LINES.length)]
        const msg = this.appendMessage(bot.nickname, bot.senderId, line)
        this.channel.postMessage({ t: 'message', msg } satisfies Wire)
        this.emit('message', msg)
      }, BOT_MESSAGE_MS)
    } else if (this.botUser) {
      const bot = this.botUser
      if (this.botTimer) clearInterval(this.botTimer)
      this.botTimer = null
      this.channel.postMessage({ t: 'leave', senderId: bot.senderId } satisfies Wire)
      this.botUser = null
      this.others.delete(bot.senderId)
      this.emit('user_left', bot)
      this.emit('presence', this.onlineUsers())
    }
  }
}
