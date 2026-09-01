import * as React from "react"

const MOBILE_BREAKPOINT = 640
const mediaQuery = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`

function subscribe(callback: () => void) {
  const mediaQueryList = window.matchMedia(mediaQuery)

  mediaQueryList.addEventListener("change", callback)

  return () => mediaQueryList.removeEventListener("change", callback)
}

function getSnapshot() {
  return window.matchMedia(mediaQuery).matches
}

function getServerSnapshot() {
  return false
}

export function useIsMobile() {
  return React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
