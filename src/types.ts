/** 優先度フラグ */
export type Priority = 'must' | 'recommend' | 'optional'

/** 担当・役割フラグ */
export type Role = 'papa' | 'together' | 'mama'

/**
 * 推奨期間の基準日
 * - none: 基準日なし（妊活期など、いつでも）
 * - due: 出産予定日
 * - birth: 子の生年月日（未出産の場合は出産予定日で仮計算）
 * - school: 小学校入学日（生年月日から自動算出した入学年度の4月1日）
 */
export type Anchor = 'none' | 'due' | 'birth' | 'school'

export type Phase = 'prep' | 'pregnancy' | 'postpartum' | 'infant' | 'toddler' | 'preschool'

export interface TaskDef {
  id: string
  title: string
  phase: Phase
  priority: Priority
  role: Role
  anchor: Anchor
  /** 基準日からの推奨開始日（日数） */
  startOffset?: number
  /** 基準日からの期限/推奨終了日（日数） */
  endOffset?: number
  /** 期限が法律・制度上の厳格な期限かどうか */
  hardDeadline?: boolean
  /** 期限の説明（例：「出生日を含め14日以内」） */
  deadlineLabel?: string
  summary: string
  place?: string
  bring?: string[]
  /** パパが単独で行く場合の補足 */
  papaNote?: string
  /** お金に関わる情報（助成額など） */
  money?: string
  /** 所要時間の目安（分）。カレンダー登録時の終了時刻に使用 */
  durationMin?: number
  sourceUrl?: string
  sourceLabel?: string
  /** アフィリエイトリンク等、おすすめ商品の提案 */
  affiliate?: { url: string; label: string; icon?: string }[]
  /** 第1子の家庭のみ対象 */
  firstChildOnly?: boolean
}

export type Status = 'todo' | 'scheduled' | 'done' | 'skip'
export type Assignee = '' | 'papa' | 'mama' | 'both'

export interface TaskState {
  status: Status
  date?: string // YYYY-MM-DD
  time?: string // HH:mm（空なら終日）
  assignee?: Assignee
  memo?: string
  calendarAdded?: boolean
}

export interface Settings {
  dueDate?: string
  birthDate?: string
  childName?: string
  papaEmail?: string
  mamaEmail?: string
  /** 第1子かどうか（初めての妊娠向け教室などの表示に使用） */
  firstChild: boolean
  /** 初期設定を完了したか（妊活中は日付なしで利用するため） */
  configured?: boolean
}

export interface AppData {
  settings: Settings
  tasks: Record<string, TaskState>
}
