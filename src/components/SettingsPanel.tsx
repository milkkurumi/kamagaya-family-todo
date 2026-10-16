import { useState } from 'react'
import type { Settings } from '../types'

interface Props {
  settings: Settings
  onSave: (s: Settings) => void
  onClose?: () => void
  onReset?: () => void
  initial?: boolean
}

type Stage = 'prep' | 'pregnancy' | 'born'

export function SettingsPanel({ settings, onSave, onClose, onReset, initial }: Props) {
  const [s, setS] = useState<Settings>(settings)
  const [stage, setStage] = useState<Stage>(
    settings.birthDate ? 'born' : settings.dueDate ? 'pregnancy' : initial ? 'pregnancy' : 'prep',
  )

  const set = (patch: Partial<Settings>) => setS({ ...s, ...patch })

  const submit = () => {
    const next = { ...s }
    if (stage === 'prep') {
      next.dueDate = undefined
      next.birthDate = undefined
    }
    if (stage === 'pregnancy') next.birthDate = undefined
    onSave(next)
  }

  return (
    <section className="settings">
      <div className="settings-head">
        <h2>{initial ? '基本情報の設定' : '設定・連絡先の編集'}</h2>
        <p className="hint">入力内容はこの端末のブラウザ内にのみ保存されます。</p>
      </div>

      <div className="field-block">
        <span className="field-title">現在のステージ</span>
        <div className="stage">
          {(
            [
              ['prep', '妊活・準備中'],
              ['pregnancy', '妊娠中'],
              ['born', '出産後・育児中'],
            ] as const
          ).map(([k, label]) => (
            <button key={k} type="button" className={stage === k ? 'on' : ''} onClick={() => setStage(k)}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="form-grid">
        {stage !== 'prep' && (
          <label>
            出産予定日
            <input
              type="date"
              value={s.dueDate ?? ''}
              onChange={(e) => set({ dueDate: e.target.value || undefined })}
            />
          </label>
        )}
        {stage === 'born' && (
          <label>
            お子さまの生年月日
            <input
              type="date"
              value={s.birthDate ?? ''}
              onChange={(e) => set({ birthDate: e.target.value || undefined })}
            />
          </label>
        )}
        {stage === 'born' && (
          <label>
            お子さまのお名前・呼び名（任意）
            <input
              type="text"
              value={s.childName ?? ''}
              placeholder="例：はるき"
              onChange={(e) => set({ childName: e.target.value || undefined })}
            />
          </label>
        )}
      </div>

      <label className="check">
        <input type="checkbox" checked={s.firstChild} onChange={(e) => set({ firstChild: e.target.checked })} />
        第1子です（初めての妊娠・出産向けの教室などを表示）
      </label>

      <details open={!initial}>
        <summary>かかりつけ産院・陣痛タクシーの電話番号（任意）</summary>
        <p className="hint">登録すると、上部「緊急・相談窓口」バーからワンタップで発信できます。</p>
        <div className="form-grid">
          <label>
            産院の電話番号
            <input
              type="tel"
              value={s.emergencyContacts?.hospital ?? ''}
              placeholder="047-000-0000"
              onChange={(e) =>
                set({ emergencyContacts: { ...s.emergencyContacts, hospital: e.target.value || undefined } })
              }
            />
          </label>
          <label>
            陣痛タクシーの電話番号
            <input
              type="tel"
              value={s.emergencyContacts?.taxi ?? ''}
              placeholder="047-000-0000"
              onChange={(e) =>
                set({ emergencyContacts: { ...s.emergencyContacts, taxi: e.target.value || undefined } })
              }
            />
          </label>
        </div>
      </details>

      <details open={!initial}>
        <summary>夫婦のGoogleカレンダー招待設定（任意）</summary>
        <p className="hint">
          入力すると、各タスクの「Googleカレンダー登録」を押した際に2人をゲストに含めた状態で予定作成画面が開きます。
        </p>
        <div className="form-grid">
          <label>
            パパのGoogleアカウント
            <input
              type="email"
              value={s.papaEmail ?? ''}
              placeholder="papa@gmail.com"
              onChange={(e) => set({ papaEmail: e.target.value || undefined })}
            />
          </label>
          <label>
            ママのGoogleアカウント
            <input
              type="email"
              value={s.mamaEmail ?? ''}
              placeholder="mama@gmail.com"
              onChange={(e) => set({ mamaEmail: e.target.value || undefined })}
            />
          </label>
        </div>
      </details>

      <div className="actions">
        <button
          type="button"
          className="primary"
          onClick={submit}
          disabled={(stage === 'pregnancy' && !s.dueDate) || (stage === 'born' && !s.birthDate)}
        >
          {initial ? '設定を保存してはじめる' : '設定を保存'}
        </button>
        {onClose && (
          <button type="button" onClick={onClose}>
            キャンセル
          </button>
        )}
        {onReset && (
          <button type="button" className="ghost danger" onClick={onReset}>
            すべてのデータを初期化
          </button>
        )}
      </div>
    </section>
  )
}
