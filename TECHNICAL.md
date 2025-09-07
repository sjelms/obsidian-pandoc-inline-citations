# Technical Plan for Inline Citation Processing in Obsidian Pandoc Plugin

**Feature**: Ignore aliased citation links so Obsidian renders the alias natively; continue Pandoc-style rendering for non-aliased citation links.  
**Branch**: `feature-ignore-aliased-links`  
**Date**: 2025-09-07  
**Owner**: sjelms / plugin maintainer

This document describes the current design and the change we implemented to make Live Preview treat aliased wikilinks exactly like Obsidian (leave the alias text intact), while continuing to render non-aliased citations using CSL/Pandoc output.

---

## 1. Scope

- Non-aliased wikilinks are rendered as inline citations:
  - `[[@Klein2022-xj]]` → `(Klein 2022)`
- Aliased wikilinks are bypassed so Obsidian renders the alias text:
  - `[[@Klein2022-xj|Why Housing Is So Expensive]]` → `Why Housing Is So Expensive`
- Standard Pandoc citations (e.g., `[@key]`, groups, locators) remain supported and unchanged.
- Citation key grammar (vault-wide invariant): `@SurnameYYYY-xx` (e.g., `[[@Doe2022-gs]]`).

---

## 2. Files Updated

- `src/parser/parser.ts` (primary): add detection for aliased wikilinks and skip them during parsing.
- No changes required in `src/markdownPostprocessor.ts` (continues DOM-safe rendering of parsed segments).

---

## 3. Implementation

- Added a new parser state flag: `inLinkHasAlias` to track whether a `[[...]]` wikilink contains a `|`.
- While inside a wikilink (`state.inLink === true`), encountering `|` sets `state.inLinkHasAlias = true`.
- When the wikilink closes (`]]`), if `state.inLink && state.inLinkHasAlias`, the parser discards the entire bracketed segment and does not emit citation segments for it. This prevents downstream formatting and preserves the alias.
- We also continue to honor `ignoreLinks` for other link contexts. Aliased links are skipped regardless of that flag.

Effect:
- Live Preview and Reading View now leave `[[@key|Alias]]` untouched, while still rendering `[[@key]]` and Pandoc-style inline citations.

---

## 4. Error Handling

- If no file cache or no citations exist, rendering degrades gracefully (unchanged text).
- If a citekey is unresolved, it remains visibly unresolved using existing styles and tooltips.
- Parser-level skip avoids touching nodes for aliased wikilinks, preventing corruption of alias text.

---

## 5. Testing & Success Criteria

Test Note Setup (examples retained):
1. `[[@Klein2022-xj]]` (non-alias)
2. `[[@Doe2022-gs]]` (non-alias)
3. `[[@Klein2022-xj|Why Housing Is So Expensive]]` (alias)
4. `[[@Doe2022-gs|Short]]` (alias, short)
5. A line with no citations

Acceptance Scenarios
1. Given a note with `[[@Klein2022-xj]]`, when the plugin renders it, then it appears as `(Klein 2022)` in Live Preview and Reading View.
2. Given a note with `[[@Klein2022-xj|Why Housing Is So Expensive]]`, when the plugin encounters it, then it is not processed by the plugin and Obsidian displays the alias text exactly.

Views
- Validate in Live Preview and Reading View. Confirm aliased links match Obsidian’s native rendering with the plugin disabled.

---

## 6. Future Enhancements (Optional)

- Config flag to force Pandoc rendering even for aliased links (default: off).
- Parser test for `[[@nonexistent|Alias]]` to assert no segments are produced (integration test at postprocessor level optional).
- Telemetry/logging toggle for unmatched keys to aid debugging.

---
