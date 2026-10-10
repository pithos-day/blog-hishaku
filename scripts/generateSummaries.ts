/**
 * AI記事summary生成スクリプト
 *
 * src/content/blog/ の markdown からプレーンテキストを抽出し、
 * OpenAI互換LLM APIで要約を生成して .cache/summaries.json に保存する。
 *
 * 使い方:
 *   pnpm generate:summaries               # デフォルトモデル使用
 *   pnpm generate:summaries --force       # キャッシュ無視で全再生成
 *   pnpm generate:summaries --model <名>  # モデル指定
 *
 * API_BASE_URL / API_KEY / DEFAULT_MODEL は環境変数で上書き可能。
 * LLM API が未起動なら graceful skip (summary なしでビルド可能)。
 */

import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { generateText } from '@xsai/generate-text';
import { glob } from 'glob';
import matter from 'gray-matter';
import { remark } from 'remark';
import strip from 'strip-markdown';
import type { SummaryData } from '../src/lib/summary';

const CONTENT_GLOB = 'src/content/blog/**/*.md';
const CACHE_FILE = '.cache/summaries-cache.json';
const OUTPUT_FILE = '.cache/summaries.json';
const CACHE_VERSION = '1';

const API_BASE_URL = process.env.SUMMARY_API_BASE_URL ?? 'http://127.0.0.1:1234/v1/';
const API_KEY = process.env.SUMMARY_API_KEY ?? 'lm-studio';
const DEFAULT_MODEL = process.env.SUMMARY_MODEL ?? 'qwen/qwen3-4b-2507';

function parseArgs(): { model: string; force: boolean } {
  const args = process.argv.slice(2);
  let model = DEFAULT_MODEL;
  let force = false;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--model' && args[i + 1]) {
      model = args[i + 1];
      i++;
    } else if (args[i] === '--force') {
      force = true;
    }
  }
  return { model, force };
}

interface PostData {
  slug: string;
  title: string;
  text: string;
  hash: string;
}

interface CacheEntry {
  hash: string;
  title: string;
  summary: string;
  generatedAt: string;
}

interface SummariesCache {
  version: string;
  model: string;
  entries: Record<string, CacheEntry>;
}

function computeHash(content: string): string {
  return crypto.createHash('md5').update(content).digest('hex');
}

async function loadCache(): Promise<SummariesCache | null> {
  try {
    return JSON.parse(await fs.readFile(CACHE_FILE, 'utf-8')) as SummariesCache;
  } catch {
    return null;
  }
}

async function saveCache(cache: SummariesCache): Promise<void> {
  await fs.mkdir(path.dirname(CACHE_FILE), { recursive: true });
  await fs.writeFile(CACHE_FILE, JSON.stringify(cache, null, 2));
}

