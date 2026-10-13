import type { OnlineUser } from '../types'

interface Props {
  users: OnlineUser[]
  selfId: string
}

export function OnlineList({ users, selfId }: Props) {
  // 自己排第一,其餘依進入時間
  const sorted = [...users].sort((a, b) => {
    if (a.senderId === selfId) return -1
    if (b.senderId === selfId) return 1
    return a.joinedAt.localeCompare(b.joinedAt)
  })

  return (
    <aside className="online" aria-label="在線名單">
      <h2 className="online-title">在線({users.length})</h2>
      <ul className="online-ul">
        {sorted.map((u) => {
          const mine = u.senderId === selfId
          return (
            <li key={u.senderId} className={mine ? 'online-item online-self' : 'online-item'}>
              <span className="dot" aria-hidden="true" />
              <span className="online-name">{u.nickname}</span>
              {mine && <span className="you">你</span>}
            </li>
          )
        })}
      </ul>
    </aside>
  )
}
