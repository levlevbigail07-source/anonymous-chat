import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { TimelineItem } from '../hooks/useChat'
import { formatTime } from '../lib/validation'
import { ArrowDownIcon, CheckIcon, FlagIcon } from './Icons'

interface Props {
  items: TimelineItem[]
  loaded: boolean
  selfId: string
  reported: Set<number>
  onReport: (messageId: number) => void
}

const BOTTOM_THRESHOLD = 40

export function MessageList({ items, loaded, selfId, reported, onReport }: Props) {
  const listRef = useRef<HTMLDivElement>(null)
  const atBottomRef = useRef(true)
  const prevCountRef = useRef(0)
  const [unseen, setUnseen] = useState(0)

  const scrollToBottom = () => {
    const el = listRef.current
    if (el) el.scrollTop = el.scrollHeight
    atBottomRef.current = true
    setUnseen(0)
  }

  const onScroll = () => {
    const el = listRef.current
    if (!el) return
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight <= BOTTOM_THRESHOLD
    atBottomRef.current = atBottom
    if (atBottom) setUnseen(0)
  }

  // 有新項目時:在最底下就跟著捲;正在往上翻就不動,改記數字。
  useLayoutEffect(() => {
    const added = items.slice(prevCountRef.current)
    prevCountRef.current = items.length
    if (added.length === 0) return
    const lastIsMine = (() => {
      const last = added[added.length - 1]
      return last.kind === 'message' && last.msg.senderId === selfId
    })()
    if (atBottomRef.current || lastIsMine) {
      scrollToBottom()
    } else {
      const fromOthers = added.filter((i) => i.kind === 'message' && i.msg.senderId !== selfId).length
      if (fromOthers > 0) setUnseen((n) => n + fromOthers)
    }
  }, [items, selfId])

  // 視窗大小改變(例如手機鍵盤彈出)時,如果本來在最底下就維持在最底下
  useEffect(() => {
    const onResize = () => {
      if (atBottomRef.current) {
        const el = listRef.current
        if (el) el.scrollTop = el.scrollHeight
      }
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  return (
    <div className="list-wrap">
      <div className="list" ref={listRef} onScroll={onScroll} role="log" aria-live="polite" aria-label="聊天訊息">
        <div className="list-inner">
          {loaded && items.length === 0 && <div className="empty">還沒有訊息,來說第一句話吧。</div>}
          {items.map((item) =>
            item.kind === 'system' ? (
              <div className="system" key={item.key}>
                {item.text}
              </div>
            ) : (
              <Bubble
                key={item.key}
                nickname={item.msg.nickname}
                text={item.msg.text}
                time={formatTime(item.msg.sentAt)}
                mine={item.msg.senderId === selfId}
                reported={reported.has(item.msg.id)}
                onReport={() => onReport(item.msg.id)}
              />
            ),
          )}
        </div>
      </div>
      {unseen > 0 && (
        <button type="button" className="new-msgs" onClick={scrollToBottom}>
          有 {unseen} 則新訊息
          <ArrowDownIcon />
        </button>
      )}
    </div>
  )
}

interface BubbleProps {
  nickname: string
  text: string
  time: string
  mine: boolean
  reported: boolean
  onReport: () => void
}

function Bubble({ nickname, text, time, mine, reported, onReport }: BubbleProps) {
  if (mine) {
    return (
      <div className="msg msg-mine">
        <div className="bubble bubble-mine">{text}</div>
        <div className="meta">{time}</div>
      </div>
    )
  }
  return (
    <div className="msg msg-other">
      <div className="who">{nickname}</div>
      <div className="bubble bubble-other">{text}</div>
      <div className="meta">
        <span>{time}</span>
        {reported ? (
          <span className="reported">
            <CheckIcon />
            已檢舉
          </span>
        ) : (
          <button type="button" className="report-btn" aria-label={`檢舉${nickname}的這則訊息`} onClick={onReport}>
            <FlagIcon />
            檢舉
          </button>
        )}
      </div>
    </div>
  )
}
