import { useEffect, useMemo, useState } from 'react'
import type { AppData, Phase, Priority, Role, Settings, TaskState } from './types'
import { TASKS } from './data/tasks'
import { EMPTY, clearHash, load, readShared, save, shareUrl } from './lib/storage'
import { ageText, jp, parseDate, pregnancyWeek, today } from './lib/date'
import { PHASE, PRIORITY, ROLE, TIMING_LABEL, buildViews, sortViews, type Timing, type TaskView } from './lib/view'
import { buildIcs, downloadIcs } from './lib/calendar'
import { TaskCard } from './components/TaskCard'
import { SettingsPanel } from './components/SettingsPanel'
import { NurseryList } from './components/NurseryList'
import { Onboarding } from './components/Onboarding'
import { MoneySimulation } from './components/MoneySimulation'

type Tab = 'now' | 'timeline' | 'scheduled' | 'nursery' | 'money'

export default function App() {
  const [data, setData] = useState<AppData>(load)
  const [shared, setShared] = useState<AppData | undefined>(readShared)
  const [tab, setTab] = useState<Tab>('now')
  const [showSettings, setShowSettings] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(() => {
    const s = data.settings;
    return !Boolean(s.configured || s.dueDate || s.birthDate);
  })
  const [priorities, setPriorities] = useState<Priority[]>(['must', 'recommend', 'optional'])
  const [roles, setRoles] = useState<Role[]>(['papa', 'together', 'mama'])
  const [hideClosed, setHideClosed] = useState(true)
  const [toast, setToast] = useState('')
  const [focusId, setFocusId] = useState<string | undefined>()

  useEffect(() => save(data), [data])
  useEffect(() => {
    if (!toast) return
    const id = setTimeout(() => setToast(''), 2500)
    return () => clearTimeout(id)
  }, [toast])

  const { settings } = data
  const configured = Boolean(settings.configured || settings.dueDate || settings.birthDate)
  const due = parseDate(settings.dueDate)
  const birth = parseDate(settings.birthDate)

  const views = useMemo(() => buildViews(TASKS, data.tasks, settings), [data.tasks, settings])

  const filtered = views.filter(
    (v) =>
      priorities.includes(v.task.priority) &&
      roles.includes(v.task.role) &&
      !(hideClosed && (v.state.status === 'done' || v.state.status === 'skip')),
  )

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

  /** お金タブなどから該当タスクへ直行（フィルタを解除して開く） */
  const jumpToTask = (id: string) => {
    setPriorities(['must', 'recommend', 'optional'])
    setRoles(['papa', 'together', 'mama'])
    setHideClosed(false)
    setFocusId(id)
    setTab('timeline')
    setTimeout(() => setFocusId(undefined), 2500)
  }

  const saveSettings = (s: Settings) => {
    setData((d) => ({ ...d, settings: { ...s, configured: true } }))
    setShowSettings(false)
  }

  const toggle = <T,>(list: T[], v: T, set: (l: T[]) => void) =>
    set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v])

  const papaMode = roles.length === 1 && roles[0] === 'papa'

  const copyShare = async () => {
    const url = shareUrl(data)
    try {
      await navigator.clipboard.writeText(url)
      setToast('共有リンクをコピーしました。LINEなどでパートナーに送ってください')
    } catch {
      prompt('このリンクをパートナーに送ってください', url)
    }
  }

  // 共有リンクから開いた場合の取り込み確認
  if (shared) {
    return (
      <div className="app">
        <Header />
        <section className="settings">
          <h2>パートナーから共有されたデータがあります</h2>
          <p>取り込むと、この端末の進捗・予定・設定が共有内容で上書きされます。</p>
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
              取り込む
            </button>
            <button
              onClick={() => {
                setShared(undefined)
                clearHash()
              }}
            >
              取り込まない
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
          initial={!configured}
          onSave={saveSettings}
          onClose={configured ? () => setShowSettings(false) : undefined}
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
      </div>
    )
  }

  const stageText = birth
    ? `${settings.childName ?? 'お子さま'} ${ageText(birth) ?? ''}`
    : due
      ? (() => {
          const pw = pregnancyWeek(due)
          return `妊娠${pw ? `${pw.w}週${pw.d}日` : '中'}・予定日 ${jp(due, true)}`
        })()
      : '妊活中'

  const scheduled = views
    .filter((v) => v.state.date && v.state.status !== 'skip')
    .sort((a, b) => a.state.date!.localeCompare(b.state.date!))
  const upcomingScheduled = scheduled.filter((v) => parseDate(v.state.date)! >= today() && v.state.status !== 'done')

  const mustOpen = views.filter(
    (v) => v.task.priority === 'must' && (v.timing === 'now' || v.timing === 'overdue') && v.state.status === 'todo',
  ).length

  return (
    <div className="app">
      <Header>
        <button className="icon" onClick={copyShare} title="パートナーと共有">
          🔗 共有
        </button>
        <button className="icon" onClick={() => setShowSettings(true)} title="設定">
          ⚙️
        </button>
      </Header>

      <section className="status-bar">
        <div className="stage-text">{stageText}</div>
        <div className="kpis">
          <span>
            <b className={mustOpen ? 'red' : ''}>{mustOpen}</b> 件の「ぜったい」が日程未定
          </span>
          <span>
            <b>{upcomingScheduled.length}</b> 件の予定
          </span>
        </div>
      </section>

      <section style={{ margin: '0.5rem 0', padding: '0.8rem', background: '#ffebee', border: '1px solid #ef9a9a', borderRadius: '10px', fontSize: '0.9rem' }}>
        <div style={{ fontWeight: 'bold', color: '#c62828', marginBottom: '0.4rem' }}>🚨 陣痛・緊急時の連絡先</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
          <span>🏥 産院:</span>
          <a href={`tel:${settings.emergencyContacts?.hospital || ''}`} style={{ fontWeight: 'bold', color: '#c62828', textDecoration: 'none' }}>
            {settings.emergencyContacts?.hospital || '未登録'}
          </a>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>🚕 陣痛タクシー:</span>
          <a href={`tel:${settings.emergencyContacts?.taxi || ''}`} style={{ fontWeight: 'bold', color: '#c62828', textDecoration: 'none' }}>
            {settings.emergencyContacts?.taxi || '未登録'}
          </a>
        </div>
        {(!settings.emergencyContacts?.hospital || !settings.emergencyContacts?.taxi) && (
          <button onClick={() => setShowSettings(true)} style={{ marginTop: '0.5rem', width: '100%', padding: '0.4rem', fontSize: '0.8rem', background: '#fff', border: '1px solid #c62828', color: '#c62828', borderRadius: '4px', cursor: 'pointer' }}>
            設定する
          </button>
        )}
      </section>

      <nav className="tabs">
        {(
          [
            ['now', 'いまやること'],
            ['timeline', 'ぜんぶ見る'],
            ['scheduled', `予定（${upcomingScheduled.length}）`],
            ['nursery', '保活・保育園'],
            ['money', '💰 お金'],
          ] as const
        ).map(([k, l]) => (
          <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>
            {l}
          </button>
        ))}
      </nav>

      {tab !== 'scheduled' && tab !== 'nursery' && tab !== 'money' && (
        <section className="filters">
          <button
            className={`papa-mode ${papaMode ? 'on' : ''}`}
            onClick={() => setRoles(papaMode ? ['papa', 'together', 'mama'] : ['papa'])}
          >
            🧔 パパモード{papaMode ? ' ON' : ''}
          </button>
          <div className="chips">
            {(Object.keys(PRIORITY) as Priority[]).map((p) => (
              <button
                key={p}
                className={`chip pri-${p} ${priorities.includes(p) ? 'on' : ''}`}
                onClick={() => toggle(priorities, p, setPriorities)}
              >
                {PRIORITY[p].short}
              </button>
            ))}
            {(Object.keys(ROLE) as Role[]).map((r) => (
              <button
                key={r}
                className={`chip role-${r} ${roles.includes(r) ? 'on' : ''}`}
                onClick={() => toggle(roles, r, setRoles)}
              >
                {ROLE[r].icon} {ROLE[r].label}
              </button>
            ))}
            <label className="check small">
              <input type="checkbox" checked={hideClosed} onChange={(e) => setHideClosed(e.target.checked)} />
              完了・対象外を隠す
            </label>
          </div>
        </section>
      )}

      <main>
        {tab === 'now' && (
          <NowList
            views={filtered}
            settings={settings}
            onChange={updateTask}
            prep={!due && !birth}
            focusId={focusId}
            onBulkDone={bulkDone}
          />
        )}
        {tab === 'timeline' && <Timeline views={filtered} settings={settings} onChange={updateTask} focusId={focusId} />}
        {tab === 'scheduled' && (
          <section>
            <div className="bulk">
              <button
                disabled={!upcomingScheduled.length}
                onClick={() => downloadIcs('kamagaya-family.ics', buildIcs(upcomingScheduled))}
              >
                今後の予定をまとめて .ics で書き出す
              </button>
            </div>
            {scheduled.length === 0 && <p className="empty">まだ日程が決まったタスクはありません。</p>}
            {Array.from(new Set(scheduled.map((v) => v.state.date!))).map((d) => {
              const day = parseDate(d)!
              const isToday = day.getTime() === today().getTime()
              const isPast = day < today()
              return (
                <div key={d}>
                  <h2 className={`day-head ${isToday ? 'today' : ''} ${isPast ? 'past' : ''}`}>
                    📅 {jp(day, true)}
                    {isToday && ' ・今日'}
                  </h2>
                  {scheduled
                    .filter((v) => v.state.date === d)
                    .map((v) => (
                      <TaskCard key={v.task.id} view={v} settings={settings} onChange={updateTask} />
                    ))}
                </div>
              )
            })}
          </section>
        )}
        {tab === 'nursery' && <NurseryList settings={settings} onUpdateSettings={saveSettings} />}
        {tab === 'money' && <MoneySimulation settings={settings} onUpdateSettings={saveSettings} views={views} onJump={jumpToTask} />}
      </main>

      <footer>
        <p>
          掲載情報は鎌ケ谷市子育て応援サイト「かまっこ応援団」等をもとに2026年10月時点で作成しています。手続きの詳細は各タスクの公式情報リンクからご確認ください。
        </p>
        <p>
          Amazonのアソシエイトとして、かまがや親子カレンダーは適格販売により収入を得ています。「🛒 おすすめ・準備リスト」のリンクは広告（アフィリエイトリンク）です。
        </p>
      </footer>
      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}

