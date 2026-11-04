import type { TaskState } from '../types'

/**
 * チェックリスト項目の状態操作（買い物タブとタスク詳細で共通）。
 * 「購入・用意済み（checklistState）」と「不要（checklistUnnecessary）」は排他で、
 * 片方を立てたらもう片方は下ろす。
 */

export function isChecked(state: TaskState, item: string): boolean {
  return Boolean(state.checklistState?.[item]) && !isUnnecessary(state, item)
}

export function isUnnecessary(state: TaskState, item: string): boolean {
  return Boolean(state.checklistUnnecessary?.[item])
}

/** 購入・用意済みの切り替え用パッチを作る（有効にすると「不要」は解除される） */
export function toggleCheckedPatch(state: TaskState, item: string): Partial<TaskState> {
  const next = !isChecked(state, item)
  return {
    checklistState: { ...(state.checklistState || {}), [item]: next },
    ...(next ? { checklistUnnecessary: { ...(state.checklistUnnecessary || {}), [item]: false } } : {}),
  }
}

/** 「不要」の切り替え用パッチを作る（有効にすると「購入・用意済み」は解除される） */
export function toggleUnnecessaryPatch(state: TaskState, item: string): Partial<TaskState> {
  const next = !isUnnecessary(state, item)
  return {
    checklistUnnecessary: { ...(state.checklistUnnecessary || {}), [item]: next },
    ...(next ? { checklistState: { ...(state.checklistState || {}), [item]: false } } : {}),
  }
}
