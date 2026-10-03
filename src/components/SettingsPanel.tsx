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
  const [stage, setStage] = useState<Stage>(settings.birthDate ? 'born' : settings.dueDate ? 'pregnancy' : initial ? 'pregnancy' : 'prep')

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
      <h2>{initial ? 'はじめに教えてください' : '設定'}</h2>
      <div className="stage">
        {(
          [
            ['prep', '🌱 妊活中'],
            ['pregnancy', '🤰 妊娠中'],
            ['born', '👶 出産済み'],
          ] as const
        ).map(([k, label]) => (
          <button key={k} className={stage === k ? 'on' : ''} onClick={() => setStage(k)}>
            {label}
          </button>
        ))}
      </div>

      {stage !== 'prep' && (
        <label>
          出産予定日
          <input type="date" value={s.dueDate ?? ''} onChange={(e) => set({ dueDate: e.target.value || undefined })} />
        </label>
      )}
      {stage === 'born' && (
        <label>
          お子さまの生年月日
          <input type="date" value={s.birthDate ?? ''} onChange={(e) => set({ birthDate: e.target.value || undefined })} />
        </label>
      )}
      <label className="check">
        <input type="checkbox" checked={s.firstChild} onChange={(e) => set({ firstChild: e.target.checked })} />
        第1子です（初めての妊娠・出産向けの教室などを表示）
      </label>

      <details open={!initial}>
        <summary>夫婦のカレンダー連携（任意）</summary>
        <p className="hint">
          入力すると「Googleカレンダーに追加」時に2人をゲスト招待した状態で予定作成画面が開き、夫婦両方のカレンダーに入ります。メールアドレスはこの端末のブラウザ内にのみ保存されます。
        </p>
        <label>
          パパのGoogleアカウント
          <input type="email" value={s.papaEmail ?? ''} placeholder="papa@gmail.com" onChange={(e) => set({ papaEmail: e.target.value || undefined })} />
        </label>
        <label>
          ママのGoogleアカウント
          <input type="email" value={s.mamaEmail ?? ''} placeholder="mama@gmail.com" onChange={(e) => set({ mamaEmail: e.target.value || undefined })} />
        </label>
      </details>

      <div className="actions">
        <button className="primary" onClick={submit} disabled={(stage === 'pregnancy' && !s.dueDate) || (stage === 'born' && !s.birthDate)}>
          {initial ? 'タスクを表示する' : '保存'}
        </button>
        {onClose && <button onClick={onClose}>閉じる</button>}
        {onReset && (
          <button className="ghost danger" onClick={onReset}>
            すべてのデータを削除
          </button>
        )}
      </div>
    </section>
  )
}
