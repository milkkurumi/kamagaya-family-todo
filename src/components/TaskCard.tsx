import { useEffect, useRef, useState } from 'react'
import type { Assignee, Settings, TaskState } from '../types'
import { fmt, isWeekend, jp, parseDate, quickDates, suggestedDate } from '../lib/date'
import { buildIcs, downloadIcs, googleCalendarUrl } from '../lib/calendar'
import { PRIORITY, ROLE, STATUS, type TaskView } from '../lib/view'

interface Props {
  view: TaskView
  settings: Settings
  onChange: (id: string, patch: Partial<TaskState>) => void
  onDeleteCustom?: (id: string) => void
  focused?: boolean
}

const ASSIGNEE_LABEL: Record<string, string> = { papa: 'パパ', mama: 'ママ', both: '夫婦' }

export function TaskCard({ view, settings, onChange, onDeleteCustom, focused }: Props) {
  const { task, state, window: w, timing, daysLeft } = view
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLElement>(null)
  const suggested = suggestedDate(w)
  const [date, setDate] = useState(state.date ?? (suggested ? fmt(suggested) : ''))
  const [time, setTime] = useState(state.time ?? '')
  const closed = state.status === 'done' || state.status === 'skip'

  useEffect(() => {
    if (focused) {
      setOpen(true)
      ref.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [focused])

  const update = (patch: Partial<TaskState>) => onChange(task.id, patch)

  const toggleQuickDone = () =>
    update({ status: state.status === 'done' ? (state.date ? 'scheduled' : 'todo') : 'done' })

  const toggleChecklist = (item: string) => {
    const current = state.checklistState || {}
    update({ checklistState: { ...current, [item]: !current[item] } })
  }

  const schedule = () => {
    if (!date) return
    update({ date, time, status: 'scheduled' })
  }

  const draft: TaskState = { ...state, date, time }
  const outOfWindow =
    date && w.start && w.end && (parseDate(date)! < w.start || parseDate(date)! > w.end)

  const addGoogle = () => {
    schedule()
    window.open(googleCalendarUrl(task, draft, settings), '_blank', 'noopener')
    update({ date, time, status: 'scheduled', calendarAdded: true })
  }

  const addIcs = () => {
    schedule()
    downloadIcs(`${task.id}.ics`, buildIcs([{ task, state: draft }]))
    update({ date, time, status: 'scheduled', calendarAdded: true })
  }

  return (
    <article ref={ref} className={`card p-${task.priority} t-${timing} ${closed ? 'closed' : ''}`}>
      <div className="card-top">
        <button
          className={`quick-done ${state.status === 'done' ? 'on' : ''}`}
          onClick={toggleQuickDone}
          aria-label={state.status === 'done' ? '完了を取り消す' : '完了にする'}
          title={state.status === 'done' ? '完了を取り消す' : '完了にする'}
        >
          {state.status === 'done' ? '✓' : ''}
        </button>
        <button className="card-head" onClick={() => setOpen(!open)} aria-expanded={open}>
          <div className="badges">
            <span className={`badge pri-${task.priority}`}>{PRIORITY[task.priority].short}</span>
            <span className={`badge role-${task.role}`}>{ROLE[task.role].short}</span>
            {task.money && <span className="badge money">給付・助成</span>}
            {task.custom && <span className="badge custom">追加タスク</span>}
            {state.status !== 'todo' && <span className={`badge st-${state.status}`}>{STATUS[state.status]}</span>}
          </div>
          <h3>{task.title}</h3>
          <div className="meta">
            {w.start && w.end ? (
              <span>
                推奨：{jp(w.start)}〜{jp(w.end, w.end.getFullYear() !== new Date().getFullYear())}
              </span>
            ) : (
              <span>{task.deadlineLabel ? `期限：${task.deadlineLabel}` : '期間指定なし'}</span>
            )}
            {w.start && w.end && task.deadlineLabel && <span>期限：{task.deadlineLabel}</span>}
            {timing === 'now' && daysLeft !== undefined && !closed && (
              <span className={`left ${daysLeft <= 7 ? 'urgent' : ''}`}>
                {task.hardDeadline ? '提出期限' : '推奨期間'}まであと{daysLeft}日
              </span>
            )}
            {timing === 'overdue' && <span className="left urgent">推奨期間超過</span>}
            {task.place && <span className="where">場所：{task.place}</span>}
            {state.date && (
              <span className="planned">
                予定：{jp(parseDate(state.date)!)}
                {state.time && ` ${state.time}`}
                {state.calendarAdded && '（カレンダー登録済）'}
              </span>
            )}
            {state.date && (
              <span className="who">担当：{ASSIGNEE_LABEL[state.assignee ?? ''] ?? '未定'}</span>
            )}
          </div>
          <span className="chev" aria-hidden="true">{open ? '閉じる' : '詳細'}</span>
        </button>
      </div>

      {open && (
        <div className="card-body">
          <div className="info-grid">
            {(task.deadlineLabel || (w.start && w.end)) && (
              <div className={`info-item ${task.hardDeadline ? 'hard' : ''}`}>
                <span className="info-label">期限・時期</span>
                <span className="info-val">
                  {task.deadlineLabel ?? ''}
                  {task.deadlineLabel && w.start && w.end ? '（' : ''}
                  {w.start && w.end
                    ? `推奨：${jp(w.start)}〜${jp(w.end, w.end.getFullYear() !== new Date().getFullYear())}`
                    : ''}
                  {task.deadlineLabel && w.start && w.end ? '）' : ''}
                </span>
              </div>
            )}
            {task.place && (
              <div className="info-item">
                <span className="info-label">窓口・場所</span>
                <span className="info-val">{task.place}</span>
              </div>
            )}
            {task.bring && task.bring.length > 0 && (
              <div className="info-item">
                <span className="info-label">持ち物（{task.bring.length}点）</span>
                <ul className="bring-list">
                  {task.bring.map((b) => (
                    <li key={b}>{b}</li>
                  ))}
                </ul>
              </div>
            )}
            {task.money && (
              <div className="info-item money-line">
                <span className="info-label">金額・助成</span>
                <span className="info-val">{task.money}</span>
              </div>
            )}
            {task.papaNote && (
              <div className="info-item papa-note">
                <span className="info-label">分担メモ</span>
                <span className="info-val">{task.papaNote}</span>
              </div>
            )}
          </div>

          <p className="summary">{task.summary}</p>

          {task.sourceUrl && (
            <p className="source">
              <a href={task.sourceUrl} target="_blank" rel="noopener noreferrer">
                参照元：{task.sourceLabel ?? '公式情報'} ↗
              </a>
            </p>
          )}

          {task.checklist && task.checklist.length > 0 && (
            <div className="checklist-container">
              <div className="subhead">準備・確認リスト</div>
              <div className="checklist">
                {task.checklist.map((item) => {
                  const checked = state.checklistState?.[item] ?? false
                  return (
                    <label key={item} className={`checklist-item ${checked ? 'checked' : ''}`}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleChecklist(item)}
                      />
                      <span>{item}</span>
                    </label>
                  )
                })}
              </div>
            </div>
          )}

          {task.affiliate && task.affiliate.length > 0 && (
            <div className="recommendations">
              <div className="subhead">
                関連アイテム <span className="ad-badge">広告</span>
              </div>
              <ul>
                {task.affiliate.map((a, i) => (
                  <li key={i}>
                    <a href={a.url} target="_blank" rel="noopener noreferrer" className="ext-link">
                      {a.label} ↗
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="scheduler">
            <div className="subhead">日程と担当を決める</div>
            <div className="row">
              <label>
                実施日
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </label>
              <label>
                時刻（任意）
                <input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
              </label>
              <label>
                担当
                <select
                  value={state.assignee ?? ''}
                  onChange={(e) => update({ assignee: e.target.value as Assignee })}
                >
                  <option value="">未定</option>
                  <option value="papa">パパ</option>
                  <option value="mama">ママ</option>
                  <option value="both">夫婦</option>
                </select>
              </label>
            </div>
            {suggested && (
              <p className="hint">
                目安日：{jp(suggested)}
                {date !== fmt(suggested) && (
                  <button className="link" onClick={() => setDate(fmt(suggested))}>
                    この日をセット
                  </button>
                )}
              </p>
            )}
            {outOfWindow && <p className="hint warn">推奨期間外の日付が選択されています</p>}
            <div className="quick-dates">
              {quickDates().map((q) => (
                <button
                  key={q.label}
                  type="button"
                  className={`chip ${date === fmt(q.date) ? 'on' : ''}`}
                  onClick={() => setDate(fmt(q.date))}
                >
                  {q.label}
                  {q.weekday ? '（平日）' : ''} {jp(q.date)}
                </button>
              ))}
            </div>
            {task.place && date && isWeekend(parseDate(date)!) && (
              <p className="hint warn">市役所・保健センター窓口の手続きは原則平日開庁時間のみとなります。</p>
            )}
            <label className="memo">
              夫婦間メモ・引き継ぎ事項
              <textarea
                rows={2}
                value={state.memo ?? ''}
                onChange={(e) => update({ memo: e.target.value })}
                placeholder="例：委任状は記入済み。母子手帳ケースに同封しています"
              />
            </label>
            <div className="actions">
              <button className="primary" disabled={!date} onClick={schemaScheduleButton(schedule, date, state.date)}>
                予定として保存
              </button>
              <button disabled={!date} onClick={addGoogle}>
                Googleカレンダー登録
              </button>
              <button disabled={!date} onClick={addIcs}>
                iPhoneカレンダー(.ics)
              </button>
              {state.status !== 'done' ? (
                <button className="done" onClick={() => update({ status: 'done' })}>
                  完了にする
                </button>
              ) : (
                <button onClick={() => update({ status: state.date ? 'scheduled' : 'todo' })}>未完了に戻す</button>
              )}
              {state.status !== 'skip' ? (
                <button className="ghost" onClick={() => update({ status: 'skip' })}>
                  対象外にする
                </button>
              ) : (
                <button className="ghost" onClick={() => update({ status: 'todo' })}>
                  対象外を解除
                </button>
              )}
              {task.custom && onDeleteCustom && (
                <button className="ghost danger" onClick={() => onDeleteCustom(task.id)}>
                  削除
                </button>
              )}
            </div>
            {(settings.papaEmail || settings.mamaEmail) && (
              <p className="hint">Googleカレンダー登録時は、設定済みのメールアドレスをゲストに含めて作成画面を開きます。</p>
            )}
          </div>
        </div>
      )}
    </article>
  )
}

function schemaScheduleButton(schedule: () => void, date: string, savedDate?: string) {
  return () => {
    if (!date) return
    schedule()
    void savedDate
  }
}
