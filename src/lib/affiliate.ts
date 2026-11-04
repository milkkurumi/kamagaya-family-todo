import type { TaskDef } from '../types'

export type AffiliateLink = NonNullable<TaskDef['affiliate']>[number]

/**
 * 関連アイテム（アフィリエイトリンク）を、対応するチェックリスト項目に割り当てる。
 * グループの下にまとめて出すと「どの商品がどの項目のものか」が分からないため、
 * 項目ごとに直下へ表示するのが目的。対応付けはラベルのキーワードで行う。
 * どの項目にも対応しないもの（レジストリ・ランキングなどグループ全体向け）は
 * unmatched として返し、呼び出し側でグループ見出し直下に小さく出す。
 */
const RULES: { affiliateIncludes: string; itemIncludes: string[] }[] = [
  { affiliateIncludes: '骨盤ベルト', itemIncludes: ['骨盤ベルト'] },
  { affiliateIncludes: '抱き枕', itemIncludes: ['抱き枕'] },
  { affiliateIncludes: 'レギンス', itemIncludes: ['レギンス'] },
  { affiliateIncludes: '円座クッション', itemIncludes: ['円座クッション'] },
  { affiliateIncludes: 'マタニティパジャマ', itemIncludes: ['パジャマ'] },
  { affiliateIncludes: 'チャイルドシート', itemIncludes: ['チャイルドシート'] },
]

export function matchAffiliates(
  affiliates: AffiliateLink[] | undefined,
  itemLabels: string[],
): { perItem: Map<string, AffiliateLink[]>; unmatched: AffiliateLink[] } {
  const perItem = new Map<string, AffiliateLink[]>()
  const unmatched: AffiliateLink[] = []
  for (const a of affiliates ?? []) {
    const rule = RULES.find((r) => a.label.includes(r.affiliateIncludes))
    const target = rule
      ? itemLabels.find((l) => rule.itemIncludes.some((k) => l.includes(k)))
      : undefined
    if (target) {
      perItem.set(target, [...(perItem.get(target) ?? []), a])
    } else {
      unmatched.push(a)
    }
  }
  return { perItem, unmatched }
}
