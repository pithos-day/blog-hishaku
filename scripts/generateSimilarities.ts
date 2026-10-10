/**
 * 類似記事生成スクリプト
 *
 * src/content/blog/ の全記事から TF-IDF ベクトルを構築し、
 * コサイン類似度で各記事の類似記事上位を .cache/similarities.json に保存する。
 *
 * 使い方: pnpm tsx scripts/generateSimilarities.ts
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { glob } from 'glob';
import matter from 'gray-matter';
import { remark } from 'remark';
import strip from 'strip-markdown';

const CONTENT_GLOB = 'src/content/blog/**/*.md';
const OUTPUT_FILE = '.cache/similarities.json';
const TOP_N = 5;

interface PostData {
  slug: string;
  title: string;
  tokens: string[];
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

/** 日本語+英語混在テキストをトークン化 (英単語 + CJK 文字 n-gram) */
function tokenize(text: string): string[] {
  const tokens: string[] = [];
  const lower = text.toLowerCase();

  // 英単語 (2文字以上)
  for (const m of lower.matchAll(/[a-z][a-z0-9_]{1,}/g)) {
    tokens.push(m[0]);
  }

  // CJK 文字を bigram に分割
  const cjkChars = [...lower].filter((ch) => /[぀-ヿ㐀-鿿豈-﫿]/.test(ch));
  for (let i = 0; i < cjkChars.length - 1; i++) {
    tokens.push(cjkChars[i] + cjkChars[i + 1]);
  }

  return tokens;
}

function computeTfIdf(docTokens: string[][], vocab: string[]): number[][] {
  const N = docTokens.length;
  const df = new Map<string, number>();
  for (const tokens of docTokens) {
    const unique = new Set(tokens);
    for (const t of unique) {
      df.set(t, (df.get(t) ?? 0) + 1);
    }
  }

  return docTokens.map((tokens) => {
    const tf = new Map<string, number>();
    for (const t of tokens) {
      tf.set(t, (tf.get(t) ?? 0) + 1);
    }
    const vector = new Array(vocab.length).fill(0);
    vocab.forEach((term, i) => {
      const termFreq = tf.get(term) ?? 0;
      if (termFreq === 0) return;
      const idf = Math.log(N / (df.get(term) ?? 1));
      vector[i] = (termFreq / tokens.length) * idf;
    });
    return vector;
  });
}

function cosine(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

async function processFile(filePath: string): Promise<PostData | null> {
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
    // タイトル + タグ + カテゴリ + 本文を結合してトークン化
    const tags = Array.isArray(frontmatter.tags) ? frontmatter.tags.join(' ') : '';
    const categories = Array.isArray(frontmatter.categories)
      ? frontmatter.categories.join(' ')
      : '';
    const combined = `${frontmatter.title} ${tags} ${categories} ${plainText}`;

    return { slug, title: frontmatter.title as string, tokens: tokenize(combined) };
  } catch (error) {
    console.error(`  Error processing ${filePath}:`, error);
    return null;
  }
}

async function main() {
  const startTime = Date.now();
  try {
    console.log('=== Similar Posts Generator ===\n');

    const files = await glob(CONTENT_GLOB);
    if (!files.length) {
      console.log('No content files found.');
      return;
    }
    console.log(`Found ${files.length} markdown files\n`);

    const posts: PostData[] = [];
    for (const file of files) {
      const post = await processFile(file);
      if (post) posts.push(post);
    }
    if (posts.length < 2) {
      console.log('Need at least 2 posts for similarity.');
      return;
    }
    console.log(`Loaded ${posts.length} posts\n`);

    // 語彙構築 (出現回数 >= 2 のみ)
    const df = new Map<string, number>();
    for (const post of posts) {
      for (const t of new Set(post.tokens)) {
        df.set(t, (df.get(t) ?? 0) + 1);
      }
    }
    const vocab = [...df.keys()].filter((t) => (df.get(t) ?? 0) >= 2);
    console.log(`Vocabulary size: ${vocab.length}\n`);

    // TF-IDF ベクトル
    const vectors = computeTfIdf(
      posts.map((p) => p.tokens),
      vocab,
    );

    // コサイン類似度で類似記事を計算
    const similarities: Record<string, Array<{ slug: string; title: string; score: number }>> = {};
    for (let i = 0; i < posts.length; i++) {
      const scores: Array<{ slug: string; title: string; score: number }> = [];
      for (let j = 0; j < posts.length; j++) {
        if (i === j) continue;
        const sim = cosine(vectors[i], vectors[j]);
        if (sim > 0) {
          scores.push({
            slug: posts[j].slug,
            title: posts[j].title,
            score: Math.round(sim * 1000) / 1000,
          });
        }
      }
      scores.sort((a, b) => b.score - a.score);
      similarities[posts[i].slug] = scores.slice(0, TOP_N);
      process.stdout.write(
        `\r  Processing ${i + 1}/${posts.length}: ${posts[i].slug.slice(0, 40)}...`,
      );
    }

    console.log('');

    await fs.mkdir(path.dirname(OUTPUT_FILE), { recursive: true });
    await fs.writeFile(OUTPUT_FILE, `${JSON.stringify(similarities, null, 2)}\n`);

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\nDone! Generated similarities for ${posts.length} posts in ${elapsed}s`);
    console.log(`Output saved to: ${OUTPUT_FILE}`);
  } catch (error) {
    console.error('\nError:', error);
    process.exitCode = 1;
  }
}

main();
