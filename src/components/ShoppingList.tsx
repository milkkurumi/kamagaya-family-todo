import { useState } from 'react'
import type { Phase, ShoppingCustomItem, TaskState } from '../types'
import { PHASE, type TaskView } from '../lib/view'
import { isChecked, isUnnecessary, toggleUnnecessaryPatch } from '../lib/checklist'
import { matchAffiliates, type AffiliateLink } from '../lib/affiliate'

interface Props {
  views: TaskView[]
  onChange: (id: string, patch: Partial<TaskState>) => void
  onJump: (id: string) => void
  customItems: ShoppingCustomItem[]
  onAddCustom: (label: string) => void
  onUpdateCustom: (id: string, patch: Partial<ShoppingCustomItem>) => void
  onDeleteCustom: (id: string) => void
}

/**
 * 買い物タブに出さないチェックリストを持つタスク。
 * - postpartum-chores: チェックリストが「家事・育児の分担決め」で、買う物ではないため除外。
 * それ以外のチェックリスト（ベビー用品／マタニティ用品／入院準備）は
 * すべて「買う・準備する物」なので横断表示の対象にする。
 */
const NON_SHOPPING_CHECKLIST_TASKS = new Set(['postpartum-chores'])

/**
 * チェックリストは無いが、それ自体が「買う物」であるタスク。
 * 1項目の買い物として買い物タブにも出す（チェック状態は通常の
 * checklistState に保存するので、保存方式は他の項目と揃う）。
 * - preg-childseat: チャイルドシート（退院日に必須）
 */
const SINGLE_PURCHASE_TASKS: Record<string, string> = {
  'preg-childseat': 'チャイルドシート',
}

interface ShoppingItem {
  key: string
  label: string
  checked: boolean
  unnecessary: boolean
  affiliates: AffiliateLink[]
}

interface ShoppingGroup {
  id: string
  title: string
  phase?: Phase
  items: ShoppingItem[]
  /** どの項目にも対応しない、グループ全体向けの関連アイテム */
  genericAffiliates: AffiliateLink[]
  jumpId?: string
  custom?: boolean
}

function withAffiliates(
  labels: { label: string; checked: boolean; unnecessary: boolean }[],
  keyPrefix: string,
  affiliates: AffiliateLink[] | undefined,
): { items: ShoppingItem[]; genericAffiliates: AffiliateLink[] } {
  const { perItem, unmatched } = matchAffiliates(
    affiliates,
    labels.map((l) => l.label),
  )
  return {
    items: labels.map((l) => ({
      key: `${keyPrefix}:${l.label}`,
      label: l.label,
      checked: l.checked,
      unnecessary: l.unnecessary,
      affiliates: perItem.get(l.label) ?? [],
    })),
    genericAffiliates: unmatched,
  }
}

function buildGroups(views: TaskView[], customItems: ShoppingCustomItem[]): ShoppingGroup[] {
  const groups: ShoppingGroup[] = []

  if (customItems.length > 0) {
    groups.push({
      id: 'custom-shopping',
      title: '追加した買い物',
      items: customItems.map((c) => ({
        key: c.id,
        label: c.label,
        checked: c.status === 'done',
        unnecessary: c.status === 'skip',
        affiliates: [],
      })),
      genericAffiliates: [],
      custom: true,
    })
  }

  for (const v of views) {
    if (SINGLE_PURCHASE_TASKS[v.task.id]) {
      const label = SINGLE_PURCHASE_TASKS[v.task.id]
      const { items, genericAffiliates } = withAffiliates(
        [{ label, checked: singlePurchaseChecked(v, label), unnecessary: isUnnecessary(v.state, label) }],
        v.task.id,
        v.task.affiliate,
      )
      groups.push({
        id: v.task.id,
        title: v.task.title,
        phase: v.task.phase,
        items,
        genericAffiliates,
        jumpId: v.task.id,
      })
      continue
    }
    if (!v.task.checklist || v.task.checklist.length === 0) continue
    if (NON_SHOPPING_CHECKLIST_TASKS.has(v.task.id)) continue
    const { items, genericAffiliates } = withAffiliates(
      v.task.checklist.map((label) => ({
        label,
        checked: isChecked(v.state, label),
        unnecessary: isUnnecessary(v.state, label),
      })),
      v.task.id,
      v.task.affiliate,
    )
    groups.push({
      id: v.task.id,
      title: v.task.title,
      phase: v.task.phase,
      items,
      genericAffiliates,
      jumpId: v.task.id,
    })
  }
  return groups
}

/** 単品購入タスクのチェック状態。個別チェックが保存済みならそちらを優先し、無い場合のみタスク完了＝購入済みとして扱う */
function singlePurchaseChecked(view: TaskView, label: string): boolean {
  if (view.state.checklistState && label in view.state.checklistState) {
    return isChecked(view.state, label)
  }
  return view.state.status === 'done'
}

