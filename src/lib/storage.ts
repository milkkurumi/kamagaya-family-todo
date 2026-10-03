import type { AppData } from '../types'

const KEY = 'kamagaya-family-todo:v1'

export const EMPTY: AppData = { settings: { firstChild: true }, tasks: {} }

export function load(): AppData {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return EMPTY
    const d = JSON.parse(raw) as AppData
    return { settings: { ...EMPTY.settings, ...d.settings }, tasks: d.tasks ?? {} }
  } catch {
    return EMPTY
  }
}

export function save(d: AppData) {
  localStorage.setItem(KEY, JSON.stringify(d))
}

// ───────── 夫婦間の共有（URLハッシュに状態を埋め込む） ─────────

function toB64Url(s: string) {
  const bytes = new TextEncoder().encode(s)
  let bin = ''
  bytes.forEach((b) => (bin += String.fromCharCode(b)))
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromB64Url(s: string) {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/')
  const bin = atob(b64)
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)))
}

export function shareUrl(d: AppData): string {
  const url = new URL(location.href)
  url.hash = `share=${toB64Url(JSON.stringify(d))}`
  return url.toString()
}

export function readShared(): AppData | undefined {
  const m = location.hash.match(/share=([^&]+)/)
  if (!m) return undefined
  try {
    const d = JSON.parse(fromB64Url(m[1])) as AppData
    return { settings: { ...EMPTY.settings, ...d.settings }, tasks: d.tasks ?? {} }
  } catch {
    return undefined
  }
}

export function clearHash() {
  history.replaceState(null, '', location.pathname + location.search)
}
