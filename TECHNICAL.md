# Technical Plan for Inline Citation Processing in Obsidian Pandoc Plugin

**Feature**: Ignore aliased citation links so Obsidian renders the alias natively; continue Pandoc-style rendering for non-aliased citation links.  
**Branch**: `feature-ignore-aliased-links`  
**Date**: 2025-09-07  
**Owner**: sjelms / plugin maintainer

This document outlines the technical plan for implementing inline citation processing in the Obsidian Pandoc Inline Citations plugin. The goal is to detect and transform citation keys within markdown content to a format compatible with Pandoc's citation syntax.

---

## File to Update
- `main.ts`

---

## 1. Scope

- Maintain current plugin behavior for **non-aliased** citation links:
  - `[[@Klein2022-xj]]` → `(Klein 2022)` (Pandoc-style)
- Bypass the plugin for **aliased** citation links:
  - `[[@Klein2022-xj|Why Housing Is So Expensive]]` → `Why Housing Is So Expensive` (Obsidian native alias rendering)
- Citation key grammar (vault-wide invariant): `@SurnameYYYY-xx` (e.g., `[[@Doe2022-gs]]`)

---

## 2. Files to Update

- `src/markdownPostprocessor.ts` (primary)
- (Optional) test scaffolding in your repo’s test directory, if present

---

## 3. Imports & Dependencies

- `MarkdownPostProcessorContext` from `obsidian`
- `ReferenceList` (plugin main class)
- Uses plugin’s `bibManager.fileCache` for key lookups and `references` for HTML snippets

---

## 4. Regex Rule

- **Match only citation links without aliases**; i.e., match `[[@…]]` **that do not contain** a `|` before `]]`.
- Robust pattern that captures the key while excluding alias pipes:

```ts
const CITEKEY_LINK_REGEX = /\[\[@([^|\]]+?)\]\]/g;
```

- Examples:
  - Matches: `[[@Klein2022-xj]]`, `[[@Doe2022-gs]]`
  - Skips:   `[[@Klein2022-xj|Why Housing Is So Expensive]]`

---

# 5. Proposed Implementation (Drop-in)

> **Notes:**
> - This mirrors your approach (string replace on `innerHTML`) for a quick, surgical change.
> - It preserves behavior for non-aliased citations and lets Obsidian render aliased ones.
> - It also rewrites the internal `href` fragment to point back into the current file.
> —

```ts
import { MarkdownPostProcessorContext } from 'obsidian';
import ReferenceList from './main';

// Match only citation links without aliases; i.e., no '|' before closing ']]'.
// Examples that should match:  [[@Klein2022-xj]], [[@Doe2022-gs]]
// Examples that should NOT match:  [[@Klein2022-xj|Why Housing Is So Expensive]]
const CITEKEY_LINK_REGEX = /\[\[@([^|\]]+?)\]\]/g;

export const processCiteKeys =
  (plugin: ReferenceList) =>
  async (el: HTMLElement, ctx: MarkdownPostProcessorContext) => {
    const file = plugin.app.vault.getAbstractFileByPath(ctx.sourcePath);
    if (!file) return;

    const cache = plugin.bibManager.fileCache.get(file);
    if (!cache) return;

    const newHtml = el.innerHTML.replace(CITEKEY_LINK_REGEX, (match, key) => {
      if (cache.keys.has(key)) {
        const reference = cache.references.get(key);
        if (reference) {
          // Ensure the link within the citation points to the correct section in the current file.
          // This assumes reference.html contains an <a ... href="#some-fragment">…</a>.
          return reference.html.replace(
            /(href=")(#[\w\d-]+)/,
            `$1${ctx.sourcePath}$2`,
          );
        }
      }
      // If not found or unresolved, return original to avoid breaking links/render.
      return match;
    });

    el.innerHTML = newHtml;
  };
```

---

## 6. Error Handling

