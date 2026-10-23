import { useState } from 'react'
import { HOKATSU_GUIDE, NURSERIES, mapUrl, searchUrl } from '../data/nurseries'
import type { Nursery, NurseryArea, NurseryFeature, NurseryType } from '../data/nurseries'
import type { CustomNurseryItem, Settings } from '../types'
import { formatPhoneNumber } from '../lib/phone'
import { LAST_VERIFIED_AT } from '../lib/site'

interface NurseryListProps {
  settings: Settings
  onUpdateSettings: (newSettings: Settings) => void
}

const TYPES: (NurseryType | 'fav' | 'all')[] = [
  'all',
  'fav',
  '市立保育園',
  '私立保育園',
  '認定こども園',
  '小規模保育',
  '幼稚園',
  '企業主導型',
]
const TYPE_LABEL: Record<string, string> = { all: 'すべての種別', fav: '希望・候補園' }

const AREAS: (NurseryArea | 'all')[] = [
  'all',
  '新鎌ケ谷',
  '鎌ケ谷',
  '初富・北初富',
  '鎌ケ谷大仏',
  '馬込沢・六実・粟野',
]
const AREA_LABEL: Record<string, string> = { all: '全エリア' }

const FEATURES: NurseryFeature[] = [
  '産休明け(生後57日〜)',
  '駅徒歩5分以内',
  '20時まで開所',
  '一時預かり実施',
  '就学前まで一貫',
  '連携園進級あり',
]

const RANK_OPTIONS = [
  { value: '', label: '希望順位：未設定' },
  { value: '1', label: '第1希望' },
  { value: '2', label: '第2希望' },
  { value: '3', label: '第3希望' },
  { value: '4', label: '第4希望' },
  { value: '5', label: '第5希望' },
  { value: '6', label: '第6希望' },
  { value: 'sub', label: '併願・検討候補' },
]

const RANK_LABEL: Record<string, string> = {
  '1': '第1希望',
  '2': '第2希望',
  '3': '第3希望',
  '4': '第4希望',
  '5': '第5希望',
  '6': '第6希望',
  sub: '併願・候補',
}

const TOUR_CHECK_ITEMS = [
  'おむつサブスク・持帰なし',
  '連絡帳アプリ対応',
  'お昼寝布団の持帰なし',
  'ベビーカー置場あり',
  '車送迎・駐車場あり',
  '園庭・外遊び充実',
]

