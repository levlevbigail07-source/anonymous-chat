import { useCallback, useState } from 'react'
import { Composer } from '../components/Composer'
import { DevPanel } from '../components/DevPanel'
import { ChatIcon, RefreshIcon } from '../components/Icons'
import { MessageList } from '../components/MessageList'
import { OnlineList } from '../components/OnlineList'
import { APP_NAME } from '../config'
import { useChat } from '../hooks/useChat'
import { useTitleFlash } from '../hooks/useTitleFlash'
import type { ChatTransport } from '../transport/ChatTransport'

interface Props {
  transport: ChatTransport
  nickname: string
  senderId: string
  requestedNickname: string
}

export function ChatScreen({ transport, nickname, senderId, requestedNickname }: Props) {
  const flashTitle = useTitleFlash()
  const [reported, setReported] = useState<Set<number>>(() => new Set())

  // 代號被自動加了編號時,告訴使用者他實際的代號
  const initialNotice = nickname !== requestedNickname ? `「${requestedNickname}」已有人使用,你的代號是「${nickname}」` : undefined

  const { items, users, connection, loaded } = useChat({
    transport,
    initialNotice,
    selfId: senderId,
    onIncoming: flashTitle,
  })

  const offline = connection !== 'connected'

  const send = useCallback((text: string) => transport.sendMessage(text), [transport])

  const report = useCallback(
    (messageId: number) => {
      setReported((prev) => new Set(prev).add(messageId))
      transport.reportMessage(messageId).catch(() => {
        setReported((prev) => {
          const next = new Set(prev)
          next.delete(messageId)
          return next
        })
      })
    },
    [transport],
  )

  return (
    <div className="chat">
      <header className="chat-header">
        <div className="brand">
          <span className="brand-icon">
            <ChatIcon />
          </span>
          <h1 className="brand-name">{APP_NAME}</h1>
        </div>
        <div className="count" aria-live="polite">
          <span className="dot" aria-hidden="true" />
          <span>{users.length} 人在線</span>
        </div>
      </header>

      {offline && (
        <div className="banner" role="status">
          <RefreshIcon />
          連線中斷,重新連線中…
        </div>
      )}

      <div className="chat-body">
        <main className="chat-main">
          <MessageList items={items} loaded={loaded} selfId={senderId} reported={reported} onReport={report} />
          <Composer disabled={offline} onSend={send} />
        </main>
        <OnlineList users={users} selfId={senderId} />
      </div>

      {transport.dev && <DevPanel dev={transport.dev} />}
    </div>
  )
}
