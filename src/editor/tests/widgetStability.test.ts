jest.mock('obsidian', () => {
  const { StateField } = require('@codemirror/state');
  return {
    editorInfoField: StateField.define({ create: () => ({ file: { path: 'test.md' } }), update: v => v }),
    editorLivePreviewField: StateField.define({ create: () => true, update: v => v }),
    livePreviewState: {}, Keymap: {},
  };
}, { virtual: true });
jest.mock('@codemirror/language', () => ({ tokenClassNodeProp: {}, syntaxTree: jest.fn() }));
const { EditorState } = require('@codemirror/state');
const { EditorView } = require('@codemirror/view');
const { editorInfoField, editorLivePreviewField } = require('obsidian');
const { syntaxTree } = require('@codemirror/language');
const { citeKeyPlugin, bibManagerField, citeKeyCacheField, setCiteKeyCache } = require('../../editorExtension');
const { getCitationSegments, getCitations } = require('../../parser/parser');

function cacheFor(doc: string, val = '(Smith, 2020)') {
  return { citations: getCitationSegments(doc).map(data => ({ ...getCitations(data), data, val })),
    resolvedKeys: new Set(['Smith2020']), unresolvedKeys: new Set() };
}
function setup() {
  let created = 0;
  (global as any).createSpan = ({ cls, attr }, callback) => {
    created++;
    const span = document.createElement('span') as any;
    span.className = cls;
    for (const [key, value] of Object.entries(attr)) span.setAttribute(key, value as string);
    span.addClass = value => span.classList.add(value);
    span.setText = value => { span.textContent = value; };
    callback(span); return span;
  };
  syntaxTree.mockImplementation(state => ({ resolveInner: position => {
    const matches = [...state.doc.toString().matchAll(/\[\[([^\]]+)\]\]/g)];
    const match = matches.find(m => position >= m.index && position < m.index + m[0].length);
    return { from: match.index + 2, to: match.index + match[0].length - 2,
      type: { prop: () => 'hmd-internal-link' } };
  } }));
  const doc = 'Typing here.\n\n' + Array.from({ length: 60 }, (_, i) => `Paragraph ${i} [[@Smith2020]].`).join('\n\n');
  const manager = { plugin: { settings: { renderCitations: true, renderLinkCitations: true } },
    fileCache: { has: () => true, get: () => cacheFor(doc) } };
  const parent = document.body.appendChild(document.createElement('div'));
  const view = new EditorView({ state: EditorState.create({ doc, extensions: [
    editorInfoField, editorLivePreviewField, bibManagerField.init(() => manager), citeKeyCacheField, citeKeyPlugin,
  ] }), parent });
  return { view, created: () => created, destroy: () => { view.destroy(); parent.remove(); } };
}

describe('citation DOM stability during typing', () => {
  it('retains citation elements across offset-only cache refreshes in a long document', () => {
    const test = setup();
    try {
      const first = test.view.dom.querySelector('.pandoc-citation');
      expect(first).not.toBeNull();
      const before = test.created();
      for (let i = 0; i < 8; i++) {
        test.view.dispatch({ changes: { from: 1, insert: 'x' } });
        test.view.dispatch({ effects: setCiteKeyCache.of(cacheFor(test.view.state.doc.toString())) });
      }
      expect({ newElements: test.created() - before, retained: test.view.dom.querySelector('.pandoc-citation') === first })
        .toEqual({ newElements: 0, retained: true });
    } finally { test.destroy(); }
  });
  it('still replaces widgets when formatted citation text changes', () => {
    const test = setup();
    try {
      const before = test.view.dom.querySelector('.pandoc-citation');
      test.view.dispatch({ effects: setCiteKeyCache.of(cacheFor(test.view.state.doc.toString(), '(Smith, 2021)')) });
      const after = test.view.dom.querySelector('.pandoc-citation');
      expect(after).not.toBe(before);
      expect(after.textContent).toBe('(Smith, 2021)');
    } finally { test.destroy(); }
  });
  it('retains offset-only widgets, but refreshes changed tooltip and navigation metadata', () => {
    const test = setup();
    try {
      const first = test.view.plugin(citeKeyPlugin).decorations.iter().value.spec.widget;
      const Widget = first.constructor;
      const shifted = { ...first.cite, from: first.cite.from + 10, to: first.cite.to + 10,
        data: first.cite.data.map(segment => ({ ...segment, from: segment.from + 10, to: segment.to + 10 })) };
      expect(first.eq(new Widget(shifted, first.sourcePath, first.linkText))).toBe(true);
      for (const changed of [
        { ...shifted, citations: [{ id: 'Other2022' }] },
        { ...shifted, note: 'A footnote' },
        { ...shifted, noteIndex: 9 },
      ]) expect(first.eq(new Widget(changed, first.sourcePath, first.linkText))).toBe(false);
      expect(first.eq(new Widget(shifted, 'different.md', first.linkText))).toBe(false);
      expect(first.eq(new Widget(shifted, first.sourcePath, '@Other2022'))).toBe(false);
    } finally { test.destroy(); }
  });
});
