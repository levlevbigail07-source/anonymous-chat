import { useRef, useState } from 'react'
import { MESSAGE_MAX } from '../config'
import { charCount, clampMessage, normalizeMessage } from '../lib/validation'
import { SendIcon } from './Icons'

interface Props {
  disabled: boolean
  onSend: (text: string) => Promise<void>
}

export function Composer({ disabled, onSend }: Props) {
  const [text, setText] = useState('')
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const remaining = MESSAGE_MAX - charCount(text)
  const canSend = !disabled && normalizeMessage(text) !== null

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const value = normalizeMessage(text)
    if (disabled || value === null) return
    try {
      await onSend(value)
      setText('')
      setError('')
      inputRef.current?.focus()
    } catch {
      setError('送出失敗,請稍後再試。')
    }
  }

  return (
    <form className="composer" onSubmit={submit}>
      <div className="composer-row">
        <label htmlFor="msg" className="sr-only">
          訊息內容
        </label>
        <input
          id="msg"
          ref={inputRef}
          type="text"
          autoComplete="off"
          enterKeyHint="send"
          className="composer-input"
          placeholder={disabled ? '連線中斷,暫時無法送出' : '輸入訊息…'}
          value={text}
          disabled={disabled}
          onChange={(e) => setText(clampMessage(e.target.value))}
        />
        <button type="submit" className="send-btn" disabled={!canSend} aria-label="送出">
          <SendIcon />
          <span className="send-label">送出</span>
        </button>
      </div>
      <div className="composer-hint">
        <span className="error" role="alert">
          {error}
        </span>
        <span>還能輸入 {remaining} 字</span>
      </div>
    </form>
  )
}
