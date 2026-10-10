interface CitationDocument {
  readonly length: number;
  sliceString(from: number, to: number): string;
}

/** Include both wiki-link delimiters so native bracket hiding cannot cross the widget. */
export function citationDisplayRange(
  document: CitationDocument,
  from: number,
  to: number
) {
  if (
    from > 0 &&
    to < document.length &&
    document.sliceString(from - 1, from + 1) === '[[' &&
    document.sliceString(to - 1, to + 1) === ']]'
  ) {
    return { from: from - 1, to: to + 1 };
  }

  return { from, to };
}
