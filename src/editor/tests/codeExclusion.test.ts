// Exercise the actual decoration adapter with Obsidian's syntax-class contract.
jest.mock('obsidian', () => {
  const { StateField } = require('@codemirror/state');
  return {
    editorInfoField: StateField.define({ create: () => ({ file: { path: 'test.md' } }), update: v => v }),
    editorLivePreviewField: StateField.define({ create: () => true, update: v => v }),
    livePreviewState: {}, Keymap: {},
  };
}, { virtual: true });
jest.mock('@codemirror/language', () => ({
  tokenClassNodeProp: {},
  syntaxTree: jest.fn(),
}));
const { EditorState } = require('@codemirror/state');
const { editorInfoField, editorLivePreviewField } = require('obsidian');
const { syntaxTree } = require('@codemirror/language');
const { citeKeyPlugin, bibManagerField, citeKeyCacheField } = require('../../editorExtension');
const { getCitationSegments, getCitations } = require('../../parser/parser');

function decorations(classes: string) {
  const doc = 'Text [[@Smith2020-ab]]';
  const data = getCitationSegments(doc)[0];
  const cite = { ...getCitations(data), data, val: '(Smith, 2020)' };
  const manager = {
    plugin: { settings: { renderCitations: true, renderLinkCitations: true } },
    fileCache: { has: () => true, get: () => ({ citations: [cite] }) },
  };
  syntaxTree.mockReturnValue({ resolveInner: () => ({ type: { prop: () => classes } }) });
  const state = EditorState.create({ doc, extensions: [
    editorInfoField, editorLivePreviewField,
    bibManagerField.init(() => manager), citeKeyCacheField,
  ] });
  return citeKeyPlugin.create({ state, visibleRanges: [{ from: 0, to: doc.length }] }).decorations;
}

describe('literal syntax in Live Preview', () => {
  it.each(['inline-code', 'hmd-codeblock', 'math'])('does not replace citations in %s', classes => {
    expect(decorations(classes).size).toBe(0);
  });
  it('still replaces an ordinary citation wikilink', () => {
    expect(decorations('hmd-internal-link').size).toBe(1);
  });
});
