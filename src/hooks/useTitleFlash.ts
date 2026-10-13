import { useCallback, useEffect, useRef } from 'react'
import { APP_NAME } from '../config'

// 頁面在背景時收到新訊息,分頁標題變成「(N) 匿名聊天室」;回到前景恢復。
export function useTitleFlash(): () => void {
  const unread = useRef(0)

  useEffect(() => {
    const reset = () => {
      unread.current = 0
      document.title = APP_NAME
    }
    const onVisibility = () => {
      if (!document.hidden) reset()
    }
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('focus', reset)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('focus', reset)
      reset()
    }
  }, [])

  return useCallback(() => {
    if (!document.hidden) return
    unread.current += 1
    document.title = `(${unread.current}) ${APP_NAME}`
  }, [])
}
