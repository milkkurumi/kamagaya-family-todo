import { GoogleGenAI } from '@google/genai';
import fs from 'fs/promises';
import path from 'path';
import 'dotenv/config';

// 監視するURLリスト（国・県・市）
const TARGET_URLS = [
  { name: 'こども家庭庁（児童手当）', url: 'https://www.cfa.go.jp/policies/kokoseido/jidouteate' },
  { name: '千葉県（子ども医療費助成）', url: 'https://www.pref.chiba.lg.jp/jidou/iryou/shouji/index.html' },
  { name: '鎌ケ谷市（出産・子育て応援事業）', url: 'https://www.city.kamagaya.chiba.jp/kenko-fukushi/kenko-iryo/kenko/boshi/shussan_kosodate.html' },
];

async function fetchText(url: string): Promise<string> {
  try {
    const res = await fetch(url);
    const html = await res.text();
    // 簡易的なHTMLタグ除去と空白圧縮
    return html.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').slice(0, 8000);
  } catch (e) {
    console.error(`Failed to fetch ${url}:`, e);
    return '';
  }
}

async function runMonitor() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("GEMINI_API_KEY が設定されていません。");
    process.exit(1);
  }

  const ai = new GoogleGenAI({ apiKey });
  
  console.log("ウェブサイトから最新情報を取得中...");
  let combinedContext = '';
  for (const target of TARGET_URLS) {
    const text = await fetchText(target.url);
    combinedContext += `\n--- [${target.name}] ---\n${text}\n`;
  }

  console.log("現在のタスク定義 (tasks.ts) を読み込み中...");
  const tasksCode = await fs.readFile(path.join(process.cwd(), 'src/data/tasks.ts'), 'utf-8');

  console.log("Gemini 3.1 Pro に変更点の推論を依頼中...");
  const prompt = `
あなたは鎌ケ谷市特化の子育て支援タスク管理アプリの運用保守エンジニアです。
以下の「国・県・市の最新ウェブサイト情報」と「現在のアプリのタスク設定コード (tasks.ts)」を比較し、
制度（もらえる金額、対象年齢、申請期限、手続きのルールなど）に変更がないか確認してください。

【確認のポイント】
1. 児童手当の所得制限や支給額の変更
2. 千葉県の子ども医療費助成の対象年齢拡大や自己負担額の変更
3. 鎌ケ谷市の出産子育て応援ギフトの金額や申請方法の変更

【出力形式】
もし変更があれば、どのようにtasks.tsを修正すべきか、具体的な改善案をMarkdown形式で提示してください。
変更がなければ「現時点では変更なし」とだけ出力してください。

=== ウェブサイト最新情報 ===
${combinedContext}

=== 現在の tasks.ts ===
${tasksCode.slice(0, 20000)} // トークン節約のため一部
`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    
    const resultText = response.text || '解析エラー';
    console.log("\n====== Gemini 3.1 Pro の解析結果 ======\n");
    console.log(resultText);

    // GitHub Actions上でIssueを作成するためにファイルに出力
    await fs.writeFile('monitor_report.md', resultText, 'utf-8');

  } catch (error) {
    console.error("Gemini API の呼び出しに失敗しました:", error);
    process.exit(1);
  }
}

runMonitor();
