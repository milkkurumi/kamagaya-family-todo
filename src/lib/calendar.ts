import type { Settings, TaskDef, TaskState } from '../types'
import { addDays, parseDate } from './date'

const ROLE_LABEL = { papa: '🧔 パパ単独OK', together: '👥 夫婦で相談・参加', mama: '👩 ママ主導' } as const
const ASSIGNEE_LABEL = { '': '', papa: 'パパ', mama: 'ママ', both: '夫婦' } as const

function compact(d: string) {
  return d.replaceAll('-', '')
}

function endTime(date: string, time: string, minutes: number): string {
  const [h, m] = time.split(':').map(Number)
  const d = parseDate(date)!
  d.setHours(h, m + minutes, 0, 0)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`
}

function eventTitle(task: TaskDef, state: TaskState) {
  const who = state.assignee ? `【${ASSIGNEE_LABEL[state.assignee]}】` : ''
  return `${who}${task.title}`
}

export function eventDetails(task: TaskDef, state: TaskState): string {
  const lines: string[] = [task.summary, '', `担当: ${ROLE_LABEL[task.role]}`]
  if (task.deadlineLabel) lines.push(`期限: ${task.deadlineLabel}`)
  if (task.money) lines.push(`💰 ${task.money}`)
  if (task.bring?.length) lines.push('', '■ 持ち物', ...task.bring.map((b) => `・${b}`))
  if (task.papaNote) lines.push('', `🧔 パパへ: ${task.papaNote}`)
  if (state.memo) lines.push('', `📝 メモ: ${state.memo}`)
  if (task.sourceUrl) lines.push('', `公式情報: ${task.sourceUrl}`)
  lines.push('', '— かまがや親子カレンダーから登録')
  return lines.join('\n')
}

/** 日付範囲（Google形式）。時刻なしなら終日 */
function dateRange(task: TaskDef, state: TaskState): string {
  const date = state.date!
  if (!state.time) {
    const next = addDays(parseDate(date)!, 1)
    const n = `${next.getFullYear()}${String(next.getMonth() + 1).padStart(2, '0')}${String(next.getDate()).padStart(2, '0')}`
    return `${compact(date)}/${n}`
  }
  const start = `${compact(date)}T${state.time.replace(':', '')}00`
  return `${start}/${endTime(date, state.time, task.durationMin ?? 60)}`
}

/**
 * Googleカレンダーの予定作成画面を開くURL（OAuth不要）。
 * add パラメータで配偶者をゲスト招待し、夫婦両方のカレンダーに入るようにする。
 */
export function googleCalendarUrl(task: TaskDef, state: TaskState, settings: Settings): string {
  const p = new URLSearchParams({
    action: 'TEMPLATE',
    text: eventTitle(task, state),
    dates: dateRange(task, state),
    details: eventDetails(task, state),
    ctz: 'Asia/Tokyo',
  })
  if (task.place) p.set('location', task.place)
  const guests = [settings.papaEmail, settings.mamaEmail].filter(Boolean)
  if (guests.length) p.set('add', guests.join(','))
  return `https://calendar.google.com/calendar/render?${p.toString()}`
}

// ───────── iCalendar (.ics) ─────────

function esc(s: string) {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n')
}

/** RFC5545 の行折り返し（75オクテット目安、マルチバイト考慮で文字数ベース） */
function fold(line: string) {
  const out: string[] = []
  let cur = ''
  let bytes = 0
  for (const ch of line) {
    const b = new TextEncoder().encode(ch).length
    if (bytes + b > 73) {
      out.push(cur)
      cur = ' ' + ch
      bytes = 1 + b
    } else {
      cur += ch
      bytes += b
    }
  }
  out.push(cur)
  return out.join('\r\n')
}

function vevent(task: TaskDef, state: TaskState): string[] {
  const [s, e] = dateRange(task, state).split('/')
  const allDay = !state.time
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
  return [
    'BEGIN:VEVENT',
    `UID:${task.id}-${state.date}@kamagaya-family-todo`,
    `DTSTAMP:${stamp}`,
    allDay ? `DTSTART;VALUE=DATE:${s}` : `DTSTART;TZID=Asia/Tokyo:${s}`,
    allDay ? `DTEND;VALUE=DATE:${e}` : `DTEND;TZID=Asia/Tokyo:${e}`,
    `SUMMARY:${esc(eventTitle(task, state))}`,
    `DESCRIPTION:${esc(eventDetails(task, state))}`,
    ...(task.place ? [`LOCATION:${esc(task.place)}`] : []),
    ...(task.sourceUrl ? [`URL:${task.sourceUrl}`] : []),
    // 前日に通知（Googleの作成URLでは通知を指定できないため .ics 側で補完）
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    `DESCRIPTION:${esc(task.title)}`,
    'TRIGGER:-P1D',
    'END:VALARM',
    'END:VEVENT',
  ]
}

export function buildIcs(items: { task: TaskDef; state: TaskState }[]): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Kamagaya Family ToDo//JA',
    'CALSCALE:GREGORIAN',
    'X-WR-CALNAME:かまがや親子カレンダー',
    'BEGIN:VTIMEZONE',
    'TZID:Asia/Tokyo',
    'BEGIN:STANDARD',
    'DTSTART:19700101T000000',
    'TZOFFSETFROM:+0900',
    'TZOFFSETTO:+0900',
    'TZNAME:JST',
    'END:STANDARD',
    'END:VTIMEZONE',
    ...items.filter((i) => i.state.date).flatMap((i) => vevent(i.task, i.state)),
    'END:VCALENDAR',
  ]
  return lines.map(fold).join('\r\n')
}

export function downloadIcs(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
