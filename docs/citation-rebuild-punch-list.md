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

## 2. New bibliography sources after Git pull — live verification pending

Observed: Obsidian previews the linked note, but citation resolution requires
Force Reload. A real temporary-file replacement reproduced `rename`, watcher
closure, no refresh, and loss of subsequent updates with the old handler.

Candidate: poll metadata for the bibliography path (default 1 second, plus
150 ms settling), serialize conversion/refresh work, and retain monitoring
across atomic replacement or deletion/recreation. Only the bibliography paths
are monitored; there is no vault scan or Git-plugin dependency. Existing data
is retained if conversion fails; a subsequent valid update refreshes normally.

Seven new tests use real temporary files. The manager integration runs actual
BibTeX conversion with the installed Pandoc and citeproc, verifies previously
unresolved sources become formatted citations, and confirms editor updates
contain effects rather than document edits. All 109 targeted tests pass.
A separate refresh-only build is saved under ignored `plugin-dist` so it can
be tested without combining a scrollbar change.

Live gate: reload only the plugin, add/sync a source through the normal
workflow, and confirm resolution updates after a short delay without Force
Reload or losing note positions. Also verify a source in a rendered callout.
This native runtime check remains pending.

## 3. Scrollbar flicker while typing — native runtime verification pending

Observed: reported in long Live Preview notes with many citations/callouts,
absent in Source mode. A real CodeMirror editor regression fixture containing
60 citation paragraphs reproduced 136 new citation elements across eight
ordinary typing/cache-refresh cycles, despite identical rendered citations.
`CiteWidget.eq` compared cache-object identity rather than output.

Candidate: reuse the widget DOM when rendered text, citation metadata, note
information, source path and link destination are unchanged. Ignore source
offset changes for DOM equality. The same regression now produces zero new
citation elements and retains the original DOM nodes. Changed citation text,
metadata and navigation still invalidate the widget. All 112 targeted tests
pass. The Reading-view renderer and native callout code were not changed.

This demonstrates removal of unnecessary DOM churn; it does not prove the
native scrollbar symptom is fully resolved. Other causes remain possible.

A second build is saved under ignored `plugin-dist/widget-stability-20261015`.
It includes the preceding bibliography refresh commit but is not installed
until the refresh-only build passes its live gate. Then test typing at the
same position in a long test note with citations/callouts and compare scrollbar
and caret stability, retaining correct citation updates and hover/navigation.

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