/** 買い物リスト全体の集計（タブの件数バッジ用）。「不要」は母数から除く */
export function shoppingCounts(views: TaskView[], customItems: ShoppingCustomItem[] = []) {
  let total = 0
  let done = 0
  let unnecessary = 0
  for (const g of buildGroups(views, customItems)) {
    for (const item of g.items) {
      if (item.unnecessary) {
        unnecessary += 1
        continue
      }
      total += 1
      if (item.checked) done += 1
    }
  }
  return { total, done, remaining: total - done, unnecessary }
}

function groupStats(group: ShoppingGroup) {
  const active = group.items.filter((i) => !i.unnecessary)
  const done = active.filter((i) => i.checked).length
  return { active: active.length, done, remaining: active.length - done }
}

export function ShoppingList({
  views,
  onChange,
  onJump,
  customItems,
  onAddCustom,
  onUpdateCustom,
  onDeleteCustom,
}: Props) {
  // 入力・フィルター・折りたたみ状態はこのコンポーネント内に閉じる。
  // App 側に足すと設定ゲート（early return）より前に置く必要が出て、
  // hooks 順序クラッシュ（PR #25）の再発リスクになるため。
  const [hideDone, setHideDone] = useState(false)
  const [newLabel, setNewLabel] = useState('')
  const [collapsedStages, setCollapsedStages] = useState<Record<string, boolean>>({})
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({})

  const groups = buildGroups(views, customItems)
  const { total, done, remaining, unnecessary } = shoppingCounts(views, customItems)
  const percent = total > 0 ? Math.round((done / total) * 100) : 0

  const viewOf = (groupId: string) => views.find((v) => v.task.id === groupId)

  const toggleItem = (group: ShoppingGroup, item: ShoppingItem) => {
    if (group.custom) {
      const c = customItems.find((x) => x.id === item.key)
      if (!c) return
      onUpdateCustom(c.id, { status: c.status === 'done' ? 'todo' : 'done' })
      return
    }
    const view = viewOf(group.id)
    if (!view) return
    // 表示上の状態（単品購入タスクではタスク完了から導出した場合を含む）を基準に反転する
    const next = !item.checked
    onChange(view.task.id, {
      checklistState: { ...(view.state.checklistState || {}), [item.label]: next },
      ...(next
        ? { checklistUnnecessary: { ...(view.state.checklistUnnecessary || {}), [item.label]: false } }
        : {}),
    })
  }

  const toggleUnnecessary = (group: ShoppingGroup, item: ShoppingItem) => {
    if (group.custom) {
      const c = customItems.find((x) => x.id === item.key)
      if (!c) return
      onUpdateCustom(c.id, { status: c.status === 'skip' ? 'todo' : 'skip' })
      return
    }
    const view = viewOf(group.id)
    if (!view) return
    onChange(view.task.id, toggleUnnecessaryPatch(view.state, item.label))
  }

  const submitAdd = () => {
    const label = newLabel.trim()
    if (!label) return
    onAddCustom(label)
    setNewLabel('')
  }

  const renderGroup = (group: ShoppingGroup) => {
    const stats = groupStats(group)
    // 既定では「残りが無いグループ」は畳む。ユーザーが切り替えたらそちらを優先する
    const collapsed = collapsedGroups[group.id] ?? stats.remaining === 0
    const ordered = [
      ...group.items.filter((i) => !i.checked && !i.unnecessary),
      ...group.items.filter((i) => i.checked && !i.unnecessary),
      ...group.items.filter((i) => i.unnecessary),
    ]
    const visible = hideDone ? ordered.filter((i) => !i.checked) : ordered
    return (
      <section key={group.id} className="shopping-group">
        <div className="group-head shopping-group-head">
          <button
            type="button"
            className="shopping-collapse-btn"
            aria-expanded={!collapsed}
            onClick={() => setCollapsedGroups((m) => ({ ...m, [group.id]: !collapsed }))}
          >
            <span className="shopping-chev" aria-hidden="true">
              {collapsed ? '▸' : '▾'}
            </span>
            <span className="shopping-group-title">{group.title}</span>
            <span className="count">
              {stats.done}/{stats.active}
            </span>
          </button>
          {group.jumpId && (
            <button type="button" className="small-btn" onClick={() => onJump(group.jumpId!)}>
              元のタスクを開く →
            </button>
          )}
        </div>

        {!collapsed && (
          <>
            {group.genericAffiliates.length > 0 && (
              <div className="shopping-generic-affiliates">
                <span className="shopping-affiliates-label">
                  関連アイテム <span className="ad-badge">広告</span>
                </span>
                {group.genericAffiliates.map((a, i) => (
                  <a key={i} href={a.url} target="_blank" rel="noopener noreferrer" className="shopping-affiliate-link">
                    {a.label} ↗
                  </a>
                ))}
              </div>
            )}

            {visible.length === 0 ? (
              <p className="hint block">このグループで買うものは残っていません。</p>
            ) : (
              <div className="shopping-list">
                {visible.map((item) => (
                  <div
                    key={item.key}
                    className={`shopping-item ${item.checked ? 'checked' : ''} ${item.unnecessary ? 'unnecessary' : ''}`}
                  >
                    <div className="shopping-item-row">
                      <label className="shopping-item-main">
                        <input
                          type="checkbox"
                          checked={item.checked}
                          disabled={item.unnecessary}
                          onChange={() => toggleItem(group, item)}
                        />
                        <span>{item.label}</span>
                        {item.unnecessary && <span className="badge st-skip">不要</span>}
                      </label>
                      <button
                        type="button"
                        className="shopping-flag-btn"
                        onClick={() => toggleUnnecessary(group, item)}
                      >
                        {item.unnecessary ? '戻す' : '不要'}
                      </button>
                      {group.custom && (
                        <button
                          type="button"
                          className="shopping-flag-btn danger"
                          onClick={() => onDeleteCustom(item.key)}
                        >
                          削除
                        </button>
                      )}
                    </div>
                    {item.affiliates.map((a, i) => (
                      <a
                        key={i}
                        href={a.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shopping-item-affiliate"
                      >
                        関連アイテム（広告）：{a.label} ↗
                      </a>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </section>
    )
  }

  const customGroup = groups.find((g) => g.custom)
  const taskGroups = groups.filter((g) => !g.custom)
  const phaseOrder = Object.keys(PHASE) as Phase[]

  return (
    <section className="section-block">
      <div className="section-header-row">
        <div>
          <h2>買い物リスト</h2>
          <p className="section-desc">
            各タスクの「買うもの・準備するもの」を、時期（ステージ）ごとにまとめた一覧です。ステージ名やグループ名を押すと折りたためます。関連アイテムは、対応する項目のすぐ下に表示します。
          </p>
        </div>
        <label className="check small">
          <input type="checkbox" checked={hideDone} onChange={(e) => setHideDone(e.target.checked)} />
          購入・用意済みを隠す
        </label>
      </div>

      <form
        className="shopping-add-form"
        onSubmit={(e) => {
          e.preventDefault()
          submitAdd()
        }}
      >
        <input
          type="text"
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          placeholder="買い物を追加（例：母乳パッド、ベビー用洗剤）"
          aria-label="追加する買い物"
        />
        <button type="submit" className="primary" disabled={!newLabel.trim()}>
          追加する
        </button>
      </form>

      <div className="shopping-summary">
        <div className="shopping-summary-head">
          <span>
            あと <strong>{remaining}点</strong>（全{total}点中 {done}点 購入・用意済み
            {unnecessary > 0 ? `／不要 ${unnecessary}点` : ''}）
          </span>
          <strong>{percent}%</strong>
        </div>
        <div
          className="status-progress-track"
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="買い物リストの進捗"
        >
          <div className="status-progress-fill" style={{ width: `${percent}%` }} />
        </div>
        {total > 0 && remaining === 0 && (
          <p className="shopping-all-done">必要な買い物はすべて揃いました。お疲れさまでした。</p>
        )}
      </div>

      {groups.length === 0 && (
        <p className="empty">買い物リストに表示できる項目がまだありません。上の欄から追加もできます。</p>
      )}

      {customGroup && renderGroup(customGroup)}

      {phaseOrder.map((phase) => {
        const stageGroups = taskGroups.filter((g) => g.phase === phase)
        if (stageGroups.length === 0) return null
        const stageItems = stageGroups.flatMap((g) => g.items)
        const stageActive = stageItems.filter((i) => !i.unnecessary)
        const stageDone = stageActive.filter((i) => i.checked).length
        const stageRemaining = stageActive.length - stageDone
        // 既定では「残りが無いステージ」は畳む。ユーザーが切り替えたらそちらを優先する
        const collapsed = collapsedStages[phase] ?? stageRemaining === 0
        return (
          <section key={phase} className="shopping-stage">
            <button
              type="button"
              className="shopping-stage-head"
              aria-expanded={!collapsed}
              onClick={() => setCollapsedStages((m) => ({ ...m, [phase]: !collapsed }))}
            >
              <span className="shopping-chev" aria-hidden="true">
                {collapsed ? '▸' : '▾'}
              </span>
              <span className="shopping-stage-title">
                {PHASE[phase].label}
                <span className="phase-sub">{PHASE[phase].sub}</span>
              </span>
              <span className="shopping-stage-count">
                {stageDone}/{stageActive.length}
                {stageRemaining > 0 ? `（あと${stageRemaining}点）` : '（完了）'}
              </span>
            </button>
            {!collapsed && <div className="shopping-stage-body">{stageGroups.map(renderGroup)}</div>}
          </section>
        )
      })}
    </section>
  )
}
