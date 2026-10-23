import { useEffect, useRef, useState } from 'react'
import type { Assignee, Settings, TaskState } from '../types'
import { fmt, isWeekend, jp, parseDate, quickDates, suggestedDate } from '../lib/date'
import { buildIcs, downloadIcs, googleCalendarUrl } from '../lib/calendar'
import { PRIORITY, ROLE, TIMING_LABEL, type TaskView } from '../lib/view'

interface Props {
  candidates: TaskView[]
  allViews: TaskView[]
  settings: Settings
  prep: boolean
  onChange: (id: string, patch: Partial<TaskState>) => void
  onClose: () => void
  onOpenSettings: () => void
}

const ASSIGNEE_OPTIONS: { value: Assignee; label: string }[] = [
  { value: 'papa', label: 'パパ' },
  { value: 'mama', label: 'ママ' },
  { value: 'both', label: '夫婦' },
]

export function MeetingMode({
  candidates,
  allViews,
  settings,
  prep,
  onChange,
  onClose,
  onOpenSettings,
}: Props) {
  const [queueIds] = useState<string[]>(() => candidates.map((c) => c.task.id))
  const [idx, setIdx] = useState(0)
  const boxRef = useRef<HTMLElement | null>(null)
  const [decidedIds, setDecidedIds] = useState<string[]>([])
  const [savedBanner, setSavedBanner] = useState(false)

  const currentId = queueIds[idx]
  const currentView = allViews.find((v) => v.task.id === currentId)

  const suggested = currentView ? suggestedDate(currentView.window) : undefined
  const [date, setDate] = useState<string>('')
  const [time, setTime] = useState<string>('')
  const [assignee, setAssignee] = useState<Assignee>('')

  useEffect(() => {
    if (!currentView) return
    const sug = suggestedDate(currentView.window)
    setDate(currentView.state.date ?? (sug ? fmt(sug) : ''))
    setTime(currentView.state.time ?? '')
    const defaultAssignee: Assignee =
      currentView.state.assignee ??
      (currentView.task.role === 'papa' ? 'papa' : currentView.task.role === 'mama' ? 'mama' : 'both')
    setAssignee(defaultAssignee)
    setSavedBanner(false)
  }, [currentId])

  if (queueIds.length === 0) {
    return (
      <section className="meeting-box">
        <div className="meeting-head">
          <div>
            <span className="status-kicker">WEEKEND COUPLE MEETING</span>
            <h2>夫婦会議モード</h2>
          </div>
          <button type="button" className="ghost small-btn" onClick={onClose}>
            通常表示に戻る
          </button>
        </div>
        <div className="meeting-empty">
          <p>
            現在、夫婦会議の対象となる日程未定のタスク（期限超過・現在が推奨期間・30日以内に開始）はありません。
          </p>
          {prep && (
            <p className="hint">
              出産予定日またはお子さまの生年月日を設定すると、時期に応じた手続きが会議対象として自動で抽出されます。
            </p>
          )}
          <div className="actions" style={{ justifyContent: 'center', marginTop: '0.75rem' }}>
            {prep && (
              <button type="button" className="primary" onClick={onOpenSettings}>
                設定から基準日を登録する
              </button>
            )}
            <button type="button" onClick={onClose}>
              通常表示に戻る
            </button>
          </div>
        </div>
      </section>
    )
  }

  if (idx >= queueIds.length || !currentView) {
    return (
      <section className="meeting-box">
        <div className="meeting-head">
          <div>
            <span className="status-kicker">WEEKEND COUPLE MEETING</span>
            <h2>夫婦会議モード完了</h2>
          </div>
        </div>
        <div className="meeting-complete">
          <h3>今日の会議はここまでです。決めた予定は {decidedIds.length} 件です。</h3>
          <p className="hint">
            決めた予定は「予定表」タブに時系列で整理されています。各タスクからGoogleカレンダーやiPhoneカレンダーへいつでも登録できます。
          </p>
          <div className="actions" style={{ justifyContent: 'center', marginTop: '0.85rem' }}>
            <button type="button" className="primary" onClick={onClose}>
              通常表示に戻る
            </button>
          </div>
        </div>
      </section>
    )
  }

  const { task, state, window: w, timing, daysLeft } = currentView
  const draft: TaskState = { ...state, date, time, assignee, status: 'scheduled' }

  const advance = () => {
    setIdx((i) => i + 1)
    requestAnimationFrame(() => {
      boxRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  const saveDecision = () => {
    if (!date) return
    onChange(task.id, { date, time, assignee, status: 'scheduled' })
    if (!decidedIds.includes(task.id)) {
      setDecidedIds((prev) => [...prev, task.id])
    }
    advance()
  }

  const handleGoogleCalendar = () => {
    if (!date) return
    onChange(task.id, { date, time, assignee, status: 'scheduled', calendarAdded: true })
    if (!decidedIds.includes(task.id)) {
      setDecidedIds((prev) => [...prev, task.id])
    }
    window.open(googleCalendarUrl(task, draft, settings), '_blank', 'noopener')
    setSavedBanner(true)
  }

  const handleIcsCalendar = () => {
    if (!date) return
    onChange(task.id, { date, time, assignee, status: 'scheduled', calendarAdded: true })
    if (!decidedIds.includes(task.id)) {
      setDecidedIds((prev) => [...prev, task.id])
    }
    downloadIcs(`${task.id}.ics`, buildIcs([{ task, state: draft }]))
    setSavedBanner(true)
  }

  const handleSkipTask = () => {
    onChange(task.id, { status: 'skip' })
    advance()
  }

  const handleNext = () => {
    advance()
  }

  return (
    <section className="meeting-box" ref={boxRef}>
      <div className="meeting-head">
        <div>
          <span className="status-kicker">
            夫婦会議モード（{idx + 1} / {queueIds.length}件目 ・ 決定済 {decidedIds.length}件）
          </span>
          <h2>1件ずつ日程と担当を決めましょう</h2>
        </div>
        <button type="button" className="ghost small-btn" onClick={onClose}>
          会議を終了して戻る
        </button>
      </div>

      <div className={`meeting-card p-${task.priority}`}>
        <div className="badges">
          <span className={`badge pri-${task.priority}`}>{PRIORITY[task.priority].label}</span>
          <span className={`badge role-${task.role}`}>{ROLE[task.role].label}</span>
          <span className="badge custom">{TIMING_LABEL[timing]}</span>
          {task.money && <span className="badge money">給付・助成</span>}
        </div>

        <h3 className="meeting-task-title">{task.title}</h3>
        <p className="summary">{task.summary}</p>

        <div className="info-grid">
          <div className={`info-item ${task.hardDeadline ? 'hard' : ''}`}>
            <span className="info-label">期限・時期</span>
            <span className="info-val">
              {w.start && w.end
                ? `推奨：${jp(w.start)}〜${jp(w.end, w.end.getFullYear() !== new Date().getFullYear())}`
                : '期間指定なし'}
              {task.deadlineLabel ? `（${task.deadlineLabel}）` : ''}
              {timing === 'now' && daysLeft !== undefined ? ` ／ あと${daysLeft}日` : ''}
              {timing === 'overdue' ? ' ／ 推奨期間超過' : ''}
            </span>
          </div>
          {task.place && (
            <div className="info-item">
              <span className="info-label">窓口・場所</span>
              <span className="info-val">{task.place}</span>
            </div>
          )}
          {task.bring && task.bring.length > 0 && (
            <div className="info-item">
              <span className="info-label">持ち物</span>
              <ul className="bring-list">
                {task.bring.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            </div>
          )}
          {task.papaNote && (
            <div className="info-item papa-note">
              <span className="info-label">分担メモ</span>
              <span className="info-val">{task.papaNote}</span>
            </div>
          )}
        </div>

        <div className="scheduler">
          <div className="subhead">いつ・誰がやるかを決める</div>
          <div className="row">
            <label>
              実施日
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </label>
            <label>
              時刻（任意）
              <input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </label>
            <div className="field-block">
              <span className="field-title">担当</span>
              <div className="meeting-assignee-group">
                {ASSIGNEE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    className={`chip ${assignee === opt.value ? 'on' : ''}`}
                    onClick={() => setAssignee(opt.value)}
                  >
                    {assignee === opt.value ? '✓ ' : ''}
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {suggested && (
            <p className="hint">
              目安日：{jp(suggested)}
              {date !== fmt(suggested) && (
                <button type="button" className="link" onClick={() => setDate(fmt(suggested))}>
                  この日をセット
                </button>
              )}
            </p>
          )}

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

          <div className="actions meeting-primary-actions">
            <button type="button" className="primary" disabled={!date} onClick={saveDecision}>
              決めた（予定として保存）
            </button>
            <button type="button" disabled={!date} onClick={handleGoogleCalendar}>
              Googleカレンダー登録
            </button>
            <button type="button" disabled={!date} onClick={handleIcsCalendar}>
              iPhoneカレンダー(.ics)
            </button>
          </div>

          {savedBanner && (
            <div className="meeting-saved-banner">
              <span>✓ 予定として保存しました（カレンダー登録も上から行えます）</span>
              <button type="button" className="primary small-btn" onClick={handleNext}>
                次のタスクへ進む →
              </button>
            </div>
          )}

          <div className="actions meeting-sub-actions">
            <button type="button" onClick={handleNext}>
              {savedBanner ? '次へ進む →' : 'あとで（次へ）'}
            </button>
            <button type="button" className="ghost" onClick={handleSkipTask}>
              対象外にする
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
