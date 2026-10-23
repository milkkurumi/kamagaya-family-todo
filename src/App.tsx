import { useEffect, useMemo, useState } from 'react'
import type { AppData, Phase, Priority, Role, Settings, TaskDef, TaskState } from './types'
import { TASKS } from './data/tasks'
import { EMPTY, clearHash, load, readShared, save, shareUrl } from './lib/storage'
import { ageText, jp, parseDate, pregnancyWeek, today } from './lib/date'
import { PHASE, PRIORITY, ROLE, TIMING_LABEL, buildViews, sortViews, type Timing, type TaskView } from './lib/view'
import { buildIcs, downloadIcs } from './lib/calendar'
import { TaskCard } from './components/TaskCard'
import { SettingsPanel, FriendShareSection } from './components/SettingsPanel'
import { NurseryList } from './components/NurseryList'
import { Onboarding } from './components/Onboarding'
import { MoneySimulation } from './components/MoneySimulation'
import { MeetingMode } from './components/MeetingMode'
import { formatPhoneNumber } from './lib/phone'
import { LAST_VERIFIED_AT } from './lib/site'

type Tab = 'now' | 'timeline' | 'scheduled' | 'nursery' | 'money'

export default function App() {
  const [data, setData] = useState<AppData>(load)
  const [shared, setShared] = useState<AppData | undefined>(readShared)
  const [tab, setTab] = useState<Tab>('now')
  const [showSettings, setShowSettings] = useState(false)
  const [showEmergency, setShowEmergency] = useState(false)
  const [showAddTask, setShowAddTask] = useState(false)
  const [showMeeting, setShowMeeting] = useState(false)
  const [taskQuery, setTaskQuery] = useState('')
  const [showOnboarding, setShowOnboarding] = useState(() => {
    const s = data.settings
    return !Boolean(s.configured || s.dueDate || s.birthDate)
  })
  const [priorityFilter, setPriorityFilter] = useState<'all' | Priority>('all')
  const [roleFilter, setRoleFilter] = useState<'all' | Role>('all')
  const [hideClosed, setHideClosed] = useState(true)
  const [toast, setToast] = useState('')
  const [focusId, setFocusId] = useState<string | undefined>()

  // カスタムタスク入力用ステート
  const [newTitle, setNewTitle] = useState('')
  const [newPhase, setNewPhase] = useState<Phase>('pregnancy')
  const [newPriority, setNewPriority] = useState<Priority>('recommend')
  const [newRole, setNewRole] = useState<Role>('together')
  const [newPlace, setNewPlace] = useState('')
  const [newSummary, setNewSummary] = useState('')
  const [newDate, setNewDate] = useState('')

  useEffect(() => save(data), [data])
  useEffect(() => {
    if (!toast) return
    const id = setTimeout(() => setToast(''), 2600)
    return () => clearTimeout(id)
  }, [toast])

  const { settings } = data
  const configured = Boolean(settings.configured || settings.dueDate || settings.birthDate)
  const due = parseDate(settings.dueDate)
  const birth = parseDate(settings.birthDate)

  const views = useMemo(() => buildViews(TASKS, data.tasks, settings), [data.tasks, settings])

  const filtered = views.filter((v) => {
    if (priorityFilter !== 'all' && v.task.priority !== priorityFilter) return false
    if (roleFilter !== 'all' && v.task.role !== roleFilter) return false
    if (hideClosed && (v.state.status === 'done' || v.state.status === 'skip')) return false
    if (taskQuery.trim()) {
      const q = taskQuery.trim().toLowerCase()
      const hay = `${v.task.title} ${v.task.summary} ${v.task.place || ''} ${(v.task.bring || []).join(' ')} ${(v.task.checklist || []).join(' ')} ${v.state.memo || ''}`.toLowerCase()
      if (!hay.includes(q)) return false
    }
    return true
  })

  const hasTaskFilter = priorityFilter !== 'all' || roleFilter !== 'all' || Boolean(taskQuery.trim())
  const activeTaskFilterLabels = [
    priorityFilter !== 'all' ? `優先度：${PRIORITY[priorityFilter].short}` : '',
    roleFilter !== 'all' ? `担当：${ROLE[roleFilter].label}` : '',
    taskQuery.trim() ? `検索：「${taskQuery.trim()}」` : '',
  ].filter(Boolean)

  const clearTaskFilters = () => {
    setPriorityFilter('all')
    setRoleFilter('all')
    setTaskQuery('')
  }

  const updateTask = (id: string, patch: Partial<TaskState>) =>
    setData((d) => ({
      ...d,
      tasks: { ...d.tasks, [id]: { ...(d.tasks[id] ?? { status: 'todo' }), ...patch } },
    }))

  const bulkDone = (ids: string[]) =>
    setData((d) => {
      const tasks = { ...d.tasks }
      ids.forEach((id) => {
        tasks[id] = { ...(tasks[id] ?? { status: 'todo' }), status: 'done' }
      })
      return { ...d, tasks }
    })

  const addCustomTask = () => {
    if (!newTitle.trim()) return
    const id = `custom-task-${Date.now()}`
    const def: TaskDef = {
      id,
      title: newTitle.trim(),
      phase: newPhase,
      priority: newPriority,
      role: newRole,
      anchor: 'none',
      summary: newSummary.trim() || '夫婦で追加したオリジナルタスクです。',
      place: newPlace.trim() || undefined,
      custom: true,
    }
    const nextCustom = [def, ...(settings.customTasks || [])]
    const nextTasks = { ...data.tasks }
    if (newDate) {
      nextTasks[id] = { status: 'scheduled', date: newDate }
    }
    setData((d) => ({
      ...d,
      settings: { ...d.settings, customTasks: nextCustom },
      tasks: nextTasks,
    }))
    setNewTitle('')
    setNewPlace('')
    setNewSummary('')
    setNewDate('')
    setShowAddTask(false)
    setToast('タスクを追加しました')
  }

  const deleteCustomTask = (id: string) => {
    const nextCustom = (settings.customTasks || []).filter((t) => t.id !== id)
    setData((d) => ({
      ...d,
      settings: { ...d.settings, customTasks: nextCustom },
    }))
    setToast('追加タスクを削除しました')
  }

  const jumpToTask = (id: string) => {
    setPriorityFilter('all')
    setRoleFilter('all')
    setHideClosed(false)
    setTaskQuery('')
    setFocusId(id)
    setTab('timeline')
    setTimeout(() => setFocusId(undefined), 2500)
  }

  const saveSettings = (s: Settings) => {
    setData((d) => ({ ...d, settings: { ...s, configured: true } }))
    setShowSettings(false)
  }

  const copyShare = async () => {
    const url = shareUrl(data)
    try {
      await navigator.clipboard.writeText(url)
      setToast('共有リンクをコピーしました。LINE等でパートナーに送信してください')
    } catch {
      prompt('このリンクをパートナーに送ってください', url)
    }
  }

  if (shared) {
    return (
      <div className="app">
        <Header />
        <section className="settings">
          <h2>パートナーから共有されたデータがあります</h2>
          <p className="hint">取り込むと、この端末の進捗・予定・設定が共有内容で更新されます。</p>
          <div className="actions">
            <button
              className="primary"
              onClick={() => {
                setData(shared)
                setShared(undefined)
                clearHash()
                setToast('共有データを取り込みました')
              }}
            >
              データを取り込む
            </button>
            <button
              onClick={() => {
                setShared(undefined)
                clearHash()
              }}
            >
              キャンセル
            </button>
          </div>
        </section>
      </div>
    )
  }

  if (!configured || showSettings) {
    if (showOnboarding) {
      return (
        <div className="app">
          <Header />
          <Onboarding onComplete={() => setShowOnboarding(false)} />
        </div>
      )
    }

    return (
      <div className="app">
        <Header />
        <SettingsPanel
          settings={settings}
          appData={data}
          initial={!configured}
          onSave={(s) => {
            saveSettings(s)
            setToast('設定を保存しました')
          }}
          onImportData={(restored) => {
            setData(restored)
            setShowSettings(false)
            setToast('バックアップからデータを復元しました')
          }}
          onClose={configured ? () => setShowSettings(false) : undefined}
          onToast={setToast}
          onReset={
            configured
              ? () => {
                  if (confirm('進捗・予定・設定をすべて削除します。よろしいですか？')) {
                    setData(EMPTY)
                    setShowSettings(false)
                  }
                }
              : undefined
          }
        />
        {toast && <div className="toast">{toast}</div>}
      </div>
    )
  }

  const stageText = birth
    ? `${settings.childName ? `${settings.childName}（` : ''}${ageText(birth) ?? '出産後'}${settings.childName ? '）' : ''}・生年月日 ${jp(birth, true)}`
    : due
      ? (() => {
          const pw = pregnancyWeek(due)
          return `妊娠${pw ? `${pw.w}週${pw.d}日` : '中'}（出産予定日：${jp(due, true)}）`
        })()
      : '妊活・準備期'

  const scheduled = views
    .filter((v) => v.state.date && v.state.status !== 'skip')
    .sort((a, b) => a.state.date!.localeCompare(b.state.date!))
  const upcomingScheduled = scheduled.filter((v) => parseDate(v.state.date)! >= today() && v.state.status !== 'done')

  const mustOpen = views.filter(
    (v) => v.task.priority === 'must' && (v.timing === 'now' || v.timing === 'overdue') && v.state.status === 'todo',
  ).length
  const doneCount = views.filter((v) => v.state.status === 'done').length
  const donePercent = views.length > 0 ? Math.round((doneCount / views.length) * 100) : 0

  const nextMustTask = views
    .filter((v) => v.task.priority === 'must' && v.state.status === 'todo')
    .filter((v) => (due || birth ? Boolean(v.window.end || v.window.start) : v.task.phase === 'prep'))
    .sort((a, b) => {
      const ae = a.window.end?.getTime() ?? a.window.start?.getTime() ?? Number.MAX_SAFE_INTEGER
      const be = b.window.end?.getTime() ?? b.window.start?.getTime() ?? Number.MAX_SAFE_INTEGER
      return ae - be
    })[0]

  const nextMustDeadline = nextMustTask
    ? nextMustTask.timing === 'overdue'
      ? '推奨期間超過・要確認'
      : nextMustTask.daysLeft !== undefined && nextMustTask.window.end
        ? `あと${nextMustTask.daysLeft}日（〜${jp(nextMustTask.window.end)}）`
        : nextMustTask.window.start && nextMustTask.window.end
          ? `${jp(nextMustTask.window.start)}〜${jp(nextMustTask.window.end)}`
          : (nextMustTask.task.deadlineLabel ?? '')
    : ''

  const meetingCandidates = useMemo(() => {
    const targetTimings: Timing[] = ['overdue', 'now', 'soon']
    return views
      .filter((v) => v.state.status === 'todo' && !v.state.date && targetTimings.includes(v.timing))
      .sort((a, b) => {
        const po = PRIORITY[a.task.priority].order - PRIORITY[b.task.priority].order
        if (po !== 0) return po
        const ae = a.window.end?.getTime() ?? a.window.start?.getTime() ?? Number.MAX_SAFE_INTEGER
        const be = b.window.end?.getTime() ?? b.window.start?.getTime() ?? Number.MAX_SAFE_INTEGER
        return ae - be
      })
  }, [views])

  return (
    <div className="app">
      <Header>
        <button
          type="button"
          className={`header-btn emergency-toggle ${showEmergency ? 'on' : ''}`}
          onClick={() => setShowEmergency(!showEmergency)}
        >
          緊急・相談窓口
        </button>
        <button type="button" className="header-btn" onClick={copyShare}>
          共有リンク
        </button>
        <button type="button" className="header-btn" onClick={() => setShowSettings(true)}>
          設定
        </button>
      </Header>

      {showEmergency && (
        <section className="emergency-panel">
          <div className="emergency-head">
            <strong>陣痛・急病・鎌ケ谷市の相談窓口（タップで電話発信）</strong>
            <button type="button" className="ghost small-btn" onClick={() => setShowEmergency(false)}>
              閉じる
            </button>
          </div>
          <div className="emergency-grid">
            <div className="emergency-card user-contact">
              <span className="em-label">登録済みの産院</span>
              {settings.emergencyContacts?.hospital ? (
                <a href={`tel:${formatPhoneNumber(settings.emergencyContacts.hospital)}`} className="em-tel">
                  {formatPhoneNumber(settings.emergencyContacts.hospital)}
                </a>
              ) : (
                <button type="button" className="btn-inline" onClick={() => setShowSettings(true)}>
                  設定から電話番号を登録
                </button>
              )}
            </div>
            <div className="emergency-card user-contact">
              <span className="em-label">登録済みの陣痛タクシー</span>
              {settings.emergencyContacts?.taxi ? (
                <a href={`tel:${formatPhoneNumber(settings.emergencyContacts.taxi)}`} className="em-tel">
                  {formatPhoneNumber(settings.emergencyContacts.taxi)}
                </a>
              ) : (
                <button type="button" className="btn-inline" onClick={() => setShowSettings(true)}>
                  設定から電話番号を登録
                </button>
              )}
            </div>
            <div className="emergency-card">
              <span className="em-label">千葉県こども急病電話相談（毎日19時〜翌8時）</span>
              <a href="tel:043-242-9939" className="em-tel">
                #8000 / 043-242-9939
              </a>
            </div>
            <div className="emergency-card">
              <span className="em-label">鎌ケ谷市 休日当番医案内テレホン（テープ案内）</span>
              <a href="tel:047-445-2300" className="em-tel">
                047-445-2300
              </a>
            </div>
            <div className="emergency-card">
              <span className="em-label">健康増進課 母子保健係（平日8:30〜17:00）</span>
              <a href="tel:047-445-1393" className="em-tel">
                047-445-1393
              </a>
            </div>
            <div className="emergency-card">
              <span className="em-label">市内救急病院（鎌ケ谷総合病院 / 東邦鎌谷病院）</span>
              <div className="em-pair">
                <a href="tel:047-498-8111">鎌ケ谷総合 047-498-8111</a>
                <a href="tel:047-445-6411">東邦鎌谷 047-445-6411</a>
              </div>
            </div>
          </div>
        </section>
      )}

      <section className="status-bar">
        <div className="status-top-row">
          <div className="status-main">
            <span className="status-kicker">現在のステータス</span>
            <div className="stage-text">{stageText}</div>
          </div>
          <div className="kpis">
            <div className="kpi-box">
              <span className="kpi-label">日程が未定の必須手続き</span>
              <strong className={mustOpen ? 'red' : ''}>{mustOpen}件</strong>
            </div>
            <div className="kpi-box">
              <span className="kpi-label">今後の予定</span>
              <strong>{upcomingScheduled.length}件</strong>
            </div>
            <div className="kpi-box">
              <span className="kpi-label">完了済</span>
              <strong>
                {doneCount}/{views.length} <span className="kpi-pct">({donePercent}%)</span>
              </strong>
            </div>
          </div>
        </div>

        <div className="status-sub-row">
          <div className="status-progress-wrap">
            <div className="status-progress-head">
              <span>全体の完了率</span>
              <strong>{donePercent}%</strong>
            </div>
            <div
              className="status-progress-track"
              role="progressbar"
              aria-valuenow={donePercent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="タスク完了率"
            >
              <div className="status-progress-fill" style={{ width: `${donePercent}%` }} />
            </div>
          </div>

          <div className="status-next-must">
            <span className="next-must-label">次にやる必須タスク</span>
            {nextMustTask ? (
              <div className="next-must-body">
                <div className="next-must-info">
                  <strong className="next-must-title">{nextMustTask.task.title}</strong>
                  {nextMustDeadline && (
                    <span className={`next-must-deadline ${nextMustTask.timing === 'overdue' ? 'urgent' : ''}`}>
                      {nextMustDeadline}
                    </span>
                  )}
                </div>
                <button type="button" className="small-btn" onClick={() => jumpToTask(nextMustTask.task.id)}>
                  開く →
                </button>
              </div>
            ) : !due && !birth ? (
              <div className="next-must-empty">
                出産予定日または生年月日を「設定」から登録すると、期限が近い必須タスクが表示されます
              </div>
            ) : (
              <div className="next-must-empty done">必須タスクはすべて日程決定・完了済みです</div>
            )}
          </div>
        </div>
      </section>

      <nav className="tabs" aria-label="メインメニュー">
        {(
          [
            ['now', 'いまやること'],
            ['timeline', '全期間一覧'],
            ['scheduled', `予定表（${upcomingScheduled.length}）`],
            ['nursery', '保活・園比較'],
            ['money', 'お金・助成金'],
          ] as const
        ).map(([k, l]) => (
          <button key={k} type="button" className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>
            {l}
          </button>
        ))}
      </nav>

      {(tab === 'now' || tab === 'timeline') && (
        <section className={`filter-stack ${hasTaskFilter ? 'is-filtered' : ''}`}>
          <div className="search-row">
            <input
              type="search"
              className="task-search"
              value={taskQuery}
              onChange={(e) => setTaskQuery(e.target.value)}
              placeholder="タスク名・窓口・持ち物・グッズ（安産祈願、骨盤ベルトなど）で検索..."
            />
            <button type="button" onClick={() => setShowAddTask(!showAddTask)}>
              {showAddTask ? '閉じる' : '+ タスクを追加'}
            </button>
          </div>

          {showAddTask && (
            <div className="panel-box">
              <div className="subhead">夫婦のオリジナルタスク・通院予定を追加</div>
              <div className="form-grid">
                <label>
                  タスク名（必須）
                  <input
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="例：両親学級の予約、戌の日のお参り、産院の4Dエコー"
                  />
                </label>
                <label>
                  時期区分
                  <select value={newPhase} onChange={(e) => setNewPhase(e.target.value as Phase)}>
                    {(Object.keys(PHASE) as Phase[]).map((p) => (
                      <option key={p} value={p}>
                        {PHASE[p].label}（{PHASE[p].sub}）
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  優先度
                  <select value={newPriority} onChange={(e) => setNewPriority(e.target.value as Priority)}>
                    {(Object.keys(PRIORITY) as Priority[]).map((p) => (
                      <option key={p} value={p}>
                        {PRIORITY[p].label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  担当の目安
                  <select value={newRole} onChange={(e) => setNewRole(e.target.value as Role)}>
                    {(Object.keys(ROLE) as Role[]).map((r) => (
                      <option key={r} value={r}>
                        {ROLE[r].label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  予定日（決まっている場合）
                  <input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} />
                </label>
                <label>
                  場所・窓口（任意）
                  <input value={newPlace} onChange={(e) => setNewPlace(e.target.value)} placeholder="例：〇〇産婦人科" />
                </label>
              </div>
              <label>
                メモ・内容（任意）
                <input
                  value={newSummary}
                  onChange={(e) => setNewSummary(e.target.value)}
                  placeholder="例：持ち物や確認したいことを記入"
                />
              </label>
              <div className="actions">
                <button type="button" className="primary" onClick={addCustomTask} disabled={!newTitle.trim()}>
                  リストに追加する
                </button>
              </div>
            </div>
          )}

          <div className="filter-group">
            <span className="filter-label">優先度</span>
            <div className="chip-scroll">
              <button
                type="button"
                className={`chip ${priorityFilter === 'all' ? 'on' : ''}`}
                onClick={() => setPriorityFilter('all')}
              >
                {priorityFilter === 'all' ? '✓ ' : ''}すべて
              </button>
              {(Object.keys(PRIORITY) as Priority[]).map((p) => {
                const active = priorityFilter === p
                return (
                  <button
                    key={p}
                    type="button"
                    className={`chip pri-${p} ${active ? 'on' : ''}`}
                    onClick={() => setPriorityFilter(active ? 'all' : p)}
                  >
                    {active ? '✓ ' : ''}
                    {PRIORITY[p].short}のみ
                  </button>
                )
              })}
            </div>
          </div>

          <div className="filter-group">
            <span className="filter-label">担当</span>
            <div className="chip-scroll">
              <button
                type="button"
                className={`chip ${roleFilter === 'all' ? 'on' : ''}`}
                onClick={() => setRoleFilter('all')}
              >
                {roleFilter === 'all' ? '✓ ' : ''}すべて
              </button>
              {(Object.keys(ROLE) as Role[]).map((r) => {
                const active = roleFilter === r
                return (
                  <button
                    key={r}
                    type="button"
                    className={`chip role-${r} ${active ? 'on' : ''}`}
                    onClick={() => setRoleFilter(active ? 'all' : r)}
                  >
                    {active ? '✓ ' : ''}
                    {ROLE[r].label}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="filter-footer-row">
            {hasTaskFilter ? (
              <div className="active-filter-banner">
                <span className="active-filter-text">
                  <strong>フィルター適用中：</strong>
                  {activeTaskFilterLabels.join(' ／ ')}
                </span>
                <button type="button" className="filter-reset-btn" onClick={clearTaskFilters}>
                  ✕ 絞り込みをすべて解除
                </button>
              </div>
            ) : (
              <span className="filter-idle-text">フィルターなし（全条件を表示中）</span>
            )}

            <label className="check small">
              <input type="checkbox" checked={hideClosed} onChange={(e) => setHideClosed(e.target.checked)} />
              完了・対象外を隠す
            </label>
          </div>
        </section>
      )}

      <main>
        {tab === 'now' && (
          <>
            {showMeeting ? (
              <MeetingMode
                candidates={meetingCandidates}
                allViews={views}
                settings={settings}
                prep={!due && !birth}
                onChange={updateTask}
                onClose={() => setShowMeeting(false)}
                onOpenSettings={() => {
                  setShowMeeting(false)
                  setShowSettings(true)
                }}
              />
            ) : (
              <div className="meeting-launch-bar">
                <div className="meeting-launch-text">
                  <strong>週末の夫婦会議モード</strong>
                  <span>
                    直近で日程が未定の手続き（{meetingCandidates.length}件）を、優先度順に1件ずつ確認して担当と実施日を決められます。
                  </span>
                </div>
                <button type="button" className="primary" onClick={() => setShowMeeting(true)}>
                  夫婦会議をはじめる{meetingCandidates.length > 0 ? `（${meetingCandidates.length}件）` : ''}
                </button>
              </div>
            )}
            <NowList
              views={filtered}
              allViews={views}
              settings={settings}
              onChange={updateTask}
              onDeleteCustom={deleteCustomTask}
              prep={!due && !birth}
              focusId={focusId}
              onBulkDone={bulkDone}
              hasFilter={hasTaskFilter}
              onClearFilters={clearTaskFilters}
              onOpenTimeline={() => setTab('timeline')}
            />
          </>
        )}
        {tab === 'timeline' && (
          <Timeline
            views={filtered}
            settings={settings}
            onChange={updateTask}
            onDeleteCustom={deleteCustomTask}
            focusId={focusId}
            hasFilter={hasTaskFilter}
            onClearFilters={clearTaskFilters}
          />
        )}
        {tab === 'scheduled' && (
          <section className="section-block">
            <div className="section-header-row">
              <div>
                <h2>予定日が決まったタスク一覧</h2>
                <p className="section-desc">夫婦で決めた実施日順に並んでいます。</p>
              </div>
              <button
                type="button"
                disabled={!upcomingScheduled.length}
                onClick={() => downloadIcs('kamagaya-family.ics', buildIcs(upcomingScheduled))}
              >
                今後の予定を一括で .ics 出力
              </button>
            </div>
            {scheduled.length === 0 && (
              <p className="empty">まだ日程が決まったタスクはありません。各タスクの「詳細」から実施日を登録できます。</p>
            )}
            {Array.from(new Set(scheduled.map((v) => v.state.date!))).map((d) => {
              const day = parseDate(d)!
              const isToday = day.getTime() === today().getTime()
              const isPast = day < today()
              return (
                <div key={d} className="schedule-day-group">
                  <h3 className={`day-head ${isToday ? 'today' : ''} ${isPast ? 'past' : ''}`}>
                    <span>{jp(day, true)}</span>
                    {isToday && <span className="today-pill">今日</span>}
                  </h3>
                  {scheduled
                    .filter((v) => v.state.date === d)
                    .map((v) => (
                      <TaskCard
                        key={v.task.id}
                        view={v}
                        settings={settings}
                        onChange={updateTask}
                        onDeleteCustom={deleteCustomTask}
                      />
                    ))}
                </div>
              )
            })}
          </section>
        )}
        {tab === 'nursery' && <NurseryList settings={settings} onUpdateSettings={saveSettings} />}
        {tab === 'money' && (
          <MoneySimulation settings={settings} onUpdateSettings={saveSettings} views={views} onJump={jumpToTask} />
        )}
      </main>

      <footer>
        <FriendShareSection onToast={setToast} />
        <p>
          掲載情報は鎌ケ谷市公式ホームページおよび鎌ケ谷市子育て応援サイト「かまっこ応援団」の公開情報をもとに構成しています（最終確認：{LAST_VERIFIED_AT}時点）。制度の最新要件は各タスクの参照元リンクからご確認ください。
        </p>
        <p>
          Amazonのアソシエイトとして、かまがや親子カレンダーは適格販売により収入を得ています。タスク詳細内の「関連アイテム」はアフィリエイト広告を含みます。
        </p>
      </footer>

      <nav className="bottom-tabs" aria-label="モバイル下部メニュー">
        {(
          [
            ['now', 'いまやる', 'tab-now'],
            ['timeline', '全期間', 'tab-timeline'],
            ['scheduled', `予定（${upcomingScheduled.length}）`, 'tab-scheduled'],
            ['nursery', '保活', 'tab-nursery'],
            ['money', 'お金', 'tab-money'],
          ] as const
        ).map(([k, label, iconId]) => (
          <button
            key={k}
            type="button"
            className={tab === k ? 'on' : ''}
            aria-current={tab === k ? 'page' : undefined}
            onClick={() => setTab(k)}
          >
            <svg className="bottom-tab-icon" viewBox="0 0 20 20" aria-hidden="true">
              <use href={`/icons.svg#${iconId}`} />
            </svg>
            <span className="bottom-tab-label">{label}</span>
          </button>
        ))}
      </nav>
      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}

function Header({ children }: { children?: React.ReactNode }) {
  return (
    <header className="header">
      <div className="brand">
        <div className="brand-row">
          <span className="city-tag">千葉県鎌ケ谷市</span>
          <h1>かまがや親子カレンダー</h1>
        </div>
        <p className="tagline">妊娠・出産・保活・予防接種の夫婦分担スケジュール帳</p>
      </div>
      {children && <div className="header-actions">{children}</div>}
    </header>
  )
}

interface ListProps {
  views: TaskView[]
  settings: Settings
  onChange: (id: string, patch: Partial<TaskState>) => void
  onDeleteCustom: (id: string) => void
  focusId?: string
  hasFilter?: boolean
  onClearFilters?: () => void
}

function NowList({
  views,
  allViews,
  settings,
  onChange,
  onDeleteCustom,
  prep,
  focusId,
  onBulkDone,
  hasFilter,
  onClearFilters,
  onOpenTimeline,
}: ListProps & {
  allViews: TaskView[]
  prep: boolean
  onBulkDone: (ids: string[]) => void
  onOpenTimeline: () => void
}) {
  const groups: Timing[] = prep ? ['anytime'] : ['overdue', 'now', 'soon']
  const list = views.filter((v) => (prep ? v.task.phase === 'prep' : groups.includes(v.timing)))
  if (!list.length) {
    if (hasFilter) {
      return (
        <div className="empty">
          <p>現在の絞り込み条件に一致するタスクがありません。条件を変更するかフィルターを解除してください。</p>
          {onClearFilters && (
            <div className="empty-actions">
              <button type="button" onClick={onClearFilters}>
                絞り込みをすべて解除する
              </button>
            </div>
          )}
        </div>
      )
    }
    const nextLater = allViews
      .filter((v) => v.timing === 'later' && v.state.status === 'todo' && v.window.start)
      .sort(sortViews)[0]
    return (
      <div className="empty">
        <p>
          いま期限が近い手続きはありません。
          {nextLater
            ? `次は ${jp(nextLater.window.start!)} 頃から「${nextLater.task.title}」が始まります。`
            : '直近の手続きはすべて順調に片付いています。'}
        </p>
        <div className="empty-actions">
          <button type="button" onClick={onOpenTimeline}>
            「全期間一覧」で先のスケジュールを見る
          </button>
        </div>
      </div>
    )
  }
  return (
    <>
      {prep && (
        <p className="hint block">
          妊娠がわかったら上部「設定」から出産予定日を登録すると、妊娠週数に応じた手続きスケジュールが自動計算されます。
        </p>
      )}
      {groups.map((g) => {
        const items = list.filter((v) => v.timing === g).sort(sortViews)
        if (!items.length) return null
        return (
          <section key={g} className={`group g-${g}`}>
            <div className="group-head">
              <h2>
                {TIMING_LABEL[g]} <span className="count">{items.length}</span>
              </h2>
              {g === 'overdue' && (
                <button
                  type="button"
                  className="bulk-done"
                  onClick={() => {
                    if (confirm(`推奨期間を過ぎている ${items.length} 件のタスクをすべて「完了」にしますか？`)) {
                      onBulkDone(items.map((v) => v.task.id))
                    }
                  }}
                >
                  過去のタスクを一括完了にする
                </button>
              )}
            </div>
            {items.map((v) => (
              <TaskCard
                key={v.task.id}
                view={v}
                settings={settings}
                onChange={onChange}
                onDeleteCustom={onDeleteCustom}
                focused={focusId === v.task.id}
              />
            ))}
          </section>
        )
      })}
    </>
  )
}

function Timeline({ views, settings, onChange, onDeleteCustom, focusId, hasFilter, onClearFilters }: ListProps) {
  if (!views.length) {
    return (
      <div className="empty">
        <p>条件に一致するタスクがありません。検索語句やフィルターを変更してください。</p>
        {hasFilter && onClearFilters && (
          <div className="empty-actions">
            <button type="button" onClick={onClearFilters}>
              絞り込みをすべて解除する
            </button>
          </div>
        )}
      </div>
    )
  }
  return (
    <>
      {(Object.keys(PHASE) as Phase[]).map((p) => {
        const items = views.filter((v) => v.task.phase === p).sort(sortViews)
        if (!items.length) return null
        return (
          <section key={p} className="group">
            <div className="group-head">
              <h2>
                {PHASE[p].label}
                <span className="phase-sub">{PHASE[p].sub}</span>
                <span className="count">{items.length}</span>
              </h2>
            </div>
            {items.map((v) => (
              <TaskCard
                key={v.task.id}
                view={v}
                settings={settings}
                onChange={onChange}
                onDeleteCustom={onDeleteCustom}
                focused={focusId === v.task.id}
              />
            ))}
          </section>
        )
      })}
    </>
  )
}
