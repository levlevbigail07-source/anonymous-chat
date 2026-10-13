import { useState } from 'react'
import { ChatIcon } from '../components/Icons'
import { APP_NAME, NICKNAME_MAX } from '../config'
import { charCount, clampNickname, validateNickname } from '../lib/validation'

interface Props {
  onEnter: (nickname: string) => Promise<void>
}

export function EntryScreen({ onEnter }: Props) {
  const [value, setValue] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const remaining = NICKNAME_MAX - charCount(value)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (busy) return
    const result = validateNickname(value)
    if (!result.ok) {
      setError(result.error)
      return
    }
    setError('')
    setBusy(true)
    try {
      await onEnter(result.value)
    } catch {
      setError('進入失敗,請稍後再試。')
      setBusy(false)
    }
  }

  return (
    <div className="entry">
      <div className="entry-main">
        <div className="entry-head">
          <span className="entry-logo">
            <ChatIcon size={44} />
          </span>
          <h1 className="entry-title">{APP_NAME}</h1>
          <p className="entry-sub">不用註冊,取一個代號就能和大家聊天。</p>
        </div>
        <form className="entry-form" onSubmit={submit}>
          <label htmlFor="nick" className="entry-label">
            你的代號
          </label>
          <input
            id="nick"
            type="text"
            autoComplete="off"
            className={error ? 'entry-input entry-input-error' : 'entry-input'}
            placeholder="例如:小明"
            value={value}
            aria-invalid={error ? true : undefined}
            aria-describedby="nick-hint"
            onChange={(e) => {
              setValue(clampNickname(e.target.value))
              if (error) setError('')
            }}
          />
          <div className="entry-hint" id="nick-hint">
            <span className="error" role="alert">
              {error}
            </span>
            <span>還能輸入 {remaining} 字</span>
          </div>
          <button type="submit" className="entry-btn" disabled={busy}>
            {busy ? '進入中…' : '進入聊天室'}
          </button>
        </form>
      </div>
      <p className="entry-note">這是匿名聊天室,訊息會保留最近 50 則,請勿發布個人資料。</p>
    </div>
  )
}
