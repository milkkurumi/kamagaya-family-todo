export type NurseryType = '市立保育園' | '私立保育園' | '認定こども園' | '小規模保育'

export interface Nursery {
  id: string
  name: string
  type: NurseryType
  note?: string
  url?: string
}

/**
 * 鎌ケ谷市の保育施設（施設名・種別のみ）。
 * 住所・定員・開園時間・空き状況は変動するため、地図リンクと市の公式情報で確認してもらう。
 * 出典: 鎌ケ谷市公式ホームページ 保育施設一覧（2026年10月確認）
 */
export const NURSERIES: Nursery[] = [
  { id: 'michinobe', name: '市立道野辺保育園', type: '市立保育園', url: 'https://www.city.kamagaya.chiba.jp/kosodate/hoikuen/shiritsuhoikuen/michinobe.html' },
  { id: 'minamihatsutomi', name: '市立南初富保育園', type: '市立保育園', url: 'https://www.city.kamagaya.chiba.jp/kosodate/hoikuen/shiritsuhoikuen/minamihatsutomi.html' },
  { id: 'awano', name: '市立粟野保育園', type: '市立保育園', url: 'https://www.city.kamagaya.chiba.jp/kosodate/hoikuen/shiritsuhoikuen/awano.html' },
  { id: 'kamagaya', name: '市立鎌ケ谷保育園', type: '市立保育園', url: 'https://www.city.kamagaya.chiba.jp/kosodate/hoikuen/shiritsuhoikuen/kamagaya.html' },

  { id: 'fujinoko', name: 'ふじのこ保育園', type: '私立保育園' },
  { id: 'risunoko', name: 'りすのこ園', type: '私立保育園', note: 'ふじのこ保育園の分園' },
  { id: 'oozora', name: 'おおぞら保育園', type: '私立保育園' },
  { id: 'maruyama', name: 'まるやま保育園', type: '私立保育園' },
  { id: 'picorail', name: 'まなびの森 鎌ケ谷ピコレール保育園', type: '私立保育園' },
  { id: 'sukusuku', name: 'すくすくの杜鎌ケ谷園', type: '私立保育園' },
  { id: 'takashi-shinkama', name: 'たかし保育園新鎌ケ谷', type: '私立保育園' },
  { id: 'takashi-daibutsu', name: 'たかし保育園鎌ケ谷大仏', type: '私立保育園' },
  { id: 'ks-garden', name: "K's garden 鎌ケ谷保育園", type: '私立保育園' },

  { id: 'fuji-kg', name: '鎌ケ谷ふじ幼稚園', type: '認定こども園' },
  { id: 'midori-kg', name: '鎌ヶ谷みどり幼稚園', type: '認定こども園' },

  { id: 'athome-hoshinoko', name: 'あっとほーむママ・ほしのこ', type: '小規模保育' },
  { id: 'athome-nijinoko', name: 'あっとほーむママ・にじのこ', type: '小規模保育' },
  { id: 'michiru-kids', name: 'みちるkids園', type: '小規模保育' },
  { id: 'hatsutomi-smile', name: '初富スマイルキッズ', type: '小規模保育' },
  { id: 'futaba', name: 'ふたば園', type: '小規模保育' },
  { id: 'kurumi', name: 'くるみ園', type: '小規模保育' },
  { id: 'angel-hatsutomi', name: 'えんぜるナーサリー初富', type: '小規模保育' },
  { id: 'burea-shinkama', name: 'ぶれあ保育園・新鎌ケ谷', type: '小規模保育' },
  { id: 'skuld-shinkama', name: 'スクルドエンジェル保育園新鎌ケ谷園', type: '小規模保育' },
  { id: 'skuld-daibutsu', name: 'スクルドエンジェル保育園鎌ケ谷大仏園', type: '小規模保育' },
]

export const mapUrl = (name: string) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${name} 鎌ケ谷市`)}`

export const searchUrl = (name: string) =>
  `https://www.google.com/search?q=${encodeURIComponent(`${name} 鎌ケ谷市 保育園`)}`
