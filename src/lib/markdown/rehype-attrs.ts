/**
 * rehype プラグイン: Shoka 属性構文
 *
 * 1. インライン: [text]{.class1 #id key=value} → <span class="..." id="...">text</span>
 * 2. ブロック:  本文が {.class} だけの段落 → 直前の要素へ属性を付与して除去
 * 3. リスト項目: li の末尾 {...} → <li> 自身へ属性を付与
 */
import type { Element, ElementContent, Root, RootContent, Text } from 'hast';
import { visit } from 'unist-util-visit';
import { TRAILING_ATTR_PATTERN } from './attr-tokens';

/** `{.class1 .class2 #id key=value}` をプロパティへ展開する */
function parseAttrs(attrStr: string): Record<string, string> {
  const props: Record<string, string> = {};
  const classes: string[] = [];

  const tokenRegex = /\.([a-zA-Z0-9_-]+)|#([a-zA-Z0-9_-]+)|([a-zA-Z0-9_-]+)=(?:"([^"]*)"|(\S+))/g;
  for (let match = tokenRegex.exec(attrStr); match !== null; match = tokenRegex.exec(attrStr)) {
    if (match[1]) {
      classes.push(match[1]);
    } else if (match[2]) {
      props.id = match[2];
    } else if (match[3]) {
      // イベントハンドラ属性 (onclick 等) は許可しない
      if (match[3].toLowerCase().startsWith('on')) continue;
      props[match[3]] = match[4] ?? match[5] ?? '';
    }
  }

  if (classes.length > 0) props.class = classes.join(' ');
  return props;
}

/** 属性を要素へ適用する (class は既存値と連結) */
function applyAttrs(element: Element, attrs: Record<string, string>) {
  element.properties = element.properties || {};
  for (const [key, value] of Object.entries(attrs)) {
    if (key === 'class') {
      const existing = element.properties.class;
      const existingStr = Array.isArray(existing) ? existing.join(' ') : (existing ?? '');
      element.properties.class = existingStr ? `${existingStr} ${value}` : value;
    } else {
      element.properties[key] = value;
    }
  }
}

/**
 * `children` を後ろから走査し、最初に現れる要素を返す。
 * 空白のみのテキストは読み飛ばし、空白でないテキストに当たったら中断 (null)。
 */
function findPrevElement(
  children: RootContent[] | ElementContent[],
  fromIndex: number,
): Element | null {
  for (let i = fromIndex; i >= 0; i--) {
    const child = children[i];
    if (child.type === 'element') return child;
    if (child.type === 'text' && child.value.trim() === '') continue;
    break;
  }
  return null;
}

/** 末尾から遡り、最初に現れる非空白ノードを返す (全要素空白なら undefined) */
function findLastMeaningfulChild(children: ElementContent[]): ElementContent | undefined {
  for (let i = children.length - 1; i >= 0; i--) {
    const child = children[i];
    if (child.type === 'text' && child.value.trim() === '') continue;
    return child;
  }
  return undefined;
}

const INLINE_ATTR_REGEX = /\[([^\]]*)\]\{([^}]+)\}/g;
const BLOCK_ATTR_REGEX = /^\{([^}]+)\}$/;

export function rehypeShokaAttrs() {
  return (tree: Root) => {
    // パス 1: 本文が {.class} だけの段落 → 直前の兄弟要素へ適用
    visit(tree, 'element', (node, index, parent) => {
      if (node.tagName !== 'p' || index === undefined || !parent) return;
      if (node.children.length !== 1 || node.children[0].type !== 'text') return;
      const text = node.children[0].value.trim();
      const blockMatch = BLOCK_ATTR_REGEX.exec(text);
      if (!blockMatch) return;

      const attrs = parseAttrs(blockMatch[1]);
      const target = findPrevElement(parent.children, index - 1);
      if (!target) return;
      applyAttrs(target, attrs);
      parent.children.splice(index, 1);
      return index;
    });

    // パス 2: li 末尾と、要素の直後に続くテキスト {...} の属性付与
    visit(tree, 'element', (node) => {
      // li の場合は末尾コンテンツのテキスト {...} を li 自身へ移す
      // (code/pre 等のインライン要素内部は対象外。loose list の <p> 末尾のみ降りる)
      if (node.tagName === 'li') {
        const { children } = node;
        const child = findLastMeaningfulChild(children);

        let textNode: Text | undefined;
        if (child?.type === 'text') {
          textNode = child;
        } else if (
          child?.type === 'element' &&
          child.tagName === 'p' &&
          child.children.length > 0
        ) {
          const lastChild = child.children[child.children.length - 1];
          if (lastChild?.type === 'text') textNode = lastChild as Text;
        }

        if (textNode) {
          const match = textNode.value.match(/\{([^}]+)\}\s*$/);
          if (match) {
            applyAttrs(node, parseAttrs(match[1]));
            textNode.value = textNode.value.slice(0, match.index).trimEnd();
          }
        }
        return;
      }

      const { children } = node;
      for (let i = children.length - 1; i >= 0; i--) {
        const child = children[i];
        if (child.type !== 'text') continue;
        const match = TRAILING_ATTR_PATTERN.exec(child.value);
        if (!match) continue;

        const prevElement = findPrevElement(children, i - 1);
        if (!prevElement) continue;

        applyAttrs(prevElement, parseAttrs(match[1]));
        const remaining = child.value.slice(match[0].length);
        if (remaining) {
          child.value = remaining;
        } else {
          children.splice(i, 1);
        }
      }
    });

    // パス 3: インライン [text]{.class} → <span>
    visit(tree, 'text', (node, index, parent) => {
      if (index === undefined || !parent) return;
      if (!('children' in parent)) return;

      const text = node.value;
      if (!text.includes(']{')) return;

      INLINE_ATTR_REGEX.lastIndex = 0;
      const parts: ElementContent[] = [];
      let lastIndex = 0;
      for (
        let match = INLINE_ATTR_REGEX.exec(text);
        match !== null;
        match = INLINE_ATTR_REGEX.exec(text)
      ) {
        if (match.index > lastIndex) {
          parts.push({ type: 'text', value: text.slice(lastIndex, match.index) });
        }

        const span: Element = {
          type: 'element',
          tagName: 'span',
          properties: {},
          children: [{ type: 'text', value: match[1] }],
        };
        applyAttrs(span, parseAttrs(match[2]));
        parts.push(span);
        lastIndex = match.index + match[0].length;
      }

      if (parts.length === 0) return;
      if (lastIndex < text.length) {
        parts.push({ type: 'text', value: text.slice(lastIndex) });
      }

      (parent as Element).children.splice(index, 1, ...parts);
      return index + parts.length;
    });
  };
}
