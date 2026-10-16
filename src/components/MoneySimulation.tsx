import { useState } from 'react'
import type { Settings } from '../types'
import type { TaskView } from '../lib/view'

interface Props {
  settings: Settings
  onUpdateSettings: (newSettings: Settings) => void
  views: TaskView[]
  onJump: (taskId: string) => void
}

const STATUS_BADGE = {
  todo: { label: '未手続', cls: 'todo' },
  scheduled: { label: '予定済', cls: 'scheduled' },
  done: { label: '手続済', cls: 'done' },
  skip: { label: '対象外', cls: 'skip' },
} as const

export function MoneySimulation({ settings, onUpdateSettings, views, onJump }: Props) {
  const [deliveryCost, setDeliveryCost] = useState(settings.budgetSettings?.deliveryCost ?? 540000)
  const [babyGoods, setBabyGoods] = useState(settings.budgetSettings?.babyGoods ?? 150000)
  const [checkupPocket, setCheckupPocket] = useState(settings.budgetSettings?.checkupPocket ?? 40000)
  const [taxRate, setTaxRate] = useState(settings.budgetSettings?.taxRate ?? 20)

  const save = (next: Partial<NonNullable<Settings['budgetSettings']>>) => {
    const merged = {
      deliveryCost,
      babyGoods,
      checkupPocket,
      taxRate,
      ...next,
    }
    onUpdateSettings({ ...settings, budgetSettings: merged })
  }

  const lumpSum = 500000 // 出産育児一時金
  const supportGrant = 100000 // 妊婦のための支援給付金（妊娠時5万＋出生後5万）
  const totalCashIncome = lumpSum + supportGrant
  const totalExpenses = deliveryCost + babyGoods + checkupPocket

  // 医療費控除の対象となる年間自己負担医療費（分娩費のうち一時金超過分 ＋ 妊婦健診等の窓口自己負担・通院交通費）
  const outOfPocketMedical = Math.max(0, deliveryCost - lumpSum) + checkupPocket
  const deductibleMedical = Math.max(0, outOfPocketMedical - 100000)
  const estimatedTaxRefund = Math.round((deductibleMedical * taxRate) / 100)

  const net = totalCashIncome + estimatedTaxRefund - totalExpenses

  const trackerRows = [
    {
      taskId: 'preg-benefit1',
      title: '妊婦のための支援給付（妊娠届出・面談時）',
      timing: '妊娠届出時',
      amountText: '50,000円',
      subText: '健康増進課窓口での面談後に申請',
    },
    {
      taskId: 'preg-direct-pay',
      title: '出産育児一時金（直接支払制度）',
      timing: '妊娠後期〜入院前',
      amountText: '500,000円',
      subText: '産院へ合意書を提出（退院時の窓口支払から控除）',
    },
    {
      taskId: 'pp-benefit2',
      title: '妊婦のための支援給付（出産後・新生児訪問時）',
      timing: '生後1〜4か月頃',
      amountText: '50,000円 / 1児',
      subText: '助産師・保健師の新生児訪問面談後に申請',
    },
    {
      taskId: 'pp-allowance',
      title: '児童手当の認定請求',
      timing: '出生翌日から15日以内',
      amountText: '月15,000円（第3子以降30,000円）',
      subText: '0〜2歳：月1.5万円 ／ 3歳〜高校生：月1万円（18歳までの累計 約234万円）',
    },
    {
      taskId: 'pp-medical',
      title: '鎌ケ谷市 子ども医療費助成受給券',
      timing: '出生後すぐ',
      amountText: '通院・入院 1回300円（調剤無料）',
      subText: '0歳〜高校3年生相当まで。同一医療機関月6回目以降は無料・非課税世帯は0円',
    },
    {
      taskId: 'pp-ikukyu-benefit',
      title: '出産手当金・育児休業給付金・出生後休業支援給付',
      timing: '産休・育休開始時',
      amountText: '賃金の約67%〜実質100%相当',
      subText: '社会保険料免除＋両親ともに14日以上の育休取得で28日間は給付率80%（手取り約10割）',
    },
  ]

  return (
    <section className="section-block">
      <h2>お金・助成金トラッカーと収支試算</h2>
      <p className="section-desc">
        鎌ケ谷市および国の給付・助成制度の申請状況を一元管理できます。各項目を選択すると、該当する手続きタスクへ移動して予定日を登録できます。
      </p>

      <div className="panel-box">
        <div className="subhead">1. もらい損ね防止トラッカー（全6項目）</div>
        <div className="tracker-list">
          {trackerRows.map((r) => {
            const v = views.find((x) => x.task.id === r.taskId)
            const st = v ? STATUS_BADGE[v.state.status] : STATUS_BADGE.todo
            return (
              <button
                key={r.taskId}
                type="button"
                className="tracker-row"
                onClick={() => v && onJump(r.taskId)}
                disabled={!v}
              >
                <div className="tracker-main">
                  <div className="tracker-title-row">
                    <span className={`st-pill ${st.cls}`}>{st.label}</span>
                    <span className="tracker-timing">{r.timing}</span>
                    <strong className="tracker-title">{r.title}</strong>
                  </div>
                  <span className="tracker-sub">{r.subText}</span>
                </div>
                <div className="tracker-right">
                  <span className="tracker-amount">{r.amountText}</span>
                  <span className="tracker-arrow">タスクを開く ›</span>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      <div className="panel-box">
        <div className="subhead">2. 出産前後のキャッシュフロー・医療費控除の試算</div>
        <div className="sim-grid">
          <div className="sim-col">
            <h4>支出の見込み（スライダーで調整）</h4>

            <div className="slider-field">
              <div className="slider-head">
                <span>分娩・入院費用（総額）</span>
                <strong>{deliveryCost.toLocaleString()}円</strong>
              </div>
              <input
                type="range"
                min="400000"
                max="950000"
                step="10000"
                value={deliveryCost}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10)
                  setDeliveryCost(val)
                  save({ deliveryCost: val })
                }}
              />
              <span className="field-note">千葉県内の平均は約53〜58万円（無痛分娩・個室利用時は＋10〜20万円が目安）</span>
            </div>

            <div className="slider-field">
              <div className="slider-head">
                <span>妊婦健診の窓口自己負担・通院交通費</span>
                <strong>{checkupPocket.toLocaleString()}円</strong>
              </div>
              <input
                type="range"
                min="0"
                max="150000"
                step="5000"
                value={checkupPocket}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10)
                  setCheckupPocket(val)
                  save({ checkupPocket: val })
                }}
              />
              <span className="field-note">鎌ケ谷市の受診票（14回分）を差し引いた後の実費・追加検査費・通院交通費</span>
            </div>

            <div className="slider-field">
              <div className="slider-head">
                <span>ベビー用品・出産準備費用</span>
                <strong>{babyGoods.toLocaleString()}円</strong>
              </div>
              <input
                type="range"
                min="30000"
                max="350000"
                step="10000"
                value={babyGoods}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10)
                  setBabyGoods(val)
                  save({ babyGoods: val })
                }}
              />
              <span className="field-note">チャイルドシート・ベビーカー・抱っこ紐・肌着・衛生用品など</span>
            </div>

            <div className="slider-field">
              <div className="slider-head">
                <span>医療費控除の試算用 税率（所得税＋住民税10%）</span>
                <strong>{taxRate}%</strong>
              </div>
              <select
                value={taxRate}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10)
                  setTaxRate(val)
                  save({ taxRate: val })
                }}
              >
                <option value={15}>15%（課税所得 195万円以下）</option>
                <option value={20}>20%（課税所得 195万〜330万円）</option>
                <option value={30}>30%（課税所得 330万〜695万円）</option>
                <option value={33}>33%（課税所得 695万〜900万円）</option>
                <option value={43}>43%（課税所得 900万〜1,800万円）</option>
              </select>
              <span className="field-note">世帯の中で所得が高い方がまとめて確定申告すると還付額が大きくなります</span>
            </div>
          </div>

          <div className="sim-col summary-col">
            <h4>収支サマリー（一時金＋支援給付金＋医療費控除）</h4>
            <dl className="calc-table">
              <div>
                <dt>出産育児一時金</dt>
                <dd>+{lumpSum.toLocaleString()}円</dd>
              </div>
              <div>
                <dt>妊婦のための支援給付金（計2回）</dt>
                <dd>+{supportGrant.toLocaleString()}円</dd>
              </div>
              <div>
                <dt>医療費控除による還付・減税目安</dt>
                <dd>+{estimatedTaxRefund.toLocaleString()}円</dd>
              </div>
              <div className="divider">
                <dt>給付・還付 合計</dt>
                <dd>+{(totalCashIncome + estimatedTaxRefund).toLocaleString()}円</dd>
              </div>
              <div>
                <dt>分娩・健診・準備費用 合計</dt>
                <dd>-{totalExpenses.toLocaleString()}円</dd>
              </div>
            </dl>

            <div className={`net-box ${net >= 0 ? 'plus' : 'minus'}`}>
              <span className="net-label">最終的な実質収支（手出し目安）</span>
              <strong className="net-val">
                {net >= 0 ? `+${net.toLocaleString()}円（黒字）` : `▲${Math.abs(net).toLocaleString()}円（自己負担）`}
              </strong>
              <span className="net-sub">
                対象医療費の実費合計：{outOfPocketMedical.toLocaleString()}円（10万円超過分：{deductibleMedical.toLocaleString()}円）
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="panel-box">
        <div className="subhead">3. 鎌ケ谷市の継続的な子育て支援制度まとめ</div>
        <div className="benefit-cards">
          <div className="benefit-card">
            <h4>児童手当（0歳〜18歳年度末）</h4>
            <p>
              0〜3歳未満は月額15,000円、3歳〜高校生年代は月額10,000円（第3子以降は全期間で月額30,000円）。所得制限は撤廃され、偶数月に年6回支給されます。
            </p>
          </div>
          <div className="benefit-card">
            <h4>子ども医療費助成（高校3年生相当まで）</h4>
            <p>
              0歳から18歳年度末まで、保険診療の通院1回300円・入院1日300円（住民税所得割非課税世帯は無料）。同一医療機関で月6回目以降および調剤薬局は自己負担0円です。
            </p>
          </div>
          <div className="benefit-card">
            <h4>保育料の軽減・無償化</h4>
            <p>
              3〜5歳児クラスの保育料は無償。0〜2歳児クラスも鎌ケ谷市では生計同一の18歳以下のきょうだいから数えて「第2子は半額」「第3子以降は無償」となります。
            </p>
          </div>
          <div className="benefit-card">
            <h4>小・中学校の学校給食費無償化</h4>
            <p>
              市立小学校（全学年）に加え、鎌ケ谷市独自施策として市立中学校1年生および第3子以降の中学校2・3年生の学校給食費が無償化されています。
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
