# Citation renderer punch list

Updated 2026-10-15. Changes are isolated on `citation-renderer-rebuild`.
Use the dedicated test note; do not edit thesis chapters during debugging.
Do not install dependencies or create a new vault. Verify one cause in the
live application before changing the next cause.

## 1. Page-number links create unintended notes — live verification pending

Observed: a citation such as `[[@Example2020-ab, p. 318]]` formats correctly,
but note navigation treats the locator as part of the filename.

Candidate: keep locator text for citation formatting and use `@Example2020-ab`
for note navigation. Cover formatted editor widgets, raw editor hover/click,
Reading view and rendered callouts, including callout DOM retained on reload.
Preserve ordinary links, aliases, code and modifier-key navigation. Ambiguous
multi-source wikilinks and aliased locator destinations are not reinterpreted.

Local gates: 102 targeted tests pass; production build and JavaScript syntax
check pass. The native event-order regression test reproduced and then passed
for Obsidian's outer capture listener. These are not a substitute for live tests.
The inherited TypeScript declaration/compiler incompatibility remains separate.

User runtime feedback: Reading-view note previews work for normal and locator
wikilinks without a modifier. Editor locator clicks now open the correct note,
but editor hover still reports a page-suffixed filename and rendered citations
have no note preview. These results replace the earlier blanket failure report:
Reading view and click routing are working; editor hover is still pending.

Follow-up source evidence: Reading view retains native anchors; editor widgets
are spans with a click handler but no note-preview destination. The locator
handler also excluded `.pandoc-citation`, which includes marked Source-mode
keys, not only rendered widgets. New regression tests reproduced both gaps.
The hover candidate exposes the widget destination to the public `hover-link`
event and includes raw citekey marks. It preserves the existing widget click
handler and Reading-view implementation. Emitting with source `editor` retains
Obsidian's editor preview modifier preference; Reading view uses `preview` and
can have a different modifier preference. Native popup behaviour remains an
interactive acceptance check, not something established by these unit tests.

Live acceptance (pending):
- [ ] Reload only the citation plugin, without Force Reload of Obsidian.
- [ ] In the test paragraph, confirm the APA text still includes page numbers.
- [ ] Hover a raw locator wikilink: preview the existing source note.
- [ ] Open it in a new tab using the usual modifier; do not create a page-suffixed note.
- [ ] Check Source mode, Live Preview and Reading view, including a callout.
- [ ] Recheck aliases, code, ordinary links and mode/scroll stability.

## 2. New bibliography sources after Git pull — diagnosis pending

Observed: Obsidian previews the linked note, but the citation plugin reports
no citation until Force Reload.

Source evidence: both bibliography watchers reload on `change`, but close the
watcher on another event without rearming it. Atomic file replacement is a
candidate explanation; actual Git-pull events have not been captured. An
isolated sandbox file-watch probe delivered no events and was inconclusive.
Next gate: observe the configured bibliography file's events during replacement
in a controlled test, then test refresh without restarting or losing position.
Prefer bibliography-file detection over a dependency on the Git plugin.

## 3. Scrollbar flicker while typing in long Live Preview notes — diagnosis pending

Observed: reported in long notes with many citations/callouts, absent in Source.
Source leads: citation widgets compare object identity; refreshed citation
objects can cause replacements even when visible output is unchanged. The
bibliography dispatcher also clears Reading-view renderer sections. Neither
lead is a verified root cause. Measure replacement counts and scroll metrics
in the dedicated test note before changing either behaviour.

## 4. Locator citation colour differs inside rendered callouts — cosmetic

Observed: locator citations blue in rendered `[!done]` callouts, green while
editing; regular blockquotes/body text stay green. Compare anchor versus
widget CSS in the same theme. Do not change themes or general link styles.

## 5. Plain Pandoc citation forms lack wiki-link styling/navigation — enhancement

Grouped, suppressed-author, narrative and locator forms format but do not all
behave as Obsidian wikilinks. Decide navigation behaviour explicitly before
implementation: a multi-source group has no single unambiguous destination.

## 6. Coloured highlight in an unused theme — deferred

Reported `==🟣text==` wrapping/colour issue in one unused theme. User requested
no investigation. Theme identity and reproduction are not available.

## Separate rebuild backlog

Alias-only bibliography inclusion and compiler/dependency compatibility remain
outside this sequence of reported runtime repairs. Do not silently combine
them with the rendering repair PR.
