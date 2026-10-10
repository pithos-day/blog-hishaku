/**
 * 類似記事生成スクリプト (意味的類似度)
 *
 * @huggingface/transformers (transformers.js) で intfloat/multilingual-e5-small を
 * ローカル推論し、各記事の埋め込みベクトルからコサイン類似度上位を
 * .cache/similarities.json に保存する。@astro-pithos と同一の仕組み。
 *
 * - 埋め込み入力: タイトル + (AI要約 or frontmatter.description)
 *   AI要約が有効な場合は .cache/summaries.json を優先使用 (pnpm generate:summaries)
 * - モデル重みは .cache/transformers/ にキャッシュ (初回のみダウンロード)
 *
 * 使い方:
 *   pnpm generate:similarities
 *   pnpm generate:similarities --device gpu
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import {
  type DeviceType,
  env,
  type FeatureExtractionPipeline,
  pipeline,
} from '@huggingface/transformers';
import { glob } from 'glob';
import matter from 'gray-matter';

const CONTENT_GLOB = 'src/content/blog/**/*.md';
const OUTPUT_FILE = '.cache/similarities.json';
const TOP_N_SIMILAR = 5;
const MODEL_NAME = 'intfloat/multilingual-e5-small';

// AI要約を類似度計算の入力に使うか (.cache/summaries.json を優先)
const USE_AI_SUMMARY = true;
const SUMMARIES_FILE = '.cache/summaries.json';

// モデル重みのローカルキャッシュ
env.cacheDir = './.cache/transformers';

interface PostData {
  slug: string;
  title: string;
  text: string;
}

interface SimilarPost {
  slug: string;
  title: string;
  similarity: number;
}

type SimilarityMap = Record<string, SimilarPost[]>;

type SummariesMap = Record<string, { title: string; summary: string }>;

const VALID_DEVICE_TYPES: DeviceType[] = [
  'auto',
  'gpu',
  'cpu',
  'wasm',
  'webgpu',
  'cuda',
  'dml',
  'webnn',
  'webnn-npu',
  'webnn-gpu',
  'webnn-cpu',
];

function isDeviceType(value: string): value is DeviceType {
  return VALID_DEVICE_TYPES.includes(value as DeviceType);
}

function parseArgs(argv: string[] = process.argv.slice(2)): { device: DeviceType } {
  let device: DeviceType = 'cpu';
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--device') {
      const value = argv[i + 1];
      if (!value || !isDeviceType(value)) {
        throw new Error(`Invalid device type: ${value}. Valid: ${VALID_DEVICE_TYPES.join(', ')}`);
      }
      device = value;
      i++;
      continue;
    }
    throw new Error(`Unknown argument: ${argv[i]}`);
  }
  return { device };
}

async function loadSummaries(): Promise<SummariesMap> {
  if (!USE_AI_SUMMARY) return {};
  try {
    return JSON.parse(await fs.readFile(SUMMARIES_FILE, 'utf-8')) as SummariesMap;
  } catch {
    console.log(`Warning: ${SUMMARIES_FILE} が読めません (pnpm generate:summaries を先に実行)`);
    return {};
  }
}

/** L2 正規化 (正規化済みベクトルの内積 = コサイン類似度) */
function normalize(vec: Float32Array): Float32Array {
  const len = Math.hypot(...vec);
  if (!len) return vec;
  return new Float32Array(vec.map((x) => x / len));
}

function dotProduct(a: Float32Array, b: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += a[i] * b[i];
  return sum;
}

function extractSlug(filePath: string, link?: string): string {
  if (link) return link.toLowerCase();
  return filePath
    .replace(/^src\/content\/blog\//, '')
    .replace(/\.md$/, '')
    .toLowerCase();
}

async function processFile(filePath: string, summaries: SummariesMap): Promise<PostData | null> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const { data: frontmatter } = matter(content);
    if (frontmatter.draft === true) return null;
    if (!frontmatter.title) return null;
    // 類似度計算から除外する記事
    if (frontmatter.excludeFromSummary === true) return null;

    const slug = extractSlug(filePath, frontmatter.link as string | undefined);
    const aiSummary = summaries[slug]?.summary;
    const description = aiSummary || (frontmatter.description as string) || '';
    const text = `${frontmatter.title}. ${description}`.slice(0, 8000);

    return { slug, title: frontmatter.title as string, text };
  } catch (error) {
    console.error(`  Error processing ${filePath}:`, error);
    return null;
  }
}

async function generateEmbeddings(
  posts: PostData[],
  extractor: FeatureExtractionPipeline,
): Promise<Float32Array[]> {
  const embeddings: Float32Array[] = [];
  console.log(`Generating embeddings for ${posts.length} posts...`);
  for (let i = 0; i < posts.length; i++) {
    const post = posts[i];
    process.stdout.write(`\r  Processing ${i + 1}/${posts.length}: ${post.slug.slice(0, 40)}...`);
    const output = (await extractor(post.text, {
      pooling: 'mean',
      normalize: false,
    })) as { data: Float32Array };
    embeddings.push(normalize(output.data));
  }
  console.log('\nEmbeddings generated!');
  return embeddings;
}

function computeSimilarities(posts: PostData[], embeddings: Float32Array[]): SimilarityMap {
  const result: SimilarityMap = {};
  for (let i = 0; i < posts.length; i++) {
    const similarities: SimilarPost[] = [];
    for (let j = 0; j < posts.length; j++) {
      if (i === j) continue;
      const similarity = dotProduct(embeddings[i], embeddings[j]);
      similarities.push({
        slug: posts[j].slug,
        title: posts[j].title,
        similarity: Math.round(similarity * 1000) / 1000,
      });
    }
    similarities.sort((a, b) => b.similarity - a.similarity);
    result[posts[i].slug] = similarities.slice(0, TOP_N_SIMILAR);
  }
  return result;
}

async function main() {
  const startTime = Date.now();
  try {
    const { device } = parseArgs();
    console.log('=== Semantic Similarity Generator ===\n');
    console.log(`Model: ${MODEL_NAME}`);
    console.log(`Input: title + description/summary`);
    console.log(`AI Summary: ${USE_AI_SUMMARY ? 'enabled' : 'disabled'}`);
    console.log(`Device: ${device}\n`);

    const summaries = await loadSummaries();
    if (USE_AI_SUMMARY && Object.keys(summaries).length > 0) {
      console.log(`Loaded ${Object.keys(summaries).length} AI summaries\n`);
    }

    console.log(`Loading model: ${MODEL_NAME}...`);
    const extractor = await pipeline('feature-extraction', MODEL_NAME, { device });
    console.log('Model loaded!\n');

    const files = await glob(CONTENT_GLOB);
    if (!files.length) {
      console.log('No content files found.');
      return;
    }
    console.log(`Found ${files.length} markdown files\n`);

    const posts: PostData[] = [];
    for (const file of files) {
      const post = await processFile(file, summaries);
      if (post) posts.push(post);
    }
    if (!posts.length) {
      console.log('No valid posts found.');
      return;
    }
    console.log(`Loaded ${posts.length} posts\n`);

    const embeddings = await generateEmbeddings(posts, extractor);
    if (!embeddings.length) {
      console.log('No embeddings generated.');
      return;
    }

    const similarities = computeSimilarities(posts, embeddings);

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
