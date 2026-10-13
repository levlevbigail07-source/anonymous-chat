import { useEffect, useRef, useState } from 'react'
import { HISTORY_LIMIT, graceMs } from '../config'
import type { ChatTransport } from '../transport/ChatTransport'
import type { ChatMessage, ConnectionState, OnlineUser } from '../types'

export type TimelineItem =
  | { kind: 'message'; key: string; msg: ChatMessage }
  | { kind: 'system'; key: string; text: string }

interface Options {
  transport: ChatTransport
  initialNotice?: string
  onIncoming?: (msg: ChatMessage) => void
  selfId: string
}

// 把通訊層的事件整理成畫面要用的狀態:時間軸、在線名單、連線狀態。
// 這裡不認得 Mock 或 Supabase,只認 ChatTransport。
export function useChat({ transport, initialNotice, onIncoming, selfId }: Options) {
  const [items, setItems] = useState<TimelineItem[]>([])
  const [users, setUsers] = useState<OnlineUser[]>(() => transport.getOnlineUsers())
  const [connection, setConnection] = useState<ConnectionState>('connected')
  const [loaded, setLoaded] = useState(false)

  const lastIdRef = useRef(0)
  const noticeCounter = useRef(0)
  const onIncomingRef = useRef(onIncoming)
  onIncomingRef.current = onIncoming

  useEffect(() => {
    let cancelled = false
    let rawUsers: OnlineUser[] = transport.getOnlineUsers()
    // 剛離開、還在寬限期內的人:名單上仍保留,時間到才真的移除並顯示「離開了」
    const pending = new Map<string, { user: OnlineUser; timer: ReturnType<typeof setTimeout> }>()
    let connectionState: ConnectionState = 'connected'

    const refreshUsers = () => {
      const live = new Set(rawUsers.map((u) => u.senderId))
      const extra = [...pending.values()].map((p) => p.user).filter((u) => !live.has(u.senderId))
      setUsers([...rawUsers, ...extra])
    }

    const addNotice = (text: string) => {
      noticeCounter.current += 1
      const key = `sys-${noticeCounter.current}`
      setItems((prev) => [...prev, { kind: 'system', key, text }])
    }

    const addMessage = (msg: ChatMessage) => {
      lastIdRef.current = Math.max(lastIdRef.current, msg.id)
      setItems((prev) => {
        if (prev.some((i) => i.kind === 'message' && i.msg.id === msg.id)) return prev
        return [...prev, { kind: 'message', key: `msg-${msg.id}`, msg }]
      })
    }

    transport.loadRecent(HISTORY_LIMIT).then((history) => {
      if (cancelled) return
      history.forEach((m) => {
        lastIdRef.current = Math.max(lastIdRef.current, m.id)
      })
      setItems((prev) => {
        const have = new Set(prev.filter((i) => i.kind === 'message').map((i) => (i as { msg: ChatMessage }).msg.id))
        const base: TimelineItem[] = history
          .filter((m) => !have.has(m.id))
          .map((m) => ({ kind: 'message', key: `msg-${m.id}`, msg: m }))
        const notice: TimelineItem[] = initialNotice
          ? [{ kind: 'system', key: 'sys-initial', text: initialNotice }]
          : []
        return [...base, ...notice, ...prev]
      })
      setLoaded(true)
    })

    const offs = [
      transport.on('message', (msg) => {
        addMessage(msg)
        if (msg.senderId !== selfId) onIncomingRef.current?.(msg)
      }),
      transport.on('presence', (list) => {
        rawUsers = list
        refreshUsers()
      }),
      transport.on('user_joined', (user) => {
        const p = pending.get(user.senderId)
        if (p) {
          // 寬限期內回來:當作沒發生過
          clearTimeout(p.timer)
          pending.delete(user.senderId)
        } else {
          addNotice(`${user.nickname} 進來了`)
        }
        refreshUsers()
      }),
      transport.on('user_left', (user) => {
        if (pending.has(user.senderId)) return
        const timer = setTimeout(() => {
          pending.delete(user.senderId)
          addNotice(`${user.nickname} 離開了`)
          refreshUsers()
        }, graceMs())
        pending.set(user.senderId, { user, timer })
        refreshUsers()
      }),
      transport.on('connection', (state) => {
        const wasConnected = connectionState === 'connected'
        connectionState = state
        setConnection(state)
        if (state === 'connected' && !wasConnected) {
          // 斷線恢復:補上錯過的訊息
          transport.loadSince(lastIdRef.current).then((missed) => {
            if (!cancelled) missed.forEach(addMessage)
          })
        }
      }),
    ]

    return () => {
      cancelled = true
      offs.forEach((off) => off())
      pending.forEach((p) => clearTimeout(p.timer))
    }
  }, [transport, initialNotice, selfId])

  return { items, users, connection, loaded }
}
