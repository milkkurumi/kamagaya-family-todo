import type { AppData, Settings, TaskDef, TaskState } from '../types'
import { TASKS } from '../data/tasks'

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

/**
 * 共有ペイロード v2（短縮形式）。
 *
 * v1 は AppData をそのまま JSON 化していたため、チェックリストの状態が
 * 「日本語の項目名そのままをキーにしたオブジェクト」で入り、URL が
 * 3,000字近くになって LINE で送ると見切れ・切断されていた。
 * v2 では次の圧縮を行い、同じ内容を約1/3の長さにする：
 * - チェック済み／不要は、項目名ではなくチェックリスト内の「番号（index）」の配列で表す
 * - false のエントリは送らない（未チェックは「無いこと」と同じ）
 * - status が 'todo' だけで他に情報のないタスクは送らない
 * 読み込み側は v1（旧形式）のリンクもそのまま取り込める（後方互換）。
 */
interface CompactTaskState {
  status?: string
  date?: string
  time?: string
  assignee?: string
  memo?: string
  calendarAdded?: boolean
  checklist?: number[]
  unnecessary?: number[]
  /** チェックリスト定義に無いキーがあった場合の予備（true のものだけ） */
  checklistState?: Record<string, boolean>
  checklistUnnecessary?: Record<string, boolean>
}

function defOf(id: string, settings: Settings): TaskDef | undefined {
  return TASKS.find((t) => t.id === id) ?? (settings.customTasks ?? []).find((t) => t.id === id)
}

function trueOnly(rec?: Record<string, boolean>): Record<string, boolean> | undefined {
  if (!rec) return undefined
  const out: Record<string, boolean> = {}
  for (const [k, v] of Object.entries(rec)) if (v) out[k] = true
  return Object.keys(out).length > 0 ? out : undefined
}

function compactTask(id: string, state: TaskState, settings: Settings): CompactTaskState | undefined {
  const out: CompactTaskState = {}
  if (state.status && state.status !== 'todo') out.status = state.status
  if (state.date) out.date = state.date
  if (state.time) out.time = state.time
  if (state.assignee) out.assignee = state.assignee
  if (state.memo) out.memo = state.memo
  if (state.calendarAdded) out.calendarAdded = true

  const def = defOf(id, settings)
  if (def?.checklist && def.checklist.length > 0) {
    const checkedIdx: number[] = []
    const unnecessaryIdx: number[] = []
    def.checklist.forEach((label, i) => {
      if (state.checklistState?.[label]) checkedIdx.push(i)
      if (state.checklistUnnecessary?.[label]) unnecessaryIdx.push(i)
    })
    if (checkedIdx.length > 0) out.checklist = checkedIdx
    if (unnecessaryIdx.length > 0) out.unnecessary = unnecessaryIdx
    // 定義に無いキーは予備形式で残す
    const known = new Set(def.checklist)
    const extraChecked = trueOnly(
      Object.fromEntries(Object.entries(state.checklistState ?? {}).filter(([k]) => !known.has(k))),
    )
    const extraUnnecessary = trueOnly(
      Object.fromEntries(Object.entries(state.checklistUnnecessary ?? {}).filter(([k]) => !known.has(k))),
    )
    if (extraChecked) out.checklistState = extraChecked
    if (extraUnnecessary) out.checklistUnnecessary = extraUnnecessary
  } else {
    const cs = trueOnly(state.checklistState)
    if (cs) out.checklistState = cs
    const cu = trueOnly(state.checklistUnnecessary)
    if (cu) out.checklistUnnecessary = cu
  }
  return Object.keys(out).length > 0 ? out : undefined
}

function expandTask(id: string, ct: CompactTaskState, settings: Settings): TaskState {
  const state: TaskState = { status: (ct.status as TaskState['status']) ?? 'todo' }
  if (ct.date) state.date = ct.date
  if (ct.time) state.time = ct.time
  if (ct.assignee) state.assignee = ct.assignee as TaskState['assignee']
  if (ct.memo) state.memo = ct.memo
  if (ct.calendarAdded) state.calendarAdded = true
  const def = defOf(id, settings)
  const checklistState: Record<string, boolean> = { ...(ct.checklistState ?? {}) }
  const checklistUnnecessary: Record<string, boolean> = { ...(ct.checklistUnnecessary ?? {}) }
  if (def?.checklist) {
    for (const i of ct.checklist ?? []) {
      const label = def.checklist[i]
      if (label) checklistState[label] = true
    }
    for (const i of ct.unnecessary ?? []) {
      const label = def.checklist[i]
      if (label) checklistUnnecessary[label] = true
    }
  }
  if (Object.keys(checklistState).length > 0) state.checklistState = checklistState
  if (Object.keys(checklistUnnecessary).length > 0) state.checklistUnnecessary = checklistUnnecessary
  return state
}

/** AppData → 共有用 base64url 文字列（v2 短縮形式） */
export function encodeSharePayload(d: AppData): string {
  const tasks: Record<string, CompactTaskState> = {}
  for (const [id, state] of Object.entries(d.tasks)) {
    const ct = compactTask(id, state, d.settings)
    if (ct) tasks[id] = ct
  }
  return toB64Url(JSON.stringify({ v: 2, settings: d.settings, tasks }))
}

/** 共有用 base64url 文字列 → AppData（v2 と v1 旧形式の両対応） */
export function decodeSharePayload(s: string): AppData | undefined {
  try {
    const parsed: unknown = JSON.parse(fromB64Url(s))
    if (!parsed || typeof parsed !== 'object') return undefined
    const obj = parsed as Record<string, unknown>
    const settings = { ...EMPTY.settings, ...((obj.settings as Settings) ?? {}) }
    if (obj.v === 2) {
      const tasks: Record<string, TaskState> = {}
      for (const [id, ct] of Object.entries((obj.tasks as Record<string, CompactTaskState>) ?? {})) {
        tasks[id] = expandTask(id, ct, settings)
      }
      return { settings, tasks }
    }
    // v1（旧形式）: AppData そのまま
    const d = parsed as AppData
    return { settings, tasks: d.tasks ?? {} }
  } catch {
    return undefined
  }
}

/**
 * 共有パラメータの置き場所はクエリ（?share=）を使う。
 * 以前はハッシュ（#share=）だったが、LINE のリンクプレビュー／アプリ内
 * ブラウザ経由だと # 以降が落ちて「ただの初期設定画面」が開く事象が
 * あったため。読み込みは旧リンク互換のためハッシュも見る。
 */
export function shareUrl(d: AppData): string {
  const url = new URL(location.href)
  url.hash = ''
  url.searchParams.set('share', encodeSharePayload(d))
  return url.toString()
}

/** URL に載っている生の共有パラメータ（クエリ優先、無ければハッシュ） */
export function rawShareParam(): string | undefined {
  const q = new URLSearchParams(location.search).get('share')
  if (q) return q
  const m = location.hash.match(/share=([^&]+)/)
  return m ? m[1] : undefined
}

export function readShared(): AppData | undefined {
  const raw = rawShareParam()
  if (!raw) return undefined
  return decodeSharePayload(raw)
}

export function clearHash() {
  history.replaceState(null, '', location.pathname)
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

