import type { Settings, TaskDef } from '../types'

/** YYYY-MM-DD をローカル日付として Date に変換 */
export function parseDate(s?: string): Date | undefined {
  if (!s) return undefined
  const [y, m, d] = s.split('-').map(Number)
  if (!y || !m || !d) return undefined
  return new Date(y, m - 1, d)
}

export function fmt(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function addDays(d: Date, n: number): Date {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

export function today(): Date {
  const n = new Date()
  return new Date(n.getFullYear(), n.getMonth(), n.getDate())
}

export function diffDays(a: Date, b: Date): number {
  return Math.round((a.getTime() - b.getTime()) / 86400000)
}

const WD = ['日', '月', '火', '水', '木', '金', '土']
export function jp(d: Date, withYear = false): string {
  const base = `${d.getMonth() + 1}/${d.getDate()}(${WD[d.getDay()]})`
  return withYear ? `${d.getFullYear()}/${base}` : base
}

/**
 * 小学校入学日（4月1日）を算出。
 * 4月2日〜翌年4月1日生まれが同じ学年になる（学校教育法・年齢計算に関する法律）
 */
export function schoolEntry(birth: Date): Date {
  const y = birth.getFullYear()
  const afterApr1 = birth.getMonth() > 3 || (birth.getMonth() === 3 && birth.getDate() >= 2)
  return new Date(afterApr1 ? y + 7 : y + 6, 3, 1)
}

/** 生年月日（未出産なら予定日） */
export function effectiveBirth(s: Settings): Date | undefined {
  return parseDate(s.birthDate) ?? parseDate(s.dueDate)
}

export function anchorDate(task: TaskDef, s: Settings): Date | undefined {
  switch (task.anchor) {
    case 'none':
      return undefined
    case 'due':
      // 出生後は予定日が未入力でも生年月日で代用
      return parseDate(s.dueDate) ?? parseDate(s.birthDate)
    case 'birth':
      return effectiveBirth(s)
    case 'school': {
      const b = effectiveBirth(s)
      return b ? schoolEntry(b) : undefined
    }
  }
}

export interface Window {
  start?: Date
  end?: Date
}

export function taskWindow(task: TaskDef, s: Settings): Window {
  const a = anchorDate(task, s)
  if (!a) return {}
  return {
    start: task.startOffset !== undefined ? addDays(a, task.startOffset) : undefined,
    end: task.endOffset !== undefined ? addDays(a, task.endOffset) : undefined,
  }
}

/** 推奨日：期間の開始日が過去なら今日、未来なら開始日 */
export function suggestedDate(w: Window): Date | undefined {
  if (!w.start) return undefined
  const t = today()
  if (w.end && w.end < t) return undefined
  return w.start < t ? t : w.start
}

/** 妊娠週数（予定日から逆算） */
export function pregnancyWeek(due: Date, at: Date = today()): { w: number; d: number } | undefined {
  const days = 280 - diffDays(due, at)
  if (days < 0 || days > 300) return undefined
  return { w: Math.floor(days / 7), d: days % 7 }
}

/** 月齢 */
export function ageText(birth: Date, at: Date = today()): string | undefined {
  if (birth > at) return undefined
  let months = (at.getFullYear() - birth.getFullYear()) * 12 + (at.getMonth() - birth.getMonth())
  if (at.getDate() < birth.getDate()) months -= 1
  if (months < 1) return `生後${diffDays(at, birth)}日`
  const y = Math.floor(months / 12)
  const m = months % 12
  return y > 0 ? `${y}歳${m}か月` : `${m}か月`
}
