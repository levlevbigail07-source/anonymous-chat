import type { ReactNode } from 'react'

function Svg({ size, strokeWidth = 2, children }: { size: number; strokeWidth?: number; children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

export function ChatIcon({ size = 24 }: { size?: number }) {
  return (
    <Svg size={size} strokeWidth={1.8}>
      <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1.1-4.6A8 8 0 1 1 21 12z" />
    </Svg>
  )
}

export function SendIcon({ size = 22 }: { size?: number }) {
  return (
    <Svg size={size}>
      <path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z" />
    </Svg>
  )
}

export function FlagIcon({ size = 14 }: { size?: number }) {
  return (
    <Svg size={size}>
      <path d="M4 22V4M4 4h13l-2 4 2 4H4" />
    </Svg>
  )
}

export function CheckIcon({ size = 14 }: { size?: number }) {
  return (
    <Svg size={size} strokeWidth={2.4}>
      <path d="M20 6 9 17l-5-5" />
    </Svg>
  )
}

export function RefreshIcon({ size = 18 }: { size?: number }) {
  return (
    <Svg size={size}>
      <path d="M21 12a9 9 0 1 1-3-6.7M21 4v5h-5" />
    </Svg>
  )
}

export function ArrowDownIcon({ size = 16 }: { size?: number }) {
  return (
    <Svg size={size} strokeWidth={2.4}>
      <path d="M12 5v14M5 12l7 7 7-7" />
    </Svg>
  )
}
