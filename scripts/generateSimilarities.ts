/**
 * 類似記事生成スクリプト (意味的類似度)
 *
 * @huggingface/transformers (transformers.js) で intfloat/multilingual-e5-small を
 * ローカル推論し、各記事の埋め込みベクトルからコサイン類似度上位を
 * .cache/similarities.json に保存する。@astro-pithos と同一の仕組み。
 *
 * - 埋め込み入力: タイトル + (frontmatter.description or 本文冒頭500字)
 * - モデル重みは .cache/transformers/ にキャッシュ (初回のみダウンロード)
 *
 * 使い方:
 *   pnpm generate:similarities
 *   pnpm generate:similarities --device gpu
 */

import fs from 'node:fs/promises';
import {
  type DeviceType,
  env,
  type FeatureExtractionPipeline,
  pipeline,
} from '@huggingface/transformers';
import { glob } from 'glob';
import matter from 'gray-matter';
import { writeCacheJson } from '../src/lib/cache';
import type { SimilarPost } from '../src/lib/similar-posts';
import { toPlainText } from '../src/lib/text';
import { parseCliArgs, runMain } from './cli';

const CONTENT_GLOB = 'src/content/blog/**/*.md';
const OUTPUT_FILE = '.cache/similarities.json';
const TOP_N_SIMILAR = 5;
const MODEL_NAME = 'intfloat/multilingual-e5-small';

// frontmatter.description が無い記事の埋め込み入力に使う本文の文字数
const BODY_SNIPPET_LENGTH = 500;

// モデル重みのローカルキャッシュ
env.cacheDir = './.cache/transformers';

interface PostData {
  slug: string;
  title: string;
  text: string;
}

type SimilarityMap = Record<string, SimilarPost[]>;

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
  const { device } = parseCliArgs(
    argv,
    { device: { type: 'string', default: 'cpu' } },
    'Usage: pnpm generate:similarities [--device auto|gpu|cpu|wasm]',
  );
  if (!isDeviceType(device)) {
    throw new Error(`Invalid device type: ${device}. Valid: ${VALID_DEVICE_TYPES.join(', ')}`);
  }
  return { device };
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

async function readPostForSimilarity(filePath: string): Promise<PostData | null> {
  try {
    const raw = await fs.readFile(filePath, 'utf-8');
    const { data: frontmatter, content } = matter(raw);
    if (frontmatter.draft === true) return null;
    if (!frontmatter.title) return null;
    // 類似度計算から除外する記事
    if (frontmatter.excludeFromSimilarities === true) return null;

    const slug = extractSlug(filePath, frontmatter.link as string | undefined);
    const description =
      (frontmatter.description as string) || toPlainText(content).slice(0, BODY_SNIPPET_LENGTH);
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

runMain(async () => {
  const { device } = parseArgs();
  console.log('=== Semantic Similarity Generator ===\n');
  console.log(`Model: ${MODEL_NAME}`);
  console.log(`Input: title + description/body snippet`);
  console.log(`Device: ${device}\n`);

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
    const post = await readPostForSimilarity(file);
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

  await writeCacheJson(OUTPUT_FILE, similarities);

  return {
    done: `Done! Generated similarities for ${posts.length} posts`,
    after: () => {
      console.log(`Output saved to: ${OUTPUT_FILE}`);
    },
  };
});
