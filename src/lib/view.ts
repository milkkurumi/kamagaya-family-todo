import type { Phase, Priority, Role, Status, TaskDef, TaskState, Settings } from '../types'
import { diffDays, taskWindow, today, type Window } from './date'

export const PRIORITY: Record<Priority, { label: string; short: string; order: number }> = {
  must: { label: '必須（ぜったい）', short: 'ぜったい', order: 0 },
  recommend: { label: '推奨（おすすめ）', short: 'おすすめ', order: 1 },
  optional: { label: '任意（知っ得）', short: '知っ得', order: 2 },
}

export const ROLE: Record<Role, { label: string; icon: string }> = {
  papa: { label: 'パパ単独OK', icon: '🧔' },
  together: { label: '夫婦で相談・参加', icon: '👥' },
  mama: { label: 'ママ主導', icon: '👩' },
}

export const PHASE: Record<Phase, { label: string; icon: string }> = {
  prep: { label: '妊活期', icon: '🌱' },
  pregnancy: { label: '妊娠期', icon: '🤰' },
  postpartum: { label: '産後〜生後2か月', icon: '👶' },
  infant: { label: '乳児期（〜1歳）', icon: '🍼' },
  toddler: { label: '幼児期（1〜3歳）', icon: '🧸' },
  preschool: { label: '就学前', icon: '🎒' },
}

export const STATUS: Record<Status, string> = {
  todo: '未着手',
  scheduled: '日程決定',
  done: '完了',
  skip: '対象外',
}

export type Timing = 'overdue' | 'now' | 'soon' | 'later' | 'past' | 'anytime'

export const TIMING_LABEL: Record<Timing, string> = {
  overdue: '期限切れ・要確認',
  now: 'いまが推奨期間',
  soon: '30日以内に始まる',
  later: 'これから',
  past: '推奨期間を過ぎた',
  anytime: 'いつでも',
}

export interface TaskView {
  task: TaskDef
  state: TaskState
  window: Window
  timing: Timing
  /** 期限までの残り日数（期間中のみ） */
  daysLeft?: number
}

export function stateOf(tasks: Record<string, TaskState>, id: string): TaskState {
  return tasks[id] ?? { status: 'todo' }
}

export function buildViews(defs: TaskDef[], tasks: Record<string, TaskState>, s: Settings): TaskView[] {
  const t = today()
  return defs
    .filter((d) => !(d.firstChildOnly && !s.firstChild))
    .map((task) => {
      const state = stateOf(tasks, task.id)
      const window = taskWindow(task, s)
      const closed = state.status === 'done' || state.status === 'skip'
      let timing: Timing = 'anytime'
      let daysLeft: number | undefined
      if (window.start && window.end) {
        if (window.end < t) timing = closed ? 'past' : task.priority === 'must' ? 'overdue' : 'past'
        else if (window.start <= t) {
          timing = 'now'
          daysLeft = diffDays(window.end, t)
        } else if (diffDays(window.start, t) <= 30) timing = 'soon'
        else timing = 'later'
      }
      return { task, state, window, timing, daysLeft }
    })
}

export function sortViews(a: TaskView, b: TaskView) {
  const as = a.window.start?.getTime() ?? 0
  const bs = b.window.start?.getTime() ?? 0
  if (as !== bs) return as - bs
  return PRIORITY[a.task.priority].order - PRIORITY[b.task.priority].order
}
