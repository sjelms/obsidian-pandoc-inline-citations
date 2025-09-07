# Feature Specification: Aliased Citation Handling

**Feature Branch**: merged (implemented on main)  
**Created**: 2025-09-07  
**Status**: Implemented  
**Input**: User description: "Ensure the plugin renders standard citations with Pandoc-style output but skips aliased citations so Obsidian handles them natively."

---

## Execution Flow (main)
```markdown
1. Parse user description from Input
   → Success: clear request to differentiate aliased vs non-aliased citations
2. Extract key concepts from description
   → Actors: Obsidian user, plugin
   → Actions: render citation links, bypass alias links
   → Data: citation keys, alias text
   → Constraints: alias always indicated by `|`
3. Clarify unclear aspects
   → Citation keys follow the vault convention and are generated from BibTeX.
   → Aliased citations always bypass Pandoc/CSL rendering, even if the alias is short (e.g., "ibid.").
4. User Scenarios & Testing section: defined below
5. Functional Requirements: testable items listed
6. Entities: citation key, alias, reference cache
7. Review Checklist: some clarifications remain
```

---

## ⚡ Quick Guidelines
- ✅ Focused on user needs (clean, legible rendering of citations)
- ✅ Avoids HOW (no code or regex in this section)
- 👥 Written for plugin stakeholders (users, maintainers)

---

## User Scenarios & Testing *(mandatory)*

### Primary User Story
As a researcher writing in Obsidian,  
I want standard citations to render as Pandoc-formatted references,  
and aliased citations to render using Obsidian’s native alias handling,  
so that my notes remain clean, legible, and consistent.

### Acceptance Scenarios
1. **Given** a note with `[[@Klein2022-xj]]`,  
   **When** the plugin renders it,  
   **Then** it appears as `(Klein 2022)` in both Live Preview and Reading View.  

2. **Given** a note with `[[@Klein2022-xj|Why Housing Is So Expensive]]`,  
   **When** the plugin encounters it,  
   **Then** it does not process the link and Obsidian’s native renderer displays the alias text `Why Housing Is So Expensive` (unchanged), in both Live Preview and Reading View.  

### Edge Cases
- Citation keys are always formatted in the specified way and generated from BibTeX.  
- Malformed links should not occur, but if they do, it is helpful for debugging purposes.  
- Obsidian does not support nested or multiple aliases and it is not required to support them.  

---

## Requirements *(mandatory)*

### Functional Requirements
- **FR-001**: System MUST render non-aliased citations (`[[@citekey]]`) as Pandoc-style references (Author Year).  
- **FR-002**: System MUST ignore aliased citations (`[[@citekey|Alias]]`) and allow Obsidian’s renderer to display the alias text.  
- **FR-003**: System MUST NOT corrupt or alter the alias text provided by the user.  
- **FR-004**: System MUST handle malformed citation links gracefully (e.g., log or ignore, without breaking rendering).  
- **FR-005**: System SHOULD support citekeys containing hyphens; citekeys never contain underscores or colons.  
- **FR-006**: Behavior MUST apply consistently in both Live Preview and Reading View.  

### Key Entities
- **Citation Key**: Identifier beginning with `@`, used to match against bibliography cache.  
- **Alias Text**: User-specified display text after a `|` in Obsidian links.  
- **Reference Cache**: Plugin’s store of citation metadata (used for Pandoc rendering).  

---

## Review & Acceptance Checklist

### Content Quality
- [x] No implementation details  
- [x] Focused on user value  
- [x] Written for non-technical stakeholders  
- [x] All mandatory sections completed  

### Requirement Completeness
- [x] No [NEEDS CLARIFICATION] markers remain  
- [x] Requirements are testable and unambiguous  
- [x] Success criteria are measurable  
- [x] Scope is clearly bounded  
- [x] Dependencies and assumptions identified  

---

## Execution Status
- [x] User description parsed  
- [x] Key concepts extracted  
- [x] Ambiguities resolved  
- [x] User scenarios defined  
- [x] Requirements generated  
- [x] Entities identified  
- [x] Review checklist passed  

---

## Decision Record

- Decision: Skip aliased wikilinks during citation parsing so Obsidian renders the alias text natively; continue rendering non-aliased citations with CSL/Pandoc output.
- Rationale: Ensures Live Preview matches Reading View and native Obsidian behavior for `[[...|alias]]` while preserving rich citation features for non-aliased citations.
- Implementation Notes: See TECHNICAL.md for parser changes and details.

For technical details, see: [TECHNICAL.md](TECHNICAL.md)

---
