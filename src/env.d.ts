declare module '*?raw' {
  const content: string;
  export default content;
}

declare module 'wawoff2/decompress.js' {
  /** woff2 を TTF/OTF (sfnt) に展開する */
  export default function decompress(buffer: Uint8Array): Promise<Uint8Array>;
}
