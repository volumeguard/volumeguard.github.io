import { $$ } from './dom';

/**
 * Splits `[data-split]` headings into masked characters so CSS can slide them in one by one.
 * Screen readers keep the original text through aria-label; the pieces are hidden from them.
 */
export function splitHeadings(scope: ParentNode = document): void {
  for (const el of $$('[data-split]', scope)) {
    if (el.dataset.splitDone) continue;
    el.dataset.splitDone = '1';
    el.setAttribute('aria-label', (el.textContent ?? '').replace(/\s+/g, ' ').trim());
    let index = 0;

    const walk = (node: Node): void => {
      for (const child of Array.from(node.childNodes)) {
        if (child.nodeType === Node.TEXT_NODE) {
          const fragment = document.createDocumentFragment();
          for (const part of (child.textContent ?? '').split(/(\s+)/)) {
            if (!part) continue;
            if (/^\s+$/.test(part)) {
              fragment.append(' ');
              continue;
            }
            const word = document.createElement('span');
            word.className = 'w';
            word.setAttribute('aria-hidden', 'true');
            for (const char of part) {
              const mask = document.createElement('span');
              mask.className = 'mask';
              const glyph = document.createElement('span');
              glyph.className = 'c';
              glyph.textContent = char;
              glyph.style.setProperty('--i', String(index++));
              mask.append(glyph);
              word.append(mask);
            }
            fragment.append(word);
          }
          child.replaceWith(fragment);
        } else if (child.nodeType === Node.ELEMENT_NODE) {
          walk(child);
        }
      }
    };
    walk(el);
  }
}