function Header({ children }: { children?: React.ReactNode }) {
  return (
    <header className="header">
      <div>
        <h1>かまがや親子カレンダー</h1>
        <p className="tagline">何を・いつまでに・誰がやるか</p>
      </div>
      <div className="header-actions">{children}</div>
    </header>
  )
}

interface ListProps {
  views: TaskView[]
  settings: Settings
  onChange: (id: string, patch: Partial<TaskState>) => void
  focusId?: string
}

function NowList({
  views,
  settings,
  onChange,
  prep,
  focusId,
  onBulkDone,
}: ListProps & { prep: boolean; onBulkDone: (ids: string[]) => void }) {
  const groups: Timing[] = prep ? ['anytime'] : ['overdue', 'now', 'soon']
  const list = views.filter((v) => (prep ? v.task.phase === 'prep' : groups.includes(v.timing)))
  if (!list.length) return <p className="empty">いま対応が必要なタスクはありません 🎉 「ぜんぶ見る」で先の予定も確認できます。</p>
  return (
    <>
      {prep && <p className="hint block">妊娠がわかったら ⚙️ 設定から出産予定日を入力すると、妊娠期以降のタスクが表示されます。</p>}
      {groups.map((g) => {
        const items = list.filter((v) => v.timing === g).sort(sortViews)
        if (!items.length) return null
        return (
          <section key={g} className={`group g-${g}`}>
            <h2>
              {TIMING_LABEL[g]} <span className="count">{items.length}</span>
              {g === 'overdue' && (
                <button
                  className="bulk-done"
                  onClick={() => {
                    if (confirm(`期限切れ・要確認の ${items.length} 件をすべて「完了」にします。よろしいですか？`)) {
                      onBulkDone(items.map((v) => v.task.id))
                    }
                  }}
                >
                  ✅ 過去のタスクを一括完了
                </button>
              )}
            </h2>
            {items.map((v) => (
              <TaskCard key={v.task.id} view={v} settings={settings} onChange={onChange} focused={focusId === v.task.id} />
            ))}
          </section>
        )
      })}
    </>
  )
}

function Timeline({ views, settings, onChange, focusId }: ListProps) {
  return (
    <>
      {(Object.keys(PHASE) as Phase[]).map((p) => {
        const items = views.filter((v) => v.task.phase === p).sort(sortViews)
        if (!items.length) return null
        return (
          <section key={p} className="group">
            <h2>
              {PHASE[p].icon} {PHASE[p].label} <span className="count">{items.length}</span>
            </h2>
            {items.map((v) => (
              <TaskCard key={v.task.id} view={v} settings={settings} onChange={onChange} focused={focusId === v.task.id} />
            ))}
          </section>
        )
      })}
    </>
  )
}
