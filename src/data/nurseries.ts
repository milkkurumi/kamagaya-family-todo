export type NurseryType = '認可保育園' | '認定こども園' | '小規模保育';

export interface Nursery {
  id: string;
  name: string;
  type: NurseryType;
  address: string;
  capacity: number;
  openHours: string;
  extendedHours: boolean;
  url?: string;
  note?: string;
}

export const NURSERIES: Nursery[] = [
  {
    id: 'awano',
    name: '粟野保育園',
    type: '認可保育園',
    address: '鎌ケ谷市粟野410-1',
    capacity: 120,
    openHours: '7:00 - 19:00',
    extendedHours: true,
    note: '公立。広い園庭が特徴。',
  },
  {
    id: 'michinobe',
    name: '道野辺保育園',
    type: '認可保育園',
    address: '鎌ケ谷市道野辺中央2-8-36',
    capacity: 90,
    openHours: '7:00 - 19:00',
    extendedHours: true,
    note: '公立。鎌ケ谷駅近く。',
  },
  {
    id: 'kamagaya',
    name: '鎌ケ谷保育園',
    type: '認可保育園',
    address: '鎌ケ谷市鎌ケ谷4-6-63',
    capacity: 100,
    openHours: '7:00 - 19:00',
    extendedHours: true,
    note: '公立。大仏駅徒歩圏内。',
  },
  {
    id: 'michiru',
    name: 'みちる保育園',
    type: '認可保育園',
    address: '鎌ケ谷市初富808-54',
    capacity: 150,
    openHours: '7:00 - 19:00',
    extendedHours: true,
    note: '私立。食育に力を入れている。',
    url: 'https://michiru.ed.jp/'
  },
  {
    id: 'midori',
    name: 'かまがやみどり保育園',
    type: '認可保育園',
    address: '鎌ケ谷市右京塚8-1',
    capacity: 90,
    openHours: '7:00 - 19:00',
    extendedHours: true,
    note: '私立。自然とのふれあいを重視。',
  },
  {
    id: 'kamagaya-fuji',
    name: '鎌ケ谷ふじ幼稚園（認定こども園）',
    type: '認定こども園',
    address: '鎌ケ谷市東初富1-16-36',
    capacity: 250,
    openHours: '7:00 - 19:00',
    extendedHours: true,
    note: '幼稚園型の認定こども園。教育プログラムが充実。',
  },
  {
    id: 'little-bear',
    name: 'リトルベアークラブ',
    type: '小規模保育',
    address: '鎌ケ谷市新鎌ケ谷1-18-5',
    capacity: 19,
    openHours: '7:30 - 18:30',
    extendedHours: false,
    note: '新鎌ヶ谷駅近く。0〜2歳児対象。',
  }
];
