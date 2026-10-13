import { useMemo, useState } from 'react'
import { createTransport } from './config'
import { ChatScreen } from './screens/ChatScreen'
import { EntryScreen } from './screens/EntryScreen'

interface Session {
  requestedNickname: string
  nickname: string
  senderId: string
}

export default function App() {
  const transport = useMemo(() => createTransport(), [])
  const [session, setSession] = useState<Session | null>(null)

  const enter = async (requestedNickname: string) => {
    const result = await transport.connect(requestedNickname)
    setSession({ requestedNickname, nickname: result.nickname, senderId: result.senderId })
  }

  if (!session) return <EntryScreen onEnter={enter} />
  return (
    <ChatScreen
      transport={transport}
      nickname={session.nickname}
      senderId={session.senderId}
      requestedNickname={session.requestedNickname}
    />
  )
}
