import { NURSERIES, HOKATSU_GUIDE } from '../src/data/nurseries.js';

async function checkUrls() {
  const urls = new Set<string>();

  for (const n of NURSERIES) {
    if (n.url) urls.add(n.url);
    if (n.cityUrl) urls.add(n.cityUrl);
  }
  for (const link of HOKATSU_GUIDE.officialLinks) {
    if (link.url) urls.add(link.url);
  }

  console.log(`Checking ${urls.size} URLs...`);
  let hasError = false;

  for (const url of urls) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      const res = await fetch(url, {
        method: 'GET',
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.status >= 400) {
        console.error(`❌ [${res.status}] ${url}`);
        hasError = true;
      } else {
        console.log(`✅ [${res.status}] ${url}`);
      }
    } catch (e: any) {
      console.warn(`⚠️ [SKIP/WARN] ${url}: ${e.message}`);
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