async function getPlainText(markdown: string): Promise<string> {
  const result = await remark().use(strip).process(markdown);
  return String(result)
    .replace(/^import\s+.*$/gm, '')
    .replace(/^export\s+.*$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

async function isApiRunning(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}models`);
    return response.ok;
  } catch {
    return false;
  }
}

async function generateSummary(text: string, model: string): Promise<string> {
  const truncatedText = text.slice(0, 6000);
  const { text: summary } = await generateText({
    apiKey: API_KEY,
    baseURL: API_BASE_URL,
    model,
    messages: [
      {
        role: 'system',
        content:
          'あなたは記事要約アシスタントです。日本語で、2〜3文で記事の核心を簡潔に要約してください。要約のみを出力し、前置きや解説は含めないでください。',
      },
      {
        role: 'user',
        content: `次の記事を要約してください：\n\n${truncatedText}`,
      },
    ],
    temperature: 0.3,
    maxTokens: 200,
  });
  if (!summary) throw new Error('LLM レスポンスが空でした');
  return summary.trim();
}

async function readPostForSummary(filePath: string): Promise<PostData | null> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const { data: frontmatter, content: body } = matter(content);
    if (frontmatter.draft === true) return null;
    if (!frontmatter.title) return null;

    const slug = filePath
      .replace(/^src\/content\/blog\//, '')
      .replace(/\.md$/, '')
      .toLowerCase();

    const plainText = await getPlainText(body);
    return {
      slug,
      title: frontmatter.title as string,
      text: plainText,
      hash: computeHash(content),
    };
  } catch (error) {
    console.error(`  Error processing ${filePath}:`, error);
    return null;
  }
}

async function main() {
  const startTime = Date.now();
  const { model, force } = parseArgs();

  try {
    console.log('=== AI Summary Generator ===\n');
    console.log(`Model: ${model}`);

    const apiRunning = await isApiRunning();
    if (!apiRunning) {
      console.log(`\nLLM API が未起動です (${API_BASE_URL})。summary なしで続行します。`);
      console.log('LM Studio / Ollama 等を起動してから再実行してください。');
      // 出力ファイルを空で用意してビルドをブロックしない
      await fs.mkdir(path.dirname(OUTPUT_FILE), { recursive: true });
      await fs.writeFile(OUTPUT_FILE, '{}\n');
      return;
    }
    console.log('API connected!\n');

    let cache = force ? null : await loadCache();
    if (cache && (cache.version !== CACHE_VERSION || cache.model !== model)) {
      console.log('Cache invalidated (model changed), will regenerate all\n');
      cache = null;
    }

    const files = await glob(CONTENT_GLOB);
    if (!files.length) {
      console.log('No content files found.');
      return;
    }
    console.log(`Found ${files.length} markdown files\n`);

    const posts: PostData[] = [];
    for (const file of files) {
      const post = await readPostForSummary(file);
      if (post) posts.push(post);
    }
    if (!posts.length) {
      console.log('No valid posts found.');
      return;
    }
    console.log(`Loaded ${posts.length} posts\n`);

    const validCache = cache?.entries ?? {};
    const newEntries: Record<string, CacheEntry> = {};
    let cached = 0;
    let generated = 0;
    let errors = 0;

    for (let i = 0; i < posts.length; i++) {
      const post = posts[i];
      const cachedEntry = validCache[post.slug];

      if (cachedEntry && cachedEntry.hash === post.hash) {
        newEntries[post.slug] = cachedEntry;
        cached++;
        process.stdout.write(`\r  [${i + 1}/${posts.length}] cached: ${post.slug.slice(0, 40)}...`);
      } else {
        process.stdout.write(
          `\r  [${i + 1}/${posts.length}] generating: ${post.slug.slice(0, 40)}...`,
        );
        try {
          const summary = await generateSummary(post.text, model);
          newEntries[post.slug] = {
            hash: post.hash,
            title: post.title,
            summary,
            generatedAt: new Date().toISOString(),
          };
          generated++;
        } catch (error) {
          console.log('');
          console.error(`  Error generating summary for ${post.slug}:`, error);
          errors++;
          if (cachedEntry) newEntries[post.slug] = cachedEntry;
        }
      }
    }

    console.log('');
    console.log(`  Cached: ${cached}, Generated: ${generated}, Errors: ${errors}`);

    await saveCache({ version: CACHE_VERSION, model, entries: newEntries });

    // ページ表示用の出力 ({ slug: { title, summary } })
    const output: Record<string, SummaryData> = {};
    for (const [slug, entry] of Object.entries(newEntries)) {
      output[slug] = { title: entry.title, summary: entry.summary };
    }
    await fs.mkdir(path.dirname(OUTPUT_FILE), { recursive: true });
    await fs.writeFile(OUTPUT_FILE, JSON.stringify(output, null, 2));

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(
      `\nDone! Generated summaries for ${Object.keys(newEntries).length} posts in ${elapsed}s`,
    );
    console.log(`Output saved to: ${OUTPUT_FILE}`);
  } catch (error) {
    console.error('\nError:', error);
    process.exitCode = 1;
  }
}

main();
