/**
 * 電話番号を自動整形するユーティリティ。
 * 全角数字や全角ハイフンを半角に揃え、ハイフン無しで10桁・11桁の数字が入力された場合は
 * 日本の市外局番・携帯番号・フリーダイヤルの桁数ルールに従ってハイフンを自動挿入する。
 */
export function formatPhoneNumber(input: string): string {
  if (!input) return ''

  // 全角数字→半角数字、全角ハイフン類→半角ハイフン
  const normalized = input
    .replace(/[０-９]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0))
    .replace(/[ー−―‐—–]/g, '-')
    .trim()

  // すでにハイフンが含まれている場合は、連続ハイフンのみ整理して返す
  if (normalized.includes('-')) {
    return normalized.replace(/-+/g, '-')
  }

  // 数字のみ抽出
  const digits = normalized.replace(/\D/g, '')
  if (!digits.startsWith('0')) {
    return normalized
  }

  // 11桁：携帯電話・IP電話 (090 / 080 / 070 / 050) または フリーダイヤル (0800)
  if (digits.length === 11) {
    if (digits.startsWith('0800')) {
      return `${digits.slice(0, 4)}-${digits.slice(4, 7)}-${digits.slice(7)}`
    }
    if (/^0[5789]0/.test(digits)) {
      return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`
    }
  }

  // 10桁：固定電話・フリーダイヤル・ナビダイヤル（※090/080/070/050/0800で始まる11桁番号の入力途中は除外）
  if (digits.length === 10 && !/^0([5789]0|800)/.test(digits)) {
    // フリーダイヤル (0120) / ナビダイヤル (0570) -> 4-3-3
    if (digits.startsWith('0120') || digits.startsWith('0570')) {
      return `${digits.slice(0, 4)}-${digits.slice(4, 7)}-${digits.slice(7)}`
    }

    // 千葉県・近隣の4桁市外局番 (0470, 0475, 0476, 0478, 0479, 0436, 0438, 0439 等) -> 4-2-4
    if (/^04(3[689]|7[05689])/.test(digits)) {
      return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6)}`
    }

    // 2桁市外局番：東京(03)、大阪(06)、柏・我孫子・所沢等(04-71xx, 04-29xx, 04-20xx, 04-70xx) -> 2-4-4
    if (digits.startsWith('03') || digits.startsWith('06') || /^04(20|29|70|71)/.test(digits)) {
      return `${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6)}`
    }

    // 3桁市外局番：鎌ケ谷・船橋・松戸・市川(047)、千葉(043)、横浜(045)、さいたま(048) 等 -> 3-3-4
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`
  }

  return normalized
}
