import { getCitationSegments, getCitations } from '../parser/parser';

/** Normalize a single citation locator, never an alias or an ordinary link. */
export function citationNoteTarget(link: string): string | null {
  if (!link.startsWith('@') || link.includes('|')) return null;
  const source = `[${link}]`;
  const groups = getCitationSegments(source);
  if (groups.length !== 1) return null;
  const group = getCitations(groups[0]);
  if (group.from !== 0 || group.to !== source.length || group.citations.length !== 1) return null;
  const citation = group.citations[0];
  // The inherited parser represents comma-prefixed page numbers as a suffix.
  // Keep that display behaviour; recognize it here only to choose the note.
  const hasLocator = citation.locator || /^,\s*(?:pp?\.|pages?)\s*\S/i.test(citation.suffix || '');
  return citation.id && hasLocator ? `@${citation.id}` : null;
}

interface CitationLineDocument {
  lineAt(position: number): { from: number; text: string };
}

export function citationLocatorLinkAt(document: CitationLineDocument, position: number) {
  const line = document.lineAt(position);
  const links = /\[\[([^\]\n]+)\]\]/g;
  let match: RegExpExecArray | null;
  while ((match = links.exec(line.text))) {
    const from = line.from + match.index;
    const to = from + match[0].length;
    if (position < from || position >= to || line.text[match.index - 1] === '!') continue;
    const target = citationNoteTarget(match[1]);
    if (target) return { from, to, target };
  }
  return null;
}
