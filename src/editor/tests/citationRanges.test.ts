import { EditorState, Prec } from '@codemirror/state';
import { Decoration, EditorView, ViewPlugin, WidgetType } from '@codemirror/view';
import { getCitationSegments, getCitations } from '../../parser/parser';
import { citationDisplayRange } from '../citationRanges';

const text = 'Text [[@Smith2020-ab]] after [[Ordinary|Label]] and [website](https://example.com).';
const group = getCitations(getCitationSegments(text)[0]);
const documentText = EditorState.create({ doc: text }).doc;
const fullRange = citationDisplayRange(documentText, group.from, group.to);

class CitationWidget extends WidgetType {
  toDOM() {
    const span = document.createElement('span');
    span.className = 'test-citation';
    span.textContent = '(Smith, 2020)';
    return span;
  }
}

function render(range: { from: number; to: number }, highest: boolean) {
  const native = Decoration.set([
    Decoration.replace({}).range(fullRange.from, fullRange.from + 2),
    Decoration.mark({ class: 'native-link' }).range(fullRange.from + 2, fullRange.to - 2),
    Decoration.replace({}).range(fullRange.to - 2, fullRange.to),
  ], true);
  const citation = Decoration.set([
    Decoration.replace({ widget: new CitationWidget() }).range(range.from, range.to),
  ]);
  const provider = (decorations: typeof citation) => ViewPlugin.fromClass(class {
    decorations = decorations;
  }, { decorations: value => value.decorations });
  const citationPlugin = provider(citation);
  const view = new EditorView({
    state: EditorState.create({
      doc: text,
      extensions: [provider(native), highest ? Prec.highest(citationPlugin) : citationPlugin],
    }),
    parent: document.body,
  });
  try {
    return {
      citations: view.dom.querySelectorAll('.test-citation').length,
      text: view.dom.textContent,
    };
  } finally {
    view.destroy();
  }
}

// The live Obsidian probe reproduces the disappearance; standalone CodeMirror
// verifies the required output and link boundaries, not Obsidian internals.
describe('citation replacement and native wiki-link hiding', () => {
  it('renders the full wiki-link replacement at highest precedence', () => {
    const rendered = render(fullRange, true);
    expect(rendered.citations).toBe(1);
    expect(rendered.text).toContain('(Smith, 2020)');
    expect(rendered.text).toContain('[[Ordinary|Label]]');
    expect(rendered.text).toContain('[website](https://example.com)');
  });

  it('expands only double-bracket citation ranges', () => {
    expect(documentText.sliceString(fullRange.from, fullRange.to)).toBe('[[@Smith2020-ab]]');
    for (const source of ['[@Smith2020-ab]', '@Smith2020-ab', '[@Smith2020-ab p. 4]']) {
      const doc = EditorState.create({ doc: source }).doc;
      const cite = getCitations(getCitationSegments(source)[0]);
      expect(citationDisplayRange(doc, cite.from, cite.to)).toEqual({ from: cite.from, to: cite.to });
    }
  });

  it('leaves aliased citations to Obsidian', () => {
    expect(getCitationSegments('[[@Smith2020-ab|A label]]')).toEqual([]);
  });
});