- If `file` or `cache` is absent: **return silently** (render unchanged).
- If a key is not present in `cache.keys`: leave original text intact (signals a useful failure for you to spot and correct BibTeX/typos).
- Never throw in the postprocessor; rendering must degrade gracefully.

---

## 7. Testing & Success Criteria

**Test Note Setup**
- Include at least five cases:
  1. `[[@Klein2022-xj]]` (non-alias)
  2. `[[@Doe2022-gs]]` (non-alias)
  3. `[[@Klein2022-xj|Why Housing Is So Expensive]]` (alias)
  4. `[[@Doe2022-gs|Short]]` (alias, short)
  5. A line with no citations

### Acceptance Scenarios
1. **Given** a note with `[[@Klein2022-xj]]`,  
   **When** the plugin renders it,  
   **Then** it should appear as `(Klein 2022)` in reading/preview mode.  

2. **Given** a note with `[[@Klein2022-xj|Why Housing Is So Expensive]]`,  
   **When** the plugin encounters it,  
   **Then** it should **not process the link** and allow Obsidian’s native renderer to display the alias as `Why Housing Is So Expensive`.  

**Views**
- Validate in **Live Preview** and **Reading View**.
- Confirm no disruption to other inline widgets (if using DOM-safe variant).

---

## 8. Future Enhancements (Optional)

- Config flag to **force Pandoc rendering even for aliased links** (default: off).
- Telemetry/logging toggle for unmatched keys to aid debugging.
- Unit tests around the postprocessor with representative HTML fixtures.
- DOM-Safe Alternative

---

## DOM-Safe Alternative (Recommended for Long-Term Robustness)

> Rationale: Mutating `el.innerHTML` can disrupt Obsidian widgets and event listeners.  
> This variant walks text nodes, applies replacements only where necessary, and leaves other nodes intact.

```ts
import { MarkdownPostProcessorContext } from 'obsidian';
import ReferenceList from './main';

const CITEKEY_LINK_REGEX = /\[\[@([^|\]]+?)\]\]/g;

function replaceInTextNode(
  node: Text,
  replacer: (full: string, key: string) => string
) {
  const text = node.nodeValue ?? '';
  if (!CITEKEY_LINK_REGEX.test(text)) return;

  const span = document.createElement('span');
  let lastIndex = 0;
  CITEKEY_LINK_REGEX.lastIndex = 0;

  let match: RegExpExecArray | null;
  while ((match = CITEKEY_LINK_REGEX.exec(text)) !== null) {
    const [full, key] = match;
    // append preceding text
    if (match.index > lastIndex) {
      span.appendChild(document.createTextNode(text.slice(lastIndex, match.index)));
    }
    // append replacement as HTML
    const html = replacer(full, key);
    const tmp = document.createElement('span');
    tmp.innerHTML = html;
    while (tmp.firstChild) span.appendChild(tmp.firstChild);
    lastIndex = match.index + full.length;
  }
  // append trailing text
  if (lastIndex < text.length) {
    span.appendChild(document.createTextNode(text.slice(lastIndex)));
  }
  node.replaceWith(span);
}

export const processCiteKeys =
  (plugin: ReferenceList) =>
  async (el: HTMLElement, ctx: MarkdownPostProcessorContext) => {
    const file = plugin.app.vault.getAbstractFileByPath(ctx.sourcePath);
    if (!file) return;

    const cache = plugin.bibManager.fileCache.get(file);
    if (!cache) return;

    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const textNodes: Text[] = [];
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      textNodes.push(n as Text);
    }

    const replacer = (full: string, key: string) => {
      if (cache.keys.has(key)) {
        const reference = cache.references.get(key);
        if (reference) {
          return reference.html.replace(
            /(href=")(#[\w\d-]+)/,
            `$1${ctx.sourcePath}$2`,
          );
        }
      }
      return full; // leave unmatched as-is
    };

    for (const node of textNodes) {
      replaceInTextNode(node, replacer);
    }
  };
```

---
