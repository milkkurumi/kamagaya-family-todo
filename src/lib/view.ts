import type { Phase, Priority, Role, Status, TaskDef, TaskState, Settings } from '../types'
import { diffDays, taskWindow, today, type Window } from './date'

export const PRIORITY: Record<Priority, { label: string; short: string; order: number }> = {
  must: { label: '必須手続き・重要', short: '必須', order: 0 },
  recommend: { label: '推奨', short: '推奨', order: 1 },
  optional: { label: '任意・制度活用', short: '任意', order: 2 },
}

export const ROLE: Record<Role, { label: string; short: string }> = {
  papa: { label: '父単独で可', short: '父単独可' },
  together: { label: '夫婦で相談・同席', short: '夫婦で' },
  mama: { label: '母主導', short: '母主導' },
}

export const PHASE: Record<Phase, { label: string; sub: string }> = {
  prep: { label: '妊活・妊娠前', sub: '検査助成・体調準備' },
  pregnancy: { label: '妊娠期', sub: '母子手帳・健診・出産準備' },
  postpartum: { label: '産後〜生後2か月', sub: '出生届・手当請求・1か月健診' },
  infant: { label: '乳児期（〜1歳）', sub: '予防接種・健診・保活' },
  toddler: { label: '幼児期（1〜3歳）', sub: '1歳半健診・3歳児健診' },
  preschool: { label: '就学前（3〜6歳）', sub: '幼稚園・無償化・就学準備' },
}

export const STATUS: Record<Status, string> = {
  todo: '未着手',
  scheduled: '予定済',
  done: '完了',
  skip: '対象外',
}

export type Timing = 'overdue' | 'now' | 'soon' | 'later' | 'past' | 'anytime'

export const TIMING_LABEL: Record<Timing, string> = {
  overdue: '期限超過・要確認',
  now: '現在が推奨期間',
  soon: '30日以内に開始',
  later: '今後の予定',
  past: '推奨期間経過',
  anytime: '時期指定なし',
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
  const allDefs = [...defs, ...(s.customTasks ?? [])]
  return allDefs
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
