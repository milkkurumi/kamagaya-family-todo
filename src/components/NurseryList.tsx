import { useState } from 'react'
import { NURSERIES, mapUrl, searchUrl } from '../data/nurseries'
import type { Nursery, NurseryArea, NurseryType } from '../data/nurseries'
import type { CustomNurseryItem, Settings } from '../types'

interface NurseryListProps {
  settings: Settings
  onUpdateSettings: (newSettings: Settings) => void
}

const TYPES: (NurseryType | 'fav' | 'all')[] = ['all', 'fav', '市立保育園', '私立保育園', '幼稚園', '認定こども園', '小規模保育']
const TYPE_LABEL: Record<string, string> = { all: 'すべての種別', fav: '候補のみ' }

const AREAS: (NurseryArea | 'all')[] = ['all', '新鎌ケ谷', '鎌ケ谷', '初富・北初富', '鎌ケ谷大仏', '馬込沢・六実・粟野']
const AREA_LABEL: Record<string, string> = { all: '全エリア' }

const QUICK_TAGS = [
  '第一候補',
  '併願候補',
  '見学済',
  '駅チカ',
  '園庭あり',
  'おむつサブスク',
  'ベビーカー置場○',
  '延長保育○',
  '駐車場あり',
]

export function NurseryList({ settings, onUpdateSettings }: NurseryListProps) {
  const [typeFilter, setTypeFilter] = useState<(typeof TYPES)[number]>('all')
  const [areaFilter, setAreaFilter] = useState<(typeof AREAS)[number]>('all')
  const [query, setQuery] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState('')
  const [newType, setNewType] = useState('認可外・その他')
  const [newStation, setNewStation] = useState('')
  const [newNote, setNewNote] = useState('')

  const favorites = settings.nurseryFavorites || []
  const memos = settings.nurseryMemos || {}
  const tagsMap = settings.nurseryTags || {}
  const customNurseries = settings.customNurseries || []

  const allNurseries: (Nursery & { custom?: boolean })[] = [
    ...customNurseries.map((c) => ({
      id: c.id,
      name: c.name,
      type: (c.type as NurseryType) || '私立保育園',
      area: '新鎌ケ谷' as NurseryArea,
      station: c.station,
      note: c.note,
      url: c.url,
      custom: true,
    })),
    ...NURSERIES,
  ]

  const toggleFavorite = (id: string) => {
    const next = favorites.includes(id) ? favorites.filter((f) => f !== id) : [...favorites, id]
    onUpdateSettings({ ...settings, nurseryFavorites: next })
  }

  const updateMemo = (id: string, text: string) => {
    onUpdateSettings({ ...settings, nurseryMemos: { ...memos, [id]: text } })
  }

  const toggleTag = (id: string, tag: string) => {
    const cur = tagsMap[id] || []
    const next = cur.includes(tag) ? cur.filter((t) => t !== tag) : [...cur, tag]
    const nextFavorites = !favorites.includes(id) && next.length > 0 ? [...favorites, id] : favorites
    onUpdateSettings({
      ...settings,
      nurseryFavorites: nextFavorites,
      nurseryTags: { ...tagsMap, [id]: next },
    })
  }

  const addCustomNursery = () => {
    if (!newName.trim()) return
    const item: CustomNurseryItem = {
      id: `custom-nursery-${Date.now()}`,
      name: newName.trim(),
      type: newType,
      station: newStation.trim() || undefined,
      note: newNote.trim() || undefined,
    }
    onUpdateSettings({
      ...settings,
      customNurseries: [item, ...customNurseries],
      nurseryFavorites: [item.id, ...favorites],
    })
    setNewName('')
    setNewStation('')
    setNewNote('')
    setShowAdd(false)
  }

  const deleteCustomNursery = (id: string) => {
    onUpdateSettings({
      ...settings,
      customNurseries: customNurseries.filter((c) => c.id !== id),
      nurseryFavorites: favorites.filter((f) => f !== id),
    })
  }

  const shareLine = () => {
    let text = '【鎌ケ谷市 保活・候補の園リスト】\n'
    favorites.forEach((id) => {
      const n = allNurseries.find((x) => x.id === id)
      if (n) {
        const t = tagsMap[id]?.length ? ` [${tagsMap[id].join(' / ')}]` : ''
        text += `\n■ ${n.name}（${n.type}${n.station ? `・${n.station}` : ''}）${t}\n`
        if (memos[id]) text += `${memos[id]}\n`
      }
    })
    window.open(`https://line.me/R/msg/text/?${encodeURIComponent(text)}`, '_blank')
  }

  const insertChecklist = (id: string) => {
    const current = memos[id] || ''
    const checklist = `${current ? '\n' : ''}[見学確認項目]\n・おむつサブスク／持ち帰り有無：\n・連絡帳（アプリ／紙）：\n・布団の持ち帰り頻度：\n・ベビーカー置場・車送迎の可否：\n・延長保育の条件・捕食の有無：\n・園庭・外遊びの頻度：`
    updateMemo(id, current + checklist)
  }

  const list = allNurseries.filter((n) => {
    if (typeFilter === 'fav' && !favorites.includes(n.id)) return false
    if (typeFilter !== 'all' && typeFilter !== 'fav' && n.type !== typeFilter) return false
    if (areaFilter !== 'all' && !n.custom && n.area !== areaFilter) return false
    if (query.trim()) {
      const q = query.trim().toLowerCase()
      const hay = `${n.name} ${n.type} ${n.station || ''} ${n.address || ''} ${n.note || ''} ${(tagsMap[n.id] || []).join(' ')} ${memos[n.id] || ''}`.toLowerCase()
      if (!hay.includes(q)) return false
    }
    return true
  })

  return (
    <section className="section-block">
      <div className="section-header-row">
        <div>
          <h2>鎌ケ谷市の保育施設・幼稚園（全{allNurseries.length}園）</h2>
          <p className="section-desc">
            駅エリアや施設種別で絞り込み、見学メモや比較タグを夫婦で共有できます。最新の空き状況や入所選考基準は
            <a href="https://www.city.kamagaya.chiba.jp/smph/kosodate/hoikuen/index.html" target="_blank" rel="noreferrer">
              鎌ケ谷市公式ホームページ
            </a>
            をご確認ください。
          </p>
        </div>
        <div className="section-actions">
          <button type="button" onClick={() => setShowAdd(!showAdd)}>
            {showAdd ? '閉じる' : '+ 園を追加'}
          </button>
          <a
            href="https://www.google.com/maps/search/鎌ケ谷市+保育園+OR+幼稚園"
            target="_blank"
            rel="noreferrer"
            className="btn-link-outline"
          >
            Googleマップで周辺検索 ↗
          </a>
        </div>
      </div>

      {showAdd && (
        <div className="panel-box">
          <div className="subhead">候補の園・施設を追加（認可外・企業主導型・近隣市の園など）</div>
          <div className="form-grid">
            <label>
              施設名（必須）
              <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="例：〇〇保育園" />
            </label>
            <label>
              種別
              <input value={newType} onChange={(e) => setNewType(e.target.value)} placeholder="例：認可外・企業主導型" />
            </label>
            <label>
              最寄り駅・徒歩分数
              <input value={newStation} onChange={(e) => setNewStation(e.target.value)} placeholder="例：新鎌ケ谷駅 徒歩5分" />
            </label>
            <label>
              補足メモ
              <input value={newNote} onChange={(e) => setNewNote(e.target.value)} placeholder="例：7:00〜20:00 開園" />
            </label>
          </div>
          <div className="actions">
            <button type="button" className="primary" onClick={addCustomNursery} disabled={!newName.trim()}>
              追加して候補に入れる
            </button>
          </div>
        </div>
      )}

      <div className="filter-stack">
        <div className="search-row">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="園名・駅名・住所・特徴（一時預かり、病児保育など）で検索"
          />
          {favorites.length > 0 && (
            <button type="button" className="btn-line" onClick={shareLine}>
              候補リスト（{favorites.length}園）をLINEで送る
            </button>
          )}
        </div>

        <div className="filter-group">
          <span className="filter-label">種別</span>
          <div className="chip-scroll">
            {TYPES.map((t) => (
              <button
                key={t}
                type="button"
                className={`chip ${typeFilter === t ? 'on' : ''}`}
                onClick={() => setTypeFilter(t)}
              >
                {TYPE_LABEL[t] ?? t}
                {t === 'fav' ? `（${favorites.length}）` : ''}
              </button>
            ))}
          </div>
        </div>

        <div className="filter-group">
          <span className="filter-label">駅・エリア</span>
          <div className="chip-scroll">
            {AREAS.map((a) => (
              <button
                key={a}
                type="button"
                className={`chip ${areaFilter === a ? 'on' : ''}`}
                onClick={() => setAreaFilter(a)}
              >
                {AREA_LABEL[a] ?? a}
              </button>
            ))}
          </div>
        </div>
      </div>

      {list.length === 0 && (
        <p className="empty">条件に一致する施設がありません。フィルタや検索語句を変更してください。</p>
      )}

      <div className="nursery-list">
        {list.map((n) => {
          const fav = favorites.includes(n.id)
          const selectedTags = tagsMap[n.id] || []
          const expanded = fav || Boolean(memos[n.id]) || selectedTags.length > 0
          return (
            <article key={n.id} className={`nursery-card ${fav ? 'is-fav' : ''}`}>
              <div className="nursery-top">
                <div className="nursery-main">
                  <div className="badges">
                    <span className="badge type-badge">{n.type}</span>
                    {n.area && <span className="badge area-badge">{n.area}エリア</span>}
                    {n.age && <span className="badge age-badge">対象：{n.age}</span>}
                  </div>
                  <h3>{n.name}</h3>
                  <div className="nursery-meta">
                    {n.station && <span>最寄：{n.station}</span>}
                    {n.address && <span>所在地：{n.address}</span>}
                  </div>
                  {n.note && <p className="nursery-note">{n.note}</p>}
                </div>

                <div className="nursery-actions">
                  <button
                    type="button"
                    className={`fav-btn ${fav ? 'on' : ''}`}
                    onClick={() => toggleFavorite(n.id)}
                  >
                    {fav ? '★ 候補済' : '☆ 候補に追加'}
                  </button>
                  <div className="link-pair">
                    <a href={n.url || searchUrl(n)} target="_blank" rel="noreferrer">
                      {n.url ? '公式案内 ↗' : 'Web検索 ↗'}
                    </a>
                    <a href={mapUrl(n.name)} target="_blank" rel="noreferrer">
                      地図 ↗
                    </a>
                    {n.custom && (
                      <button type="button" className="ghost danger small-btn" onClick={() => deleteCustomNursery(n.id)}>
                        削除
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="tag-bar">
                {QUICK_TAGS.map((tag) => {
                  const active = selectedTags.includes(tag)
                  return (
                    <button
                      key={tag}
                      type="button"
                      className={`tag-chip ${active ? 'on' : ''}`}
                      onClick={() => toggleTag(n.id, tag)}
                    >
                      {active ? '✓ ' : '+ '}
                      {tag}
                    </button>
                  )
                })}
              </div>

              {expanded && (
                <div className="nursery-memo-box">
                  <div className="memo-head">
                    <span>見学・比較メモ</span>
                    <button type="button" className="btn-inline" onClick={() => insertChecklist(n.id)}>
                      見学確認テンプレートを挿入
                    </button>
                  </div>
                  <textarea
                    value={memos[n.id] || ''}
                    onChange={(e) => updateMemo(n.id, e.target.value)}
                    placeholder="園の雰囲気、先生の対応、父母会・行事の頻度、通勤動線などを記録..."
                    rows={4}
                  />
                </div>
              )}
            </article>
          )
        })}
      </div>
    </section>
  )
}
