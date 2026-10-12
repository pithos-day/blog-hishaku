/**
 * `astro:content` のテスト用スタブ。
 *
 * 本来は Vite の仮想モジュールで、Node からは読めない。
 * テスト対象は純粋なヘルパ (カテゴリ整形・カレンダー組み立て等) のため、
 * コレクションは常に空で返してコンテンツ側には依存しない。
 */
export async function getCollection() {
  return [];
}

export async function render() {
  throw new Error('astro:content の render() はテスト対象外');
}
