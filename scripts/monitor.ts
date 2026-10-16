import { GoogleGenAI } from '@google/genai';
import fs from 'fs/promises';
import path from 'path';
import 'dotenv/config';

const K = 'https://kamakko.info';
const NOTE_ARTICLE_URL = 'https://note.com/tamanegi_tomato/n/n3fdde1baf79b';
const NOTE_EDIT_URL = 'https://editor.note.com/notes/n3fdde1baf79b/edit/';

// 監視するURLリスト（国・県・市）。アプリ内の制度情報（tasks.ts / nurseries.ts / MoneySimulation.tsx）の根拠ページを対象にする
const TARGET_URLS = [
  { name: 'こども家庭庁（児童手当）', url: 'https://www.cfa.go.jp/policies/kokoseido/jidouteate' },
  { name: '厚生労働省（育児・介護休業法）', url: 'https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/0000130583.html' },
  { name: '千葉県（子ども医療費助成）', url: 'https://www.pref.chiba.lg.jp/jika/boshi/kodomo-iryo/nyuuyouji.html' },
  { name: '鎌ケ谷市（妊娠がわかったら）', url: `${K}/ninshin-shussan/ninshingawakattara-2/` },
  { name: '鎌ケ谷市（赤ちゃんが生まれたら）', url: `${K}/ninshin-shussan/umaretara/` },
  { name: '鎌ケ谷市（出産に関連する手当）', url: `${K}/teate-josei/shussan-kanren/` },
  { name: '鎌ケ谷市（子ども医療費）', url: `${K}/teate-josei/iryohi/kodomo-iryohi/` },
  { name: '鎌ケ谷市（児童手当）', url: `${K}/teate-josei/jido-teate/` },
  { name: '鎌ケ谷市（チーパス）', url: `${K}/teate-josei/chipas/` },
  { name: '鎌ケ谷市（保育園・小規模保育・認定こども園一覧）', url: `${K}/hoiku/hoikuen/` },
  { name: '鎌ケ谷市（保育園の入園手続き）', url: `${K}/hoiku/hoikuen/nyuen-tetsuzuki-2/` },
  { name: '鎌ケ谷市（4月保育園入園申込スケジュール）', url: `${K}/hoiku/hoikuen/r1-tetuduki-2/` },
  { name: '鎌ケ谷市（幼稚園・認定こども園一覧）', url: `${K}/hoiku/yochien-2/` },
  { name: '鎌ケ谷市（企業主導型保育事業）', url: `${K}/hoiku/byogoji-hoiku-2-2/` },
  { name: '鎌ケ谷市（保育園一時預かり）', url: `${K}/hoiku/ichiji-hoiku-2/` },
];

// 利用可能なモデルを優先順に試す
const MODELS = ['gemini-3.8-flash', 'gemini-3.1-pro-preview', 'gemini-2.5-flash'];

const NO_CHANGE_MARKER = 'NO_CHANGE';

interface FetchResult {
  name: string;
  url: string;
  ok: boolean;
  text: string;
  error?: string;
}

async function fetchText(target: { name: string; url: string }): Promise<FetchResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const res = await fetch(target.url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
      signal: controller.signal,
    });
    if (!res.ok) {
      return { ...target, ok: false, text: '', error: `HTTP ${res.status}` };
    }
    const html = await res.text();
    // script/style を除去してからタグ除去・空白圧縮
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]*>?/gm, ' ')
      .replace(/\s+/g, ' ')
      .slice(0, 6000);
    return { ...target, ok: true, text };
  } catch (e: any) {
    return { ...target, ok: false, text: '', error: e?.message ?? String(e) };
  } finally {
    clearTimeout(timer);
  }
}

async function generate(ai: GoogleGenAI, prompt: string): Promise<string> {
  let lastError: unknown;
  const MAX_ATTEMPTS = 6;
  for (const model of MODELS) {
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        console.log(`モデル ${model} で解析中 (試行 ${attempt})...`);
        const response = await ai.models.generateContent({ model, contents: prompt });
        return response.text || '';
      } catch (e: any) {
        lastError = e;
        const status = e?.status;
        console.warn(`⚠️ ${model} 失敗 (試行 ${attempt}, status=${status})`);
        // クォータ超過・提供終了は再試行しても無駄なので次のモデルへ
        if (status === 429 || status === 404 || status === 400) break;
        // 503/500 などの一時的な混雑は指数バックオフで再試行 (10s, 20s, 40s ...)
        await new Promise((r) => setTimeout(r, 10000 * 2 ** (attempt - 1)));
      }
    }
  }
  throw lastError;
}

