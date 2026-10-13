import { useState } from 'react'
import type { DevTools } from '../transport/ChatTransport'

// 階段一專用的測試工具:只在通訊層有提供 dev 時才會出現。
export function DevPanel({ dev }: { dev: DevTools }) {
  const [bot, setBot] = useState(dev.isBotEnabled())

  return (
    <details className="dev">
      <summary>測試工具</summary>
      <div className="dev-body">
        <button type="button" onClick={() => dev.simulateOffline(5)}>
          模擬斷線 5 秒
        </button>
        <button type="button" onClick={() => dev.simulateOffline(40)}>
          模擬斷線 40 秒
        </button>
        <button
          type="button"
          onClick={() => {
            dev.setBotEnabled(!bot)
            setBot(!bot)
          }}
        >
          {bot ? '關閉示範小幫手' : '開啟示範小幫手'}
        </button>
      </div>
    </details>
  )
}
