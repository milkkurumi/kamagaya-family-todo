import { useState } from 'react'
import type { Settings } from '../types'
import type { TaskView } from '../lib/view'

interface Props {
  settings: Settings
  onUpdateSettings: (newSettings: Settings) => void
  views: TaskView[]
  /** 該当タスクカードへジャンプ */
  onJump: (taskId: string) => void
}

const card = { background: '#fff', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', marginBottom: '1.5rem' } as const
const row = { display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '1rem' } as const

const STATUS_BADGE = {
  todo: { label: '未手続', cls: '' },
  scheduled: { label: '📅 予定済', cls: 'scheduled' },
  done: { label: '✅ 手続済', cls: 'done' },
  skip: { label: '対象外', cls: '' },
} as const

export function MoneySimulation({ settings, onUpdateSettings, views, onJump }: Props) {
  const [deliveryCost, setDeliveryCost] = useState(settings.budgetSettings?.deliveryCost || 500000)
  const [babyGoods, setBabyGoods] = useState(settings.budgetSettings?.babyGoods || 150000)

  const save = (d: number, b: number) => {
    onUpdateSettings({ ...settings, budgetSettings: { deliveryCost: d, babyGoods: b } })
  }

  const lumpSum = 500000 // 出産育児一時金
  const supportGrant = 100000 // 出産・子育て応援給付金（妊娠時5万＋出生後5万）
  const totalIncome = lumpSum + supportGrant
  const totalExpenses = deliveryCost + babyGoods
  const net = totalIncome - totalExpenses

  return (
    <div style={{ paddingBottom: '80px' }}>
      <h2>お金のシミュレーション</h2>
      <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '1.5rem' }}>
        出産前後に「もらえるお金」と「かかるお金」を計算して、手出しの費用（自己負担額）を確認できます。
      </p>

      <div style={card}>
        <h3 style={{ margin: '0 0 1rem 0', color: '#2b7055' }}>もらえるお金（収入）</h3>
        <p style={{ fontSize: '0.8rem', color: '#888', margin: '0 0 0.6rem' }}>タップすると、該当する手続きのタスクへ移動して日程を決められます。</p>
        {[
          { label: '出産育児一時金', amount: 500000, taskId: 'preg-direct-pay' },
          { label: '出産応援給付金（妊娠時）', amount: 50000, taskId: 'preg-benefit1' },
          { label: '子育て応援給付金（出生後）', amount: 50000, taskId: 'pp-benefit2' },
        ].map((r) => {
          const v = views.find((x) => x.task.id === r.taskId)
          const st = v ? STATUS_BADGE[v.state.status] : undefined
          return (
            <button
              key={r.taskId}
              className="money-row"
              onClick={() => v && onJump(r.taskId)}
              disabled={!v}
              title="手続きのタスクを開く"
            >
              <span>
                {r.label}
                {st && <span className={`st ${st.cls}`} style={{ marginLeft: '0.5rem' }}>{st.label}</span>}
              </span>
              <strong>{r.amount.toLocaleString()}円 ›</strong>
            </button>
          )
        })}
        <div style={{ borderTop: '1px dashed #ccc', margin: '0.5rem 0' }}></div>
        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#e53935', fontWeight: 'bold', fontSize: '1.1rem' }}>
          <span>合計支給額:</span>
          <span>{totalIncome.toLocaleString()}円</span>
        </div>
      </div>

      <div style={card}>
        <h3 style={{ margin: '0 0 1rem 0', color: '#2b7055' }}>かかるお金（支出予測）</h3>

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ ...row, fontWeight: 'bold' }}>
            <span>分娩・入院費用:</span>
            <span>{deliveryCost.toLocaleString()}円</span>
          </label>
          <input
            type="range"
            min="400000"
            max="1000000"
            step="10000"
            value={deliveryCost}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10)
              setDeliveryCost(val)
              save(val, babyGoods)
            }}
            style={{ width: '100%', accentColor: '#2b7055' }}
          />
          <small style={{ color: '#888' }}>病院により異なります（無痛分娩の場合は+10〜15万円が目安）</small>
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ ...row, fontWeight: 'bold' }}>
            <span>育児用品・準備費用:</span>
            <span>{babyGoods.toLocaleString()}円</span>
          </label>
          <input
            type="range"
            min="50000"
            max="300000"
            step="10000"
            value={babyGoods}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10)
              setBabyGoods(val)
              save(deliveryCost, val)
            }}
            style={{ width: '100%', accentColor: '#2b7055' }}
          />
          <small style={{ color: '#888' }}>ベビーカー、抱っこ紐、ベビーベッドなど</small>
        </div>

        <div style={{ borderTop: '1px dashed #ccc', margin: '1rem 0 0.5rem 0' }}></div>
        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#1976d2', fontWeight: 'bold', fontSize: '1.1rem' }}>
          <span>合計支出予測:</span>
          <span>{totalExpenses.toLocaleString()}円</span>
        </div>
      </div>

      <div style={{ background: net >= 0 ? '#e0f2e9' : '#ffebee', padding: '1.5rem', borderRadius: '12px', textAlign: 'center', marginBottom: '2rem' }}>
        <h3 style={{ margin: '0 0 0.5rem 0' }}>最終的な自己負担額（手出し）</h3>
        <div style={{ fontSize: '2rem', fontWeight: 'bold', color: net >= 0 ? '#2b7055' : '#c62828' }}>
          {net >= 0 ? `+${net.toLocaleString()}円（黒字）` : `${(net * -1).toLocaleString()}円`}
        </div>
        <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.9rem', color: '#666' }}>
          ※産休・育休中の手当や児童手当は別途支給されます。
        </p>
      </div>
    </div>
  )
}
