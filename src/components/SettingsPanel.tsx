import { useRef, useState } from 'react'
import type { AppData, Settings } from '../types'
import { formatPhoneNumber } from '../lib/phone'
import { jp, parseDate } from '../lib/date'
import { exportBackupJson, parseBackupJson } from '../lib/storage'

interface Props {
  settings: Settings
  appData?: AppData
  onSave: (s: Settings) => void
  onImportData?: (d: AppData) => void
  onClose?: () => void
  onReset?: () => void
  onToast?: (msg: string) => void
  initial?: boolean
}

export const APP_PUBLIC_URL = 'https://kamagaya-family-todo.vercel.app/'
export const APP_SHARE_TEXT = '鎌ケ谷市の妊娠・出産・保活の手続きを夫婦で分担できる『かまがや親子カレンダー』'
export const LINE_SHARE_URL = `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(APP_PUBLIC_URL)}&text=${encodeURIComponent(APP_SHARE_TEXT)}`
export const X_SHARE_URL = `https://twitter.com/intent/tweet?text=${encodeURIComponent(APP_SHARE_TEXT)}&url=${encodeURIComponent(APP_PUBLIC_URL)}`

export function FriendShareSection({ onToast }: { onToast?: (msg: string) => void }) {
  const copyAppUrl = async () => {
    try {
      await navigator.clipboard.writeText(APP_PUBLIC_URL)
      onToast?.('URLをコピーしました')
    } catch {
      prompt('このアプリのURLをコピーしてください', APP_PUBLIC_URL)
    }
  }

  return (
    <div className="share-friend-box">
      <div className="subhead">このアプリを友達に教える</div>
      <p className="hint">
        鎌ケ谷市で出産・子育てを予定しているご友人やご家族へ、このアプリを紹介できます。パートナーへのデータ引き継ぎ用の「共有リンク」とは異なり、入力した予定や個人データは一切含まれない素のアプリURLのみを共有します。
      </p>
      <div className="actions share-friend-actions">
        <a
          href={LINE_SHARE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-link-outline btn-line"
        >
          LINEで送る
        </a>
        <a
          href={X_SHARE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-link-outline"
        >
          Xでポストする
        </a>
        <button type="button" onClick={copyAppUrl}>
          URLをコピーする
        </button>
      </div>
    </div>
  )
}

type Stage = 'prep' | 'pregnancy' | 'born'

export function SettingsPanel({
  settings,
  appData,
  onSave,
  onImportData,
  onClose,
  onReset,
  onToast,
  initial,
}: Props) {
  const [s, setS] = useState<Settings>(settings)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dueRef = useRef<HTMLInputElement>(null)
  const birthRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState('')
  const [stage, setStage] = useState<Stage>(
    settings.birthDate ? 'born' : settings.dueDate ? 'pregnancy' : initial ? 'pregnancy' : 'prep',
  )

  const set = (patch: Partial<Settings>) => setS({ ...s, ...patch })

  const submit = () => {
    if (stage === 'pregnancy' && !s.dueDate) {
      setError('出産予定日がまだ入力されていません。日付欄をタップして、カレンダーで日付を選んでから「OK」を押してください。')
      const el = dueRef.current
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      try {
        el?.focus()
        el?.showPicker?.()
      } catch {
        /* showPicker非対応環境ではスクロールのみ */
      }
      return
    }
    if (stage === 'born' && !s.birthDate) {
      setError('お子さまの生年月日がまだ入力されていません。日付欄をタップして、カレンダーで日付を選んでから「OK」を押してください。')
      const el = birthRef.current
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      try {
        el?.focus()
        el?.showPicker?.()
      } catch {
        /* showPicker非対応環境ではスクロールのみ */
      }
      return
    }
    setError('')
    const next: Settings = {
      ...s,
      emergencyContacts: s.emergencyContacts
        ? {
            hospital: s.emergencyContacts.hospital ? formatPhoneNumber(s.emergencyContacts.hospital) : undefined,
            taxi: s.emergencyContacts.taxi ? formatPhoneNumber(s.emergencyContacts.taxi) : undefined,
          }
        : undefined,
    }
    if (stage === 'prep') {
      next.dueDate = undefined
      next.birthDate = undefined
    }
    if (stage === 'pregnancy') next.birthDate = undefined
    onSave(next)
  }

  const handleExportBackup = () => {
    const currentData: AppData = {
      settings: { ...s, configured: true },
      tasks: appData?.tasks ?? {},
    }
    const filename = exportBackupJson(currentData)
    onToast?.(`バックアップ（${filename}）を保存しました`)
  }

  const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const raw = await file.text()
      const parsed = parseBackupJson(raw)
      if (!parsed) {
        onToast?.('バックアップファイルの形式が正しくありません。既存データは変更されていません')
        return
      }
      if (confirm('現在のデータは上書きされます。よいですか？')) {
        setS(parsed.settings)
        onImportData?.(parsed)
      }
    } catch {
      onToast?.('ファイルの読み込みに失敗しました。既存データは変更されていません')
    }
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
            出産予定日{stage === 'pregnancy' ? '（必須）' : '（任意）'}
            <input
              ref={dueRef}
              type="date"
              value={s.dueDate ?? ''}
              onChange={(e) => {
                set({ dueDate: e.target.value || undefined })
                if (e.target.value) setError('')
              }}
            />
            <span className="field-note">
              タップしてカレンダーから選べます。この日を基準に手続きの推奨時期を自動計算します。
            </span>
            {s.dueDate && parseDate(s.dueDate) && (
              <span className="field-note">✓ 選択中：{jp(parseDate(s.dueDate)!, true)}</span>
            )}
          </label>
        )}
        {stage === 'born' && (
          <label>
            お子さまの生年月日（必須）
            <input
              ref={birthRef}
              type="date"
              value={s.birthDate ?? ''}
              onChange={(e) => {
                set({ birthDate: e.target.value || undefined })
                if (e.target.value) setError('')
              }}
            />
            <span className="field-note">
              タップしてカレンダーから選べます。生年月日を基準に健診・予防接種・保活の時期を自動計算します。
            </span>
            {s.birthDate && parseDate(s.birthDate) && (
              <span className="field-note">✓ 選択中：{jp(parseDate(s.birthDate)!, true)}</span>
            )}
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
        <p className="hint">
          登録すると、上部「緊急・相談窓口」バーからワンタップで発信できます（ハイフンなしで入力しても自動でハイフンが入ります）。
        </p>
        <div className="form-grid">
          <label>
            産院の電話番号
            <input
              type="tel"
              value={s.emergencyContacts?.hospital ?? ''}
              placeholder="例：047-445-0000（ハイフンなし可）"
              onChange={(e) => {
                const formatted = formatPhoneNumber(e.target.value)
                set({ emergencyContacts: { ...s.emergencyContacts, hospital: formatted || undefined } })
              }}
              onBlur={(e) => {
                const formatted = formatPhoneNumber(e.target.value)
                set({ emergencyContacts: { ...s.emergencyContacts, hospital: formatted || undefined } })
              }}
            />
          </label>
          <label>
            陣痛タクシーの電話番号
            <input
              type="tel"
              value={s.emergencyContacts?.taxi ?? ''}
              placeholder="例：047-445-0000（ハイフンなし可）"
              onChange={(e) => {
                const formatted = formatPhoneNumber(e.target.value)
                set({ emergencyContacts: { ...s.emergencyContacts, taxi: formatted || undefined } })
              }}
              onBlur={(e) => {
                const formatted = formatPhoneNumber(e.target.value)
                set({ emergencyContacts: { ...s.emergencyContacts, taxi: formatted || undefined } })
              }}
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

      {stage === 'pregnancy' && !s.dueDate && (
        <p className="hint warn">※「妊娠中」ステージでは、出産予定日を入力すると保存ボタンが押せるようになります。</p>
      )}
      {stage === 'born' && !s.birthDate && (
        <p className="hint warn">※「出産後・育児中」ステージでは、お子さまの生年月日を入力すると保存ボタンが押せるようになります。</p>
      )}
      <details open={!initial}>
        <summary>データのバックアップ</summary>
        <p className="hint">
          機種変更やブラウザのデータ消去に備えて、現在の進捗・予定・設定をJSONファイルとして保存・復元できます。
        </p>
        <div className="actions" style={{ marginTop: '0.6rem' }}>
          <button type="button" onClick={handleExportBackup}>
            バックアップを保存
          </button>
          <button type="button" onClick={() => fileInputRef.current?.click()}>
            バックアップから復元
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            style={{ display: 'none' }}
            onChange={handleImportBackup}
          />
        </div>
      </details>

      {error && (
        <p className="hint warn" role="alert">
          ※{error}
        </p>
      )}
      <div className="actions">
        <button type="button" className="primary" onClick={submit}>
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

      {!initial && <FriendShareSection onToast={onToast} />}
    </section>
  )
}
