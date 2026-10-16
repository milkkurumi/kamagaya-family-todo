export type NurseryType = '市立保育園' | '私立保育園' | '幼稚園' | '認定こども園' | '小規模保育'
export type NurseryArea = '新鎌ケ谷' | '鎌ケ谷' | '初富・北初富' | '鎌ケ谷大仏' | '馬込沢・六実・粟野'

export interface Nursery {
  id: string
  name: string
  type: NurseryType
  area?: NurseryArea
  station?: string
  address?: string
  age?: string
  note?: string
  url?: string
}

/**
 * 鎌ケ谷市の保育施設・幼稚園・認定こども園データ。
 * 所在地・最寄り駅・対象年齢を整理。最新の空き状況や開園時間は各公式情報で確認。
 * 出典: 鎌ケ谷市公式ホームページ・かまっこ応援団（2026年10月確認）
 */
export const NURSERIES: Nursery[] = [
  // 市立保育園
  {
    id: 'michinobe',
    name: '市立道野辺保育園',
    type: '市立保育園',
    area: '鎌ケ谷',
    station: '東武野田線 鎌ケ谷駅 徒歩約10分',
    address: '道野辺中央5-7-10',
    age: '生後57日〜就学前',
    url: 'https://kamakko.info/hoiku/hoikuen/',
  },
  {
    id: 'minamihatsutomi',
    name: '市立南初富保育園',
    type: '市立保育園',
    area: '初富・北初富',
    station: '京成松戸線 初富駅 徒歩約12分',
    address: '東初富2-6-50',
    age: '生後6か月〜就学前',
    url: 'https://kamakko.info/hoiku/hoikuen/',
  },
  {
    id: 'awano',
    name: '市立粟野保育園',
    type: '市立保育園',
    area: '馬込沢・六実・粟野',
    station: '新鎌ケ谷駅・北初富駅 徒歩約15分',
    address: '粟野740-3',
    age: '生後6か月〜就学前',
    url: 'https://kamakko.info/hoiku/hoikuen/',
  },
  {
    id: 'kamagaya',
    name: '市立鎌ケ谷保育園',
    type: '市立保育園',
    area: '鎌ケ谷大仏',
    station: '京成松戸線 鎌ケ谷大仏駅 徒歩約6分',
    address: '鎌ケ谷6-8-26',
    age: '生後6か月〜就学前',
    url: 'https://kamakko.info/hoiku/hoikuen/',
  },

  // 私立保育園
  {
    id: 'fujinoko',
    name: 'ふじのこ保育園',
    type: '私立保育園',
    area: '鎌ケ谷',
    station: '東武野田線 鎌ケ谷駅 徒歩約12分',
    address: '初富82-1',
    age: '0歳〜就学前',
  },
  {
    id: 'risunoko',
    name: 'りすのこ園',
    type: '私立保育園',
    area: '鎌ケ谷',
    station: '東武野田線 鎌ケ谷駅周辺',
    age: '1〜2歳（ふじのこ保育園分園）',
    note: 'ふじのこ保育園の分園',
  },
  {
    id: 'oozora',
    name: 'おおぞら保育園',
    type: '私立保育園',
    area: '初富・北初富',
    station: '京成松戸線 北初富駅 徒歩約4分',
    address: '初富354-1',
    age: '0歳〜就学前',
  },
  {
    id: 'maruyama',
    name: 'まるやま保育園',
    type: '私立保育園',
    area: '鎌ケ谷大仏',
    station: '鎌ケ谷大仏駅 / 鎌ケ谷駅 徒歩約13分',
    address: '丸山2-11-28',
    age: '0歳〜就学前',
  },
  {
    id: 'picorail',
    name: 'まなびの森 鎌ケ谷ピコレール保育園',
    type: '私立保育園',
    area: '新鎌ケ谷',
    station: '各線 新鎌ケ谷駅 徒歩約3分',
    address: '新鎌ケ谷1-13-3',
    age: '0歳〜就学前',
  },
  {
    id: 'sukusuku',
    name: 'すくすくの杜鎌ケ谷園',
    type: '私立保育園',
    area: '初富・北初富',
    station: '京成松戸線 初富駅 徒歩約3分',
    address: '富岡1-1-1（ショッピングプラザ鎌ケ谷別棟）',
    age: '0歳〜就学前',
  },
  {
    id: 'takashi-shinkama',
    name: 'たかし保育園新鎌ケ谷',
    type: '私立保育園',
    area: '新鎌ケ谷',
    station: '各線 新鎌ケ谷駅 徒歩約7分',
    address: '初富919-15',
    age: '0歳〜就学前',
  },
  {
    id: 'takashi-daibutsu',
    name: 'たかし保育園鎌ケ谷大仏',
    type: '私立保育園',
    area: '鎌ケ谷大仏',
    station: '京成松戸線 鎌ケ谷大仏駅周辺',
    age: '0歳〜就学前',
  },
  {
    id: 'ks-garden',
    name: "K's garden 鎌ケ谷保育園",
    type: '私立保育園',
    area: '鎌ケ谷',
    station: '東武野田線 鎌ケ谷駅 徒歩約9分',
    address: '東道野辺2-1-1 NTT鎌ケ谷ビル1F',
    age: '0歳〜就学前',
  },

  // 認定こども園
  {
    id: 'fuji-kg',
    name: '鎌ケ谷ふじ幼稚園',
    type: '認定こども園',
    area: '鎌ケ谷',
    station: '東武野田線 鎌ケ谷駅 徒歩約12分',
    address: '東道野辺5-1-57',
    age: '0歳〜就学前（幼保連携型）',
    url: 'https://www.minagaku.ed.jp/',
  },
  {
    id: 'midori-kg',
    name: '鎌ヶ谷みどり幼稚園',
    type: '認定こども園',
    area: '新鎌ケ谷',
    station: '各線 新鎌ケ谷駅 徒歩約8分',
    address: '粟野210',
    age: '満3歳〜就学前（幼稚園型）',
    url: 'http://www.kamagaya-midori.com/',
  },

  // 幼稚園
  {
    id: 'kamagaya-kg',
    name: 'かまがや幼稚園',
    type: '幼稚園',
    area: '初富・北初富',
    station: '初富駅 / 新鎌ケ谷駅 徒歩約10分',
    address: '中央1-16-3',
    age: '満3歳〜就学前',
    url: 'http://www.kamagaya-kindergarten.ed.jp/',
  },
  {
    id: 'michiru-kg',
    name: 'みちる幼稚園',
    type: '幼稚園',
    area: '鎌ケ谷',
    station: '鎌ケ谷駅 / 北初富駅 徒歩約15分',
    address: '東中沢3-5-1',
    age: '満3歳〜就学前',
    url: 'https://michiru1969.com/',
  },
  {
    id: 'hikari-kg',
    name: '鎌ケ谷ひかり幼稚園',
    type: '幼稚園',
    area: '鎌ケ谷大仏',
    station: '京成松戸線 鎌ケ谷大仏駅 徒歩約10分',
    address: '鎌ケ谷6-7-38',
    age: '満3歳〜就学前',
    url: 'http://www.hikari-kamagaya.ed.jp/',
  },
  {
    id: 'fujidaini-kg',
    name: '鎌ケ谷ふじ第2幼稚園',
    type: '幼稚園',
    area: '馬込沢・六実・粟野',
    station: '東武野田線 馬込沢駅 徒歩約16分',
    address: '西道野辺12-25',
    age: '満3歳〜就学前',
  },
  {
    id: 'watanabe-kg',
    name: '東京聖栄大学附属わたなべ幼稚園',
    type: '幼稚園',
    area: '鎌ケ谷大仏',
    station: '京成松戸線 鎌ケ谷大仏駅 徒歩約11分',
    address: '東初富5-25-16',
    age: '満3歳〜就学前',
    url: 'https://www.watanabe-youchien.ed.jp/',
  },
  {
    id: 'satsuma-kg',
    name: 'さつま幼稚園',
    type: '幼稚園',
    area: '馬込沢・六実・粟野',
    station: '東武野田線 六実駅 徒歩約10分',
    address: '佐津間893',
    age: '満3歳〜就学前',
    url: 'http://www.satsuma-kinder.jp/',
  },
  {
    id: 'sakura-kg',
    name: '鎌ケ谷さくら幼稚園',
    type: '幼稚園',
    area: '鎌ケ谷大仏',
    station: '鎌ケ谷大仏駅 徒歩約12分 / 鎌ケ谷駅 徒歩約14分',
    address: '丸山2-11-1',
    age: '満3歳〜就学前',
    url: 'https://kamagayasakura.ed.jp/',
  },

  // 小規模保育（駅チカあっとほーむ・0〜2歳児）
  {
    id: 'athome-hoshinoko',
    name: 'あっとほーむママ・ほしのこ',
    type: '小規模保育',
    area: '鎌ケ谷',
    station: '東武野田線 鎌ケ谷駅 徒歩約2分',
    address: '道野辺本町1-4-27 MSビル',
    age: '0〜2歳（定員19名）',
  },
  {
    id: 'athome-nijinoko',
    name: 'あっとほーむママ・にじのこ',
    type: '小規模保育',
    area: '新鎌ケ谷',
    station: '初富駅 徒歩約6分 / 新鎌ケ谷駅 徒歩約8分',
    address: '新鎌ケ谷3-1-19',
    age: '0〜2歳（定員19名）',
  },
  {
    id: 'michiru-kids',
    name: 'みちるkids園',
    type: '小規模保育',
    area: '新鎌ケ谷',
    station: '各線 新鎌ケ谷駅 徒歩約5分',
    address: '新鎌ケ谷1-11-20 メルベーユ新鎌102',
    age: '0〜2歳（定員19名）',
  },
  {
    id: 'hatsutomi-smile',
    name: '初富スマイルキッズ',
    type: '小規模保育',
    area: '初富・北初富',
    station: '京成松戸線 初富駅 徒歩約2分',
    address: '中央1-1-34 前田ビル1F',
    age: '0〜2歳（定員19名）',
  },
  {
    id: 'futaba',
    name: 'ふたば園',
    type: '小規模保育',
    area: '新鎌ケ谷',
    station: '各線 新鎌ケ谷駅 徒歩約4分',
    address: '新鎌ケ谷1-10-29 エムケイ新鎌1F',
    age: '0〜2歳（定員19名）',
  },
  {
    id: 'kurumi',
    name: 'くるみ園',
    type: '小規模保育',
    area: '鎌ケ谷',
    station: '東武野田線 鎌ケ谷駅 徒歩約3分',
    address: '道野辺本町1-4-34',
    age: '0〜2歳（定員19名）',
  },
  {
    id: 'angel-hatsutomi',
    name: 'えんぜるナーサリー初富',
    type: '小規模保育',
    area: '初富・北初富',
    station: '京成松戸線 初富駅 徒歩約2分',
    address: '中央1-3-20 山新ビル1F',
    age: '0〜2歳（定員19名）',
  },
  {
    id: 'burea-shinkama',
    name: 'ぶれあ保育園・新鎌ケ谷',
    type: '小規模保育',
    area: '新鎌ケ谷',
    station: '各線 新鎌ケ谷駅 徒歩約5分',
    address: '新鎌ケ谷1-10-5 1F',
    age: '0〜2歳（定員19名）',
  },
  {
    id: 'skuld-shinkama',
    name: 'スクルドエンジェル保育園新鎌ケ谷園',
    type: '小規模保育',
    area: '新鎌ケ谷',
    station: '各線 新鎌ケ谷駅 徒歩約2分',
    address: '新鎌ケ谷1-16-10 新鎌ケ谷駅前ビル2F',
    age: '0〜2歳（定員19名）',
  },
  {
    id: 'skuld-daibutsu',
    name: 'スクルドエンジェル保育園鎌ケ谷大仏園',
    type: '小規模保育',
    area: '鎌ケ谷大仏',
    station: '京成松戸線 鎌ケ谷大仏駅 徒歩約2分',
    address: '鎌ケ谷1-5-24',
    age: '0〜2歳（定員19名）',
  },
]

export const mapUrl = (name: string) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${name} 鎌ケ谷市`)}`

export const searchUrl = (nursery: { name: string; type: string }) => {
  const keyword = nursery.type === '幼稚園' ? '幼稚園' : '保育園'
  return `https://www.google.com/search?q=${encodeURIComponent(`${nursery.name} 鎌ケ谷市 ${keyword}`)}`
}
