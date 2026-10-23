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

// ───────── バックアップ（JSON書き出し・検証・読み込み） ─────────

const VALID_STATUSES = new Set(['todo', 'scheduled', 'done', 'skip'])

export function parseBackupJson(raw: string): AppData | undefined {
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return undefined
    const obj = parsed as Record<string, unknown>
    if (!obj.settings || typeof obj.settings !== 'object' || Array.isArray(obj.settings)) return undefined
    if (obj.tasks !== undefined && (!obj.tasks || typeof obj.tasks !== 'object' || Array.isArray(obj.tasks))) {
      return undefined
    }
    const settingsObj = obj.settings as Record<string, unknown>
    if (settingsObj.firstChild !== undefined && typeof settingsObj.firstChild !== 'boolean') return undefined
    if (settingsObj.dueDate !== undefined && typeof settingsObj.dueDate !== 'string') return undefined
    if (settingsObj.birthDate !== undefined && typeof settingsObj.birthDate !== 'string') return undefined

    const tasksObj = (obj.tasks ?? {}) as Record<string, unknown>
    for (const val of Object.values(tasksObj)) {
      if (!val || typeof val !== 'object' || Array.isArray(val)) return undefined
      const st = (val as Record<string, unknown>).status
      if (typeof st !== 'string' || !VALID_STATUSES.has(st)) return undefined
    }

    const d = parsed as AppData
    return {
      settings: { ...EMPTY.settings, ...d.settings, configured: true },
      tasks: d.tasks ?? {},
    }
  } catch {
    return undefined
  }
}

export function exportBackupJson(d: AppData, now: Date = new Date()): string {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const filename = `kamagaya-backup-${y}${m}${day}.json`
  const blob = new Blob([JSON.stringify(d, null, 2)], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
  return filename
}

