// scripts/translate.mjs
// ─────────────────────────────────────────────────────────────
// 사용법: node scripts/translate.mjs src/content/cloud-week1/ko.md
//
// ko.md를 읽어서 en.md, mn.md를 자동 생성합니다.
// Claude API를 사용합니다. API 키는 .env에서 읽습니다.
// ─────────────────────────────────────────────────────────────

import fs from 'fs';
import path from 'path';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

if (!ANTHROPIC_API_KEY) {
  console.error('❌ ANTHROPIC_API_KEY 환경변수가 없습니다. .env 파일을 확인하세요.');
  process.exit(1);
}

const targetFile = process.argv[2];
if (!targetFile) {
  console.error('❌ 번역할 파일 경로를 입력하세요.');
  console.error('   예: node scripts/translate.mjs src/content/cloud-week1/ko.md');
  process.exit(1);
}

const sourceContent = fs.readFileSync(targetFile, 'utf-8');
const dir = path.dirname(targetFile);

// ── 번역 실행 ──────────────────────────────────────────────
async function translate(content, targetLang) {
  const langNames = { en: 'English', mn: 'Mongolian (Cyrillic script)' };
  const langName = langNames[targetLang];

  const prompt = `You are translating a Korean blog post to ${langName}.

RULES:
1. Translate ALL Korean text (title, subtitle, body paragraphs, callouts, card texts, closing-box).
2. Keep ALL HTML tags, CSS class names, Astro frontmatter keys EXACTLY as-is.
3. In the frontmatter: change lang: "ko" → lang: "${targetLang}", keep all other keys.
4. Translate frontmatter VALUES that are text: title, subtitle, category (use appropriate ${langName} term), tags (translate if meaningful), toc labels, related.title.
5. Keep slug, date, readTime, week, class (course name), href values unchanged.
6. Maintain the same markdown structure, headings, and table format.
7. For Mongolian: use natural, academic Mongolian. Not a word-for-word literal translation.
8. Output ONLY the translated file content. No explanation, no markdown fences.

SOURCE FILE:
${content}`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`API 오류 (${response.status}): ${err}`);
  }

  const data = await response.json();
  return data.content[0].text;
}

// ── 메인 ──────────────────────────────────────────────────
async function main() {
  console.log(`\n📄 원본: ${targetFile}`);

  for (const lang of ['en', 'mn']) {
    const outPath = path.join(dir, `${lang}.md`);

    // 이미 존재하면 스킵 (--force 플래그 없으면)
    if (fs.existsSync(outPath) && !process.argv.includes('--force')) {
      console.log(`⏭️  ${lang}.md 이미 존재 — 스킵 (덮어쓰려면 --force 사용)`);
      continue;
    }

    console.log(`🌐 ${lang === 'en' ? 'English' : 'Mongolian'} 번역 중...`);

    try {
      const translated = await translate(sourceContent, lang);
      fs.writeFileSync(outPath, translated, 'utf-8');
      console.log(`✅ 저장 완료: ${outPath}`);
    } catch (err) {
      console.error(`❌ ${lang} 번역 실패:`, err.message);
    }
  }

  console.log('\n🎉 번역 완료! 몽골어(mn.md)는 직접 검수하세요.\n');
}

main();
