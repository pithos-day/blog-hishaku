/**
 * LQIP (Low Quality Image Placeholders) 生成スクリプト
 *
 * public/img/ 配下の画像を sharp で 2x2 リサイズし、4象限の色から
 * コンパクトなグラデーション文字列を生成して .cache/lqips.json に保存する。
 *
 * 使い方: pnpm tsx scripts/generateLqips.ts
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { glob } from 'glob';
import sharp from 'sharp';

const IMAGE_GLOB = 'public/img/**/*.{webp,jpg,jpeg,png,avif,gif}';
const OUTPUT_FILE = '.cache/lqips.json';

interface RgbColor {
  r: number;
  g: number;
  b: number;
}

type LqipMap = Record<string, string>;

function rgbToHex(rgb: RgbColor): string {
  const toHex = (n: number) =>
    Math.round(Math.max(0, Math.min(255, n)))
      .toString(16)
      .padStart(2, '0');
  return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
}

async function processImage(imagePath: string): Promise<string | null> {
  try {
    const resized = await sharp(imagePath)
      .resize(2, 2, { fit: 'fill' })
      .raw()
      .toBuffer({ resolveWithObject: true });

    const channels = resized.info.channels;
    const data = resized.data;

    const colors: string[] = [];
    for (let i = 0; i < 4; i++) {
      const offset = i * channels;
      const rgb: RgbColor = {
        r: data[offset],
        g: data[offset + 1],
        b: data[offset + 2],
      };
      colors.push(rgbToHex(rgb));
    }

    // compact format: 3 hex colors (top-left, top-right, bottom-right) without #
    const compact = `${colors[0].slice(1)}${colors[1].slice(1)}${colors[3].slice(1)}`;
    return compact;
  } catch (error) {
    console.error(`  Error processing ${imagePath}:`, error);
    return null;
  }
}

function filePathToKey(filePath: string): string {
  return filePath.replace(/\\/g, '/').replace(/^public\/img\//, '');
}

async function main() {
  const startTime = Date.now();

  try {
    console.log('=== LQIP Generator ===\n');

    const files = await glob(IMAGE_GLOB);
    if (!files.length) {
      console.log('No image files found.');
      return;
    }
    console.log(`Found ${files.length} images\n`);

    const lqips: LqipMap = {};
    let processed = 0;
    let skipped = 0;

    for (const [index, file] of files.entries()) {
      process.stdout.write(
        `\r  Processing ${index + 1}/${files.length}: ${path.basename(file)}...`,
      );

      const compact = await processImage(file);
      if (compact !== null) {
        const key = filePathToKey(file);
        lqips[key] = compact;
        processed++;
      } else {
        skipped++;
      }
    }

    console.log('');

    const dir = path.dirname(OUTPUT_FILE);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(OUTPUT_FILE, `${JSON.stringify(lqips, null, 2)}\n`);

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\nDone! Generated LQIP for ${processed} images in ${elapsed}s`);
    if (skipped > 0) {
      console.log(`  Skipped: ${skipped} images`);
    }
    console.log(`Output saved to: ${OUTPUT_FILE}`);
  } catch (error) {
    console.error('\nError:', error);
    process.exitCode = 1;
  }
}

main();
