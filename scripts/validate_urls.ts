import { NURSERIES } from '../src/data/nurseries.js';

async function checkUrls() {
  const urls = new Set<string>();
  
  // 保育園のURLを収集
  for (const n of NURSERIES) {
    if (n.url) urls.add(n.url);
  }

  console.log(`Checking ${urls.size} URLs...`);
  let hasError = false;

  for (const url of urls) {
    try {
      const res = await fetch(url, { method: 'HEAD', headers: { 'User-Agent': 'Mozilla/5.0' } });
      if (res.status >= 400) {
        console.error(`❌ [${res.status}] ${url}`);
        hasError = true;
      } else {
        console.log(`✅ [${res.status}] ${url}`);
      }
    } catch (e: any) {
      console.error(`❌ [ERROR] ${url}: ${e.message}`);
      hasError = true;
    }
  }

  if (hasError) {
    console.error('\n🚨 一部のURLがリンク切れ、または間違っています。');
    process.exit(1);
  } else {
    console.log('\n🎉 すべてのURLが正常にアクセス可能です！');
  }
}

checkUrls();
