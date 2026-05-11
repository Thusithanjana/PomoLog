import { useEffect, useState } from 'react'

export function useNowTicker(isActive) {
  const [nowMs, setNowMs] = useState(() => Date.now())

  useEffect(() => {
    if (!isActive) return undefined

    const intervalId = setInterval(() => {
      setNowMs(Date.now())
    }, 1000)

    return () => clearInterval(intervalId)
  }, [isActive])

  return nowMs
}
