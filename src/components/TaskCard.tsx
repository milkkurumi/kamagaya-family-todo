import { useState } from 'react'
import type { Assignee, Settings, TaskState } from '../types'
import { fmt, jp, parseDate, suggestedDate } from '../lib/date'
import { buildIcs, downloadIcs, googleCalendarUrl } from '../lib/calendar'
import { PRIORITY, ROLE, STATUS, type TaskView } from '../lib/view'

interface Props {
  view: TaskView
  settings: Settings
  onChange: (id: string, patch: Partial<TaskState>) => void
}

export function TaskCard({ view, settings, onChange }: Props) {
  const { task, state, window: w, timing, daysLeft } = view
  const [open, setOpen] = useState(false)
  const suggested = suggestedDate(w)
  const [date, setDate] = useState(state.date ?? (suggested ? fmt(suggested) : ''))
  const [time, setTime] = useState(state.time ?? '')
  const closed = state.status === 'done' || state.status === 'skip'

  const update = (patch: Partial<TaskState>) => onChange(task.id, patch)

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
    <article className={`card p-${task.priority} t-${timing} ${closed ? 'closed' : ''}`}>
      <button className="card-head" onClick={() => setOpen(!open)} aria-expanded={open}>
        <div className="badges">
          <span className={`badge pri-${task.priority}`}>{PRIORITY[task.priority].short}</span>
          <span className={`badge role-${task.role}`}>
            {ROLE[task.role].icon} {ROLE[task.role].label}
          </span>
          {task.money && <span className="badge money">💰 お金</span>}
          {state.status !== 'todo' && <span className={`badge st-${state.status}`}>{STATUS[state.status]}</span>}
        </div>
        <h3>{task.title}</h3>
        <div className="meta">
          {w.start && w.end ? (
            <span>
              推奨 {jp(w.start)}〜{jp(w.end, w.end.getFullYear() !== new Date().getFullYear())}
            </span>
          ) : (
            <span>いつでも</span>
          )}
          {timing === 'now' && daysLeft !== undefined && !closed && (
            <span className={`left ${daysLeft <= 7 ? 'urgent' : ''}`}>
              {task.hardDeadline ? '期限' : '推奨期間終了'}まであと{daysLeft}日
            </span>
          )}
          {timing === 'overdue' && <span className="left urgent">推奨期間を過ぎています</span>}
          {state.date && (
            <span className="planned">
              📅 {jp(parseDate(state.date)!)}
              {state.time && ` ${state.time}`}
              {state.calendarAdded && ' ✓カレンダー登録済'}
            </span>
          )}
        </div>
        <span className="chev">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="card-body">
          <p className="summary">{task.summary}</p>
          {task.deadlineLabel && (
            <p className={`deadline ${task.hardDeadline ? 'hard' : ''}`}>⏰ {task.deadlineLabel}</p>
          )}
          {task.money && <p className="money-line">💰 {task.money}</p>}
          {task.place && (
            <p>
              <strong>📍 窓口：</strong>
              {task.place}
            </p>
          )}
          {task.bring && (
            <div>
              <strong>🎒 持ち物</strong>
              <ul>
                {task.bring.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            </div>
          )}
          {task.papaNote && <p className="papa-note">🧔 {task.papaNote}</p>}
          {task.sourceUrl && (
            <p className="source">
              <a href={task.sourceUrl} target="_blank" rel="noopener noreferrer">
                🔗 {task.sourceLabel ?? '公式情報'}
              </a>
            </p>
          )}

          {task.affiliate && task.affiliate.length > 0 && (
            <div className="affiliates">
              <strong>🛒 おすすめ・準備リスト <small style={{ fontWeight: 400, color: '#888' }}>PR</small></strong>
              <ul>
                {task.affiliate.map((a, i) => (
                  <li key={i}>
                    <a href={a.url} target="_blank" rel="noopener noreferrer" className="affiliate-link">
                      {a.icon} {a.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="scheduler">
            <div className="row">
              <label>
                行く日・やる日
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </label>
              <label>
                時刻（空欄で終日）
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
                おすすめ日：{jp(suggested)}
                {date !== fmt(suggested) && (
                  <button className="link" onClick={() => setDate(fmt(suggested))}>
                    この日にする
                  </button>
                )}
              </p>
            )}
            {outOfWindow && <p className="hint warn">推奨期間の外の日付です</p>}
            <label className="memo">
              メモ（夫婦間の申し送りなど）
              <textarea
                rows={2}
                value={state.memo ?? ''}
                onChange={(e) => update({ memo: e.target.value })}
                placeholder="例：委任状はママが記入済み。机の上のクリアファイルに入れてあります"
              />
            </label>
            <div className="actions">
              <button className="primary" disabled={!date} onClick={addGoogle}>
                Googleカレンダーに追加
              </button>
              <button disabled={!date} onClick={addIcs}>
                .ics（iPhone等）
              </button>
              {state.status !== 'done' ? (
                <button className="done" onClick={() => update({ status: 'done' })}>
                  ✓ 完了
                </button>
              ) : (
                <button onClick={() => update({ status: state.date ? 'scheduled' : 'todo' })}>完了を取り消す</button>
              )}
              {state.status !== 'skip' && (
                <button className="ghost" onClick={() => update({ status: 'skip' })}>
                  対象外
                </button>
              )}
            </div>
            {(settings.papaEmail || settings.mamaEmail) && (
              <p className="hint">設定したメールアドレスをゲストとして招待した状態で予定作成画面が開きます。</p>
            )}
          </div>
        </div>
      )}
    </article>
  )
}