async function runMonitor() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('GEMINI_API_KEY が設定されていません。');
    process.exit(1);
  }

  const ai = new GoogleGenAI({ apiKey });

  console.log('ウェブサイトから最新情報を取得中...');
  const results = await Promise.all(TARGET_URLS.map(fetchText));

  const failed = results.filter((r) => !r.ok);
  failed.forEach((r) => console.warn(`⚠️ 取得失敗: ${r.name} (${r.url}) - ${r.error}`));
  if (failed.length === results.length) {
    console.error('すべての監視対象ページの取得に失敗しました。');
    process.exit(1);
  }

  const combinedContext = results
    .filter((r) => r.ok)
    .map((r) => `\n--- [${r.name}] ${r.url} ---\n${r.text}\n`)
    .join('');

  console.log('現在のアプリデータ (tasks.ts / nurseries.ts / MoneySimulation.tsx) を読み込み中...');
  const tasksCode = await fs.readFile(path.join(process.cwd(), 'src/data/tasks.ts'), 'utf-8');
  const nurseriesCode = await fs.readFile(path.join(process.cwd(), 'src/data/nurseries.ts'), 'utf-8');
  const moneyCode = await fs.readFile(path.join(process.cwd(), 'src/components/MoneySimulation.tsx'), 'utf-8');

  const prompt = `
あなたは鎌ケ谷市特化の子育て支援・保活アプリ「かまがや親子カレンダー」の運用保守エンジニアです。
以下の「国・県・市の最新ウェブサイト情報」と「現在のアプリのコード (tasks.ts / nurseries.ts / MoneySimulation.tsx)」を比較し、
制度や保育施設データに変更がないか確認してください。

【確認のポイント】
1. 児童手当の所得制限や支給額の変更
2. 千葉県・鎌ケ谷市の子ども医療費助成の対象年齢拡大や自己負担額の変更
3. 鎌ケ谷市の出産・子育て応援給付金（妊婦のための支援給付金）や第2子以降出産祝金の金額・申請方法の変更
4. 鎌ケ谷市の保育施設（市立・私立保育園、認定こども園、小規模保育、幼稚園、企業主導型）の新設・閉園・定員・開所時間・令和9年4月入園申込スケジュールの変更

【出力ルール】
- 現在のコードの記述と明確に食い違う点だけを報告してください。確証のない推測は書かないでください。
- 変更があれば、以下の2つのセクションに分けて具体的にMarkdownで出力してください：
  1. **アプリコード修正箇所**：どのファイル（tasks.ts / nurseries.ts / MoneySimulation.tsx）のどのID・項目をどう修正すべきか（根拠ページ名つき）
  2. **note記事の更新用テキスト案**（公開URL: ${NOTE_ARTICLE_URL} ／ 編集画面: ${NOTE_EDIT_URL}）：アプリ更新に合わせてnote記事のどのセクションをどう書き換えるか（または追記するか）の具体的な文面
- 変更がなければ、${NO_CHANGE_MARKER} とだけ出力してください。それ以外の文章は付けないでください。

=== ウェブサイト最新情報 ===
${combinedContext}

=== 現在の tasks.ts ===
${tasksCode}

=== 現在の nurseries.ts ===
${nurseriesCode}

=== 現在の MoneySimulation.tsx ===
${moneyCode}
`;

  let resultText: string;
  try {
    resultText = (await generate(ai, prompt)).trim() || '解析エラー';
  } catch (error) {
    console.error('Gemini API の呼び出しに失敗しました:', error);
    process.exit(1);
  }

  console.log('\n====== Gemini 解析結果 ======\n');
  console.log(resultText);

  // 取得に失敗したページがあればレポートに追記（変更なしでも通知対象にする）
  let report = resultText;
  if (failed.length > 0) {
    const failNote = failed.map((r) => `- ${r.name}: ${r.url} (${r.error})`).join('\n');
    report =
      (resultText === NO_CHANGE_MARKER ? '' : resultText + '\n\n') +
      `## ⚠️ 取得できなかった監視対象ページ\nURLが変更された可能性があります。scripts/monitor.ts を確認してください。\n${failNote}\n`;
  }

  // GitHub Actions上でIssueを作成するためにファイルに出力
  await fs.writeFile('monitor_report.md', report, 'utf-8');
}

runMonitor();