export function NurseryList({ settings, onUpdateSettings }: NurseryListProps) {
  const [typeFilter, setTypeFilter] = useState<(typeof TYPES)[number]>('all')
  const [areaFilter, setAreaFilter] = useState<(typeof AREAS)[number]>('all')
  const [featureFilters, setFeatureFilters] = useState<NurseryFeature[]>([])
  const [query, setQuery] = useState('')
  const [showGuide, setShowGuide] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [openDrawerIds, setOpenDrawerIds] = useState<Record<string, boolean>>({})

  const [newName, setNewName] = useState('')
  const [newType, setNewType] = useState('認可外・その他')
  const [newStation, setNewStation] = useState('')
  const [newTel, setNewTel] = useState('')
  const [newUrl, setNewUrl] = useState('')
  const [newNote, setNewNote] = useState('')

  const favorites = settings.nurseryFavorites || []
  const ranks = settings.nurseryRanks || {}
  const tourStatuses = settings.nurseryTourStatuses || {}
  const tourDates = settings.nurseryTourDates || {}
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
      tel: c.tel ? formatPhoneNumber(c.tel) : undefined,
      note: c.note,
      url: c.url,
      custom: true,
    })),
    ...NURSERIES,
  ]

  const isCandidate = (id: string) => favorites.includes(id) || Boolean(ranks[id])

  const candidateCount = allNurseries.filter((n) => isCandidate(n.id)).length

  const toggleFeatureFilter = (feat: NurseryFeature) => {
    setFeatureFilters((prev) => (prev.includes(feat) ? prev.filter((f) => f !== feat) : [...prev, feat]))
  }

  const updateRank = (id: string, rank: string) => {
    const nextRanks = { ...ranks }
    let nextFavs = [...favorites]
    if (!rank) {
      delete nextRanks[id]
      nextFavs = nextFavs.filter((f) => f !== id)
    } else {
      nextRanks[id] = rank
      if (!nextFavs.includes(id)) nextFavs.push(id)
    }
    onUpdateSettings({
      ...settings,
      nurseryRanks: nextRanks,
      nurseryFavorites: nextFavs,
    })
  }

  const toggleFavorite = (id: string) => {
    if (isCandidate(id)) {
      const nextRanks = { ...ranks }
      delete nextRanks[id]
      onUpdateSettings({
        ...settings,
        nurseryFavorites: favorites.filter((f) => f !== id),
        nurseryRanks: nextRanks,
      })
    } else {
      onUpdateSettings({
        ...settings,
        nurseryFavorites: [...favorites, id],
        nurseryRanks: { ...ranks, [id]: 'sub' },
      })
    }
  }

  const updateTourStatus = (id: string, status: 'none' | 'reserved' | 'visited') => {
    onUpdateSettings({
      ...settings,
      nurseryTourStatuses: { ...tourStatuses, [id]: status },
    })
  }

  const updateTourDate = (id: string, dateStr: string) => {
    onUpdateSettings({
      ...settings,
      nurseryTourDates: { ...tourDates, [id]: dateStr },
    })
  }

  const updateMemo = (id: string, text: string) => {
    onUpdateSettings({ ...settings, nurseryMemos: { ...memos, [id]: text } })
  }

  const toggleCheckItem = (id: string, item: string) => {
    const cur = tagsMap[id] || []
    const next = cur.includes(item) ? cur.filter((t) => t !== item) : [...cur, item]
    onUpdateSettings({
      ...settings,
      nurseryTags: { ...tagsMap, [id]: next },
    })
  }

  const toggleDrawer = (id: string) => {
    setOpenDrawerIds((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const addCustomNursery = () => {
    if (!newName.trim()) return
    const item: CustomNurseryItem = {
      id: `custom-nursery-${Date.now()}`,
      name: newName.trim(),
      type: newType,
      station: newStation.trim() || undefined,
      tel: newTel.trim() ? formatPhoneNumber(newTel.trim()) : undefined,
      url: newUrl.trim() || undefined,
      note: newNote.trim() || undefined,
    }
    onUpdateSettings({
      ...settings,
      customNurseries: [item, ...customNurseries],
      nurseryFavorites: [item.id, ...favorites],
      nurseryRanks: { ...ranks, [item.id]: 'sub' },
    })
    setNewName('')
    setNewStation('')
    setNewTel('')
    setNewUrl('')
    setNewNote('')
    setShowAdd(false)
  }

  const deleteCustomNursery = (id: string) => {
    const nextRanks = { ...ranks }
    delete nextRanks[id]
    onUpdateSettings({
      ...settings,
      customNurseries: customNurseries.filter((c) => c.id !== id),
      nurseryFavorites: favorites.filter((f) => f !== id),
      nurseryRanks: nextRanks,
    })
  }

  const rankOrder = (id: string) => {
    const r = ranks[id]
    if (!r) return favorites.includes(id) ? 50 : 99
    if (r === 'sub') return 40
    return Number(r) || 99
  }

  const shareLine = () => {
    const candidates = allNurseries
      .filter((n) => isCandidate(n.id))
      .sort((a, b) => rankOrder(a.id) - rankOrder(b.id))

    let text = '【鎌ケ谷市 保活・希望園リスト】\n'
    candidates.forEach((n) => {
      const rLabel = ranks[n.id] ? RANK_LABEL[ranks[n.id]] : '候補'
      const tStatus =
        tourStatuses[n.id] === 'visited'
          ? '見学済'
          : tourStatuses[n.id] === 'reserved'
            ? `見学予約済${tourDates[n.id] ? `(${tourDates[n.id]})` : ''}`
            : '未見学'
      const checks = tagsMap[n.id]?.length ? `\n  確認済：${tagsMap[n.id].join(' / ')}` : ''
      text += `\n■ [${rLabel}] ${n.name}（${n.type}・${tStatus}）`
      if (n.station) text += `\n  最寄：${n.station}`
      if (n.tel) text += ` / TEL：${n.tel}`
      text += checks
      if (memos[n.id]) text += `\n  メモ：${memos[n.id]}`
      text += '\n'
    })
    window.open(`https://line.me/R/msg/text/?${encodeURIComponent(text)}`, '_blank')
  }

  const filtered = allNurseries
    .filter((n) => {
      if (typeFilter === 'fav' && !isCandidate(n.id)) return false
      if (typeFilter !== 'all' && typeFilter !== 'fav' && n.type !== typeFilter) return false
      if (areaFilter !== 'all' && !n.custom && n.area !== areaFilter) return false
      if (featureFilters.length > 0) {
        const nFeats = n.features || []
        if (!featureFilters.every((f) => nFeats.includes(f))) return false
      }
      if (query.trim()) {
        const q = query.trim().toLowerCase()
        const hay = `${n.name} ${n.type} ${n.station || ''} ${n.address || ''} ${n.age || ''} ${n.hours || ''} ${n.note || ''} ${(n.features || []).join(' ')} ${(tagsMap[n.id] || []).join(' ')} ${memos[n.id] || ''}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
    .sort((a, b) => {
      if (typeFilter === 'fav') {
        return rankOrder(a.id) - rankOrder(b.id)
      }
      return 0
    })

  const hasNurseryFilter =
    typeFilter !== 'all' || areaFilter !== 'all' || featureFilters.length > 0 || Boolean(query.trim())

  const activeNurseryFilterLabels = [
    typeFilter !== 'all' ? `種別：${TYPE_LABEL[typeFilter] ?? typeFilter}` : '',
    areaFilter !== 'all' ? `エリア：${areaFilter}` : '',
    featureFilters.length > 0 ? `条件：${featureFilters.join('・')}` : '',
    query.trim() ? `検索：「${query.trim()}」` : '',
  ].filter(Boolean)

  const clearNurseryFilters = () => {
    setTypeFilter('all')
    setAreaFilter('all')
    setFeatureFilters([])
    setQuery('')
  }

  return (
    <section className="section-block">
      <div className="section-header-row">
        <div>
          <h2>鎌ケ谷市の保育施設・幼稚園（全{allNurseries.length}施設）</h2>
          <p className="section-desc">
            市立・私立認可園から小規模保育、認定こども園、企業主導型（地域枠）まで網羅。各園の公式HP・市紹介ページの確認や、第1〜第6希望の順位づけ・見学管理がここひとつで完結します。
          </p>
          <p className="hint">
            ※掲載している施設情報は{LAST_VERIFIED_AT}時点の確認内容です。受入枠や開所時間などの最新情報は、各園および鎌ケ谷市の公式情報でご確認ください。
          </p>
        </div>
        <div className="section-actions">
          <button
            type="button"
            className={showGuide ? 'primary' : ''}
            onClick={() => setShowGuide(!showGuide)}
          >
            {showGuide ? '保活ガイドを閉じる' : '鎌ケ谷市の入園申込日程・空き状況 ▾'}
          </button>
          <button type="button" onClick={() => setShowAdd(!showAdd)}>
            {showAdd ? '閉じる' : '+ 園を追加'}
          </button>
        </div>
      </div>

      {/* 鎌ケ谷市の保活スケジュール＆公式リンク集 */}
      {showGuide && (
        <div className="panel-box hokatsu-guide-box">
          <div className="guide-head">
            <div>
              <div className="subhead">鎌ケ谷市 令和9年4月入園申込スケジュール・窓口</div>
              <p className="hint">
                窓口：{HOKATSU_GUIDE.department} ／ 直通電話：
                <a href={`tel:${HOKATSU_GUIDE.tel}`} className="tel-inline">
                  {HOKATSU_GUIDE.tel}
                </a>
                （{HOKATSU_GUIDE.hoursNote}）
              </p>
            </div>
          </div>

          <div className="schedule-table">
            {HOKATSU_GUIDE.reiwa9Schedule.map((row) => (
              <div key={row.label} className="schedule-row">
                <div className="schedule-label">{row.label}</div>
                <div className="schedule-main">
                  <strong>{row.date}</strong>
                  <span>{row.note}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="guide-point-box">
            <strong>保育必要量の区分（標準時間・短時間）と見学のポイント</strong>
            <p>
              月120時間以上の就労は「保育標準時間（最大11時間／7:00〜18:00）」、月64〜120時間未満の就労は「保育短時間（最大8時間／8:30〜16:30）」となります。申込書には第1〜第6希望まで記入できるため、駅チカの小規模保育（0〜2歳）や新設園・企業主導型も含めて複数園を見学しておくのが安心です。
            </p>
          </div>

          <div className="guide-links">
            {HOKATSU_GUIDE.officialLinks.map((link) => (
              <a
                key={link.url}
                href={link.url}
                target="_blank"
                rel="noreferrer"
                className="ext-link"
              >
                {link.label} ↗
              </a>
            ))}
          </div>
        </div>
      )}

      {showAdd && (
        <div className="panel-box">
          <div className="subhead">候補の園・施設を追加（近隣市の園・認可外など）</div>
          <div className="form-grid">
            <label>
              施設名（必須）
              <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="例：〇〇保育園（船橋市・白井市など）" />
            </label>
            <label>
              種別
              <input value={newType} onChange={(e) => setNewType(e.target.value)} placeholder="例：認可外・他市認可園" />
            </label>
            <label>
              最寄り駅・徒歩分数
              <input value={newStation} onChange={(e) => setNewStation(e.target.value)} placeholder="例：新鎌ケ谷駅 徒歩5分" />
            </label>
            <label>
              電話番号（任意・ハイフン自動整形）
              <input
                type="tel"
                value={newTel}
                onChange={(e) => setNewTel(formatPhoneNumber(e.target.value))}
                onBlur={(e) => setNewTel(formatPhoneNumber(e.target.value))}
                placeholder="例：047-445-0000"
              />
            </label>
            <label>
              公式HPのURL（任意）
              <input value={newUrl} onChange={(e) => setNewUrl(e.target.value)} placeholder="https://..." />
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

      <div className={`filter-stack ${hasNurseryFilter ? 'is-filtered' : ''}`}>
        <div className="search-row">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="園名・駅名・住所・特徴（生後57日、一時預かり、20時など）で検索"
          />
          {candidateCount > 0 && (
            <button type="button" className="btn-line" onClick={shareLine}>
              希望・候補リスト（{candidateCount}園）をLINE共有
            </button>
          )}
        </div>

        <div className="filter-group">
          <span className="filter-label">施設種別</span>
          <div className="chip-scroll">
            {TYPES.map((t) => {
              const active = typeFilter === t
              return (
                <button
                  key={t}
                  type="button"
                  className={`chip ${active ? 'on' : ''}`}
                  onClick={() => setTypeFilter(active && t !== 'all' ? 'all' : t)}
                >
                  {active ? '✓ ' : ''}
                  {TYPE_LABEL[t] ?? t}
                  {t === 'fav' ? `（${candidateCount}）` : ''}
                </button>
              )
            })}
          </div>
        </div>

        <div className="filter-group">
          <span className="filter-label">駅エリア</span>
          <div className="chip-scroll">
            {AREAS.map((a) => {
              const active = areaFilter === a
              return (
                <button
                  key={a}
                  type="button"
                  className={`chip ${active ? 'on' : ''}`}
                  onClick={() => setAreaFilter(active && a !== 'all' ? 'all' : a)}
                >
                  {active ? '✓ ' : ''}
                  {AREA_LABEL[a] ?? a}
                </button>
              )
            })}
          </div>
        </div>

        <div className="filter-group">
          <span className="filter-label">園の条件</span>
          <div className="chip-scroll">
            <button
              type="button"
              className={`chip ${featureFilters.length === 0 ? 'on' : ''}`}
              onClick={() => setFeatureFilters([])}
            >
              {featureFilters.length === 0 ? '✓ ' : ''}指定なし
            </button>
            {FEATURES.map((feat) => {
              const active = featureFilters.includes(feat)
              return (
                <button
                  key={feat}
                  type="button"
                  className={`chip ${active ? 'on' : ''}`}
                  onClick={() => toggleFeatureFilter(feat)}
                >
                  {active ? '✓ ' : ''}
                  {feat}
                </button>
              )
            })}
          </div>
        </div>

        <div className="filter-footer-row">
          {hasNurseryFilter ? (
            <div className="active-filter-banner">
              <span className="active-filter-text">
                <strong>フィルター適用中（{filtered.length}/{allNurseries.length}施設を表示）：</strong>
                {activeNurseryFilterLabels.join(' ／ ')}
              </span>
              <button type="button" className="filter-reset-btn" onClick={clearNurseryFilters}>
                ✕ 絞り込みをすべて解除
              </button>
            </div>
          ) : (
            <span className="filter-idle-text">フィルターなし（全{allNurseries.length}施設を表示中）</span>
          )}
        </div>
      </div>

      {filtered.length === 0 && (
        <div className="empty">
          <p>条件に一致する施設がありません。エリア・種別・園の条件フィルタや検索語句を変更してみてください。</p>
          {hasNurseryFilter && (
            <div className="empty-actions">
              <button type="button" onClick={clearNurseryFilters}>
                絞り込みをすべて解除する
              </button>
            </div>
          )}
        </div>
      )}

      <div className="nursery-list">
        {filtered.map((n) => {
          const candidate = isCandidate(n.id)
          const rankVal = ranks[n.id] || (favorites.includes(n.id) ? 'sub' : '')
          const tourStatus = tourStatuses[n.id] || 'none'
          const tourDate = tourDates[n.id] || ''
          const selectedChecks = tagsMap[n.id] || []
          const hasMemoOrChecks = Boolean(memos[n.id]) || selectedChecks.length > 0 || Boolean(tourDate)
          const drawerOpen = openDrawerIds[n.id] ?? (candidate || hasMemoOrChecks)

          const hasDistinctCityUrl = Boolean(n.cityUrl && n.url && n.cityUrl !== n.url)
          const isCityPageOnly = Boolean(n.url && n.url.includes('kamakko.info'))

          return (
            <article key={n.id} className={`nursery-card ${candidate ? 'is-fav' : ''}`}>
              <div className="nursery-top">
                <div className="nursery-main">
                  <div className="badges">
                    {rankVal && (
                      <span className={`badge rank-badge rank-${rankVal}`}>
                        {RANK_LABEL[rankVal] || '候補'}
                      </span>
                    )}
                    <span className="badge type-badge">{n.type}</span>
                    {n.area && <span className="badge area-badge">{n.area}エリア</span>}
                    {tourStatus === 'visited' && <span className="badge tour-done-badge">✓ 見学済</span>}
                    {tourStatus === 'reserved' && (
                      <span className="badge tour-res-badge">
                        見学予約済{tourDate ? `（${tourDate}）` : ''}
                      </span>
                    )}
                    {(n.features || []).map((feat) => (
                      <span key={feat} className="badge feat-badge">
                        {feat}
                      </span>
                    ))}
                  </div>

                  <h3>{n.name}</h3>

                  <div className="nursery-specs">
                    {n.age && (
                      <div className="spec-item">
                        <span className="spec-k">対象年齢</span>
                        <span className="spec-v">{n.age}</span>
                      </div>
                    )}
                    {n.hours && (
                      <div className="spec-item">
                        <span className="spec-k">開所時間</span>
                        <span className="spec-v">{n.hours}</span>
                      </div>
                    )}
                    {n.capacity && (
                      <div className="spec-item">
                        <span className="spec-k">定員</span>
                        <span className="spec-v">{n.capacity}</span>
                      </div>
                    )}
                    {n.station && (
                      <div className="spec-item">
                        <span className="spec-k">最寄駅</span>
                        <span className="spec-v">{n.station}</span>
                      </div>
                    )}
                    {n.address && (
                      <div className="spec-item">
                        <span className="spec-k">所在地</span>
                        <span className="spec-v">鎌ケ谷市{n.address}</span>
                      </div>
                    )}
                    {n.tel && (
                      <div className="spec-item">
                        <span className="spec-k">電話番号</span>
                        <a href={`tel:${n.tel}`} className="spec-tel">
                          {n.tel}（見学予約・問合せ）
                        </a>
                      </div>
                    )}
                  </div>

                  {n.note && <p className="nursery-note">{n.note}</p>}
                </div>

                <div className="nursery-actions">
                  <div className="link-buttons">
                    {n.url ? (
                      <a
                        href={n.url}
                        target="_blank"
                        rel="noreferrer"
                        className="nursery-link-btn primary-link"
                      >
                        {isCityPageOnly ? '市公式の園詳細 ↗' : '園の公式HP ↗'}
                      </a>
                    ) : (
                      <a
                        href={searchUrl(n)}
                        target="_blank"
                        rel="noreferrer"
                        className="nursery-link-btn"
                      >
                        Web検索 ↗
                      </a>
                    )}
                    {hasDistinctCityUrl && (
                      <a
                        href={n.cityUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="nursery-link-btn"
                      >
                        市紹介ページ ↗
                      </a>
                    )}
                    <a
                      href={mapUrl(n.name)}
                      target="_blank"
                      rel="noreferrer"
                      className="nursery-link-btn"
                    >
                      Googleマップ ↗
                    </a>
                    {n.custom && (
                      <button
                        type="button"
                        className="ghost danger small-btn"
                        onClick={() => deleteCustomNursery(n.id)}
                      >
                        削除
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* 希望順位・見学ステータス・メモ開閉バー */}
              <div className="nursery-control-bar">
                <div className="control-left">
                  <select
                    aria-label={`${n.name}の希望順位`}
                    className={`rank-select ${rankVal ? 'active' : ''}`}
                    value={rankVal}
                    onChange={(e) => updateRank(n.id, e.target.value)}
                  >
                    {RANK_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>

                  <div className="tour-status-group" role="group" aria-label="見学ステータス">
                    {(
                      [
                        ['none', '未見学'],
                        ['reserved', '見学予約済'],
                        ['visited', '見学済'],
                      ] as const
                    ).map(([st, label]) => (
                      <button
                        key={st}
                        type="button"
                        className={`tour-pill ${tourStatus === st ? 'on' : ''}`}
                        onClick={() => updateTourStatus(n.id, st)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="control-right">
                  {selectedChecks.length > 0 && !drawerOpen && (
                    <span className="check-summary-pill">確認済 {selectedChecks.length}項目</span>
                  )}
                  <button
                    type="button"
                    className="btn-inline drawer-toggle"
                    onClick={() => toggleDrawer(n.id)}
                  >
                    {drawerOpen ? '見学記録を閉じる ▴' : '見学チェック・メモ ▾'}
                  </button>
                </div>
              </div>

              {drawerOpen && (
                <div className="nursery-memo-box">
                  <div className="tour-meta-row">
                    <label className="tour-date-label">
                      <span>見学日・予約日時</span>
                      <input
                        type="text"
                        value={tourDate}
                        onChange={(e) => updateTourDate(n.id, e.target.value)}
                        placeholder="例：10/24(金) 10:00〜"
                      />
                    </label>
                    {!candidate && (
                      <button
                        type="button"
                        className="small-btn"
                        onClick={() => toggleFavorite(n.id)}
                      >
                        + 候補リストに入れる
                      </button>
                    )}
                  </div>

                  <div className="tour-check-block">
                    <span className="memo-sublabel">見学時の確認チェック（タップで記録）</span>
                    <div className="tour-check-chips">
                      {TOUR_CHECK_ITEMS.map((item) => {
                        const checked = selectedChecks.includes(item)
                        return (
                          <button
                            key={item}
                            type="button"
                            className={`tag-chip ${checked ? 'on' : ''}`}
                            onClick={() => toggleCheckItem(n.id, item)}
                          >
                            {checked ? '✓ ' : '+ '}
                            {item}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <div className="memo-textarea-wrap">
                    <span className="memo-sublabel">見学メモ・先生の雰囲気・通勤動線など</span>
                    <textarea
                      value={memos[n.id] || ''}
                      onChange={(e) => updateMemo(n.id, e.target.value)}
                      placeholder="園長先生のお話、園児の様子、持ち物（布団・エプロン等）、駐車場やベビーカー置場の場所などを自由に記録..."
                      rows={3}
                    />
                  </div>
                </div>
              )}
            </article>
          )
        })}
      </div>
    </section>
  )
}
