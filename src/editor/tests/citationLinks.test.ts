jest.mock('obsidian', () => {
  const { StateField } = require('@codemirror/state');
  return {
    editorInfoField: StateField.define({ create: () => ({ file: { path: 'test.md' }, hoverPopover: null }), update: v => v }),
    editorLivePreviewField: StateField.define({ create: () => true, update: v => v }),
    livePreviewState: {},
    Keymap: { isModEvent: event => event.ctrlKey || event.metaKey ? 'tab' : false },
  };
}, { virtual: true });
jest.mock('@codemirror/language', () => ({ tokenClassNodeProp: {}, syntaxTree: jest.fn() }));
const { EditorState } = require('@codemirror/state');
const { editorInfoField, editorLivePreviewField } = require('obsidian');
const { syntaxTree } = require('@codemirror/language');
const { bibManagerField, citeKeyCacheField, citeKeyPlugin } = require('../../editorExtension');
const { citationNoteTarget, citationLocatorLinkAt } = require('../citationLinks');
const { citationLocatorLinkPlugin } = require('../citationLinkEvents');
const { getCitationSegments, getCitations } = require('../../parser/parser');

const cleanup: (() => void)[] = [];
afterEach(() => { cleanup.splice(0).forEach(fn => fn()); });

function editor(source = '[[@Stoller2015-ne, p. 318]]', live = true, classes = 'hmd-internal-link', enabled = true) {
  const doc = 'Text ' + source + ' after';
  const outer = document.body.appendChild(document.createElement('div'));
  const dom = outer.appendChild(document.createElement('div'));
  const scroll = dom.appendChild(document.createElement('div'));
  const contentDOM = scroll.appendChild(document.createElement('div'));
  const target = contentDOM.appendChild(document.createElement('span'));
  target.className = 'cm-hmd-internal-link'; target.textContent = source;
  const native = jest.fn(); outer.addEventListener('click', native); outer.addEventListener('mousedown', native, true);
  const data = getCitationSegments(doc)[0];
  const cite = data && { ...getCitations(data), data, val: '(Stoller, 2015, p. 318)' };
  const state = EditorState.create({ doc, extensions: [editorInfoField,
    editorLivePreviewField.init(() => live),
    bibManagerField.init(() => ({ plugin: { settings: { renderCitations: true, renderLinkCitations: enabled } },
      fileCache: { has: () => true, get: () => ({ citations: cite ? [cite] : [] }) } })), citeKeyCacheField] });
  syntaxTree.mockReturnValue({ resolveInner: () => ({ from: 7, to: 5 + source.length - 2, type: { prop: () => classes } }) });
  const view = { state, dom, contentDOM, posAtDOM: () => 8, visibleRanges: [{ from: 0, to: doc.length }] };
  const workspace = { openLinkText: jest.fn(), trigger: jest.fn() };
  (global as any).app = { workspace };
  const plugin = citationLocatorLinkPlugin.create(view);
  cleanup.push(() => { plugin.destroy(); outer.remove(); });
  return { target, native, workspace, view, plugin };
}

describe('citation note destinations', () => {
  it.each([
    ['@Sawchuk2013-eu, p. 336', '@Sawchuk2013-eu'],
    ['@Stoller2015-ne, p. 318', '@Stoller2015-ne'],
    ['@Kalantzis2012-wb, pp. 199–200', '@Kalantzis2012-wb'],
    ['@пункт3 chap. 3', '@пункт3'],
  ])('separates the locator in %s', (source, target) => {
    expect(citationNoteTarget(source)).toBe(target);
  });
  it.each(['@Sawchuk2013-eu', '@Stoller2015-ne, p. 318|Chosen alias',
    '@one, p. 4; @two, p. 5', 'Normal note, p. 4', 'https://example.com'])('does not reinterpret %s', source => {
    expect(citationNoteTarget(source)).toBeNull();
  });
  it('finds the correct link on a line with multiple citations, excluding embeds and aliases', () => {
    const state = EditorState.create({ doc: 'Header\n[[@One, p. 1]] [[@Two, p. 2]] [[@Three, p. 3|Alias]] ![[@Four, p. 4]]' });
    const text = state.doc.toString();
    expect(citationLocatorLinkAt(state.doc, text.indexOf('@Two'))?.target).toBe('@Two');
    expect(citationLocatorLinkAt(state.doc, text.indexOf('@Three'))).toBeNull();
    expect(citationLocatorLinkAt(state.doc, text.indexOf('@Four'))).toBeNull();
  });
  it('gives the actual formatted widget the canonical destination, retaining page text', () => {
    const { view } = editor();
    const widget = citeKeyPlugin.create(view).decorations.iter().value.spec.widget;
    expect(widget.linkText).toBe('@Stoller2015-ne');
    expect(widget.cite.val).toBe('(Stoller, 2015, p. 318)');
  });
});

describe('native editor locator links', () => {
  it('captures a Live Preview click before native filename creation', () => {
    const test = editor();
    test.target.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    expect(test.workspace.openLinkText).toHaveBeenCalledWith('@Stoller2015-ne', 'test.md', false);
    expect(test.native).not.toHaveBeenCalled();
  });
  it('preserves Source-mode caret clicks and normalizes modifier-click navigation', () => {
    const test = editor(undefined, false);
    test.target.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(test.workspace.openLinkText).not.toHaveBeenCalled();
    expect(test.native).toHaveBeenCalledTimes(1);
    test.target.dispatchEvent(new MouseEvent('click', { bubbles: true, ctrlKey: true }));
    expect(test.workspace.openLinkText).toHaveBeenCalledWith('@Stoller2015-ne', 'test.md', 'tab');
    expect(test.native).toHaveBeenCalledTimes(1);
  });
  it.each(['shiftKey', 'altKey'])('preserves native selection behaviour for %s', modifier => {
    const test = editor();
    test.target.dispatchEvent(new MouseEvent('click', { bubbles: true, [modifier]: true }));
    expect(test.workspace.openLinkText).not.toHaveBeenCalled();
    expect(test.native).toHaveBeenCalledTimes(1);
  });
  it('uses the canonical note for middle-click and hover preview', () => {
    const test = editor();
    test.target.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 1 }));
    expect(test.workspace.openLinkText).toHaveBeenCalledWith('@Stoller2015-ne', 'test.md', 'tab');
    expect(test.native).not.toHaveBeenCalled();
    test.target.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    expect(test.workspace.trigger).toHaveBeenCalledWith('hover-link', expect.objectContaining({ linktext: '@Stoller2015-ne', sourcePath: 'test.md' }));
  });
  it.each([
    ['[[@One, p. 4|Chosen alias]]', 'hmd-internal-link', true],
    ['[[@One, p. 4]]', 'inline-code', true],
    ['[[@One, p. 4]]', 'hmd-internal-link', false],
    ['[[Ordinary note]]', 'hmd-internal-link', true],
  ])('leaves aliases, code, ordinary links and disabled link rendering alone: %s %s %s', (source, classes, enabled) => {
    const test = editor(source, true, classes, enabled);
    test.target.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(test.workspace.openLinkText).not.toHaveBeenCalled();
    expect(test.native).toHaveBeenCalledTimes(1);
  });
  it('routes an already-rendered callout safely after plugin reload, without recreating its DOM', () => {
    const test = editor();
    const anchor = test.view.contentDOM.appendChild(document.createElement('a'));
    anchor.className = 'internal-link';
    anchor.setAttribute('data-href', '@Stoller2015-ne, p. 318');
    anchor.innerHTML = '<span class="pandoc-citation">(Stoller, 2015, p. 318)</span>';
    anchor.firstChild.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(test.workspace.openLinkText).toHaveBeenCalledWith('@Stoller2015-ne', 'test.md', false);
    expect(test.native).not.toHaveBeenCalled();
    anchor.firstChild.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    expect(test.workspace.trigger).toHaveBeenCalledWith('hover-link', expect.objectContaining({ linktext: '@Stoller2015-ne' }));
  });
  it('leaves an aliased callout anchor unchanged', () => {
    const test = editor();
    const anchor = test.view.contentDOM.appendChild(document.createElement('a'));
    anchor.className = 'internal-link';
    anchor.setAttribute('data-href', '@Stoller2015-ne, p. 318');
    anchor.textContent = 'Chosen alias';
    anchor.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(test.workspace.openLinkText).not.toHaveBeenCalled();
    expect(test.native).toHaveBeenCalledTimes(1);
  });
  it('removes all capture handlers when the editor is destroyed', () => {
    const test = editor(); test.plugin.destroy();
    test.target.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    test.target.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    expect(test.workspace.openLinkText).not.toHaveBeenCalled();
    expect(test.workspace.trigger).not.toHaveBeenCalled();
  });
});


describe('source-note previews on editor citation text', () => {
  function renderedWidget(test: ReturnType<typeof editor>) {
    (global as any).createSpan = ({ cls, attr }, callback) => {
      const span = document.createElement('span') as any;
      span.className = cls;
      for (const [key, value] of Object.entries(attr)) span.setAttribute(key, value as string);
      span.addClass = value => span.classList.add(value);
      span.setText = value => { span.textContent = value; };
      callback(span);
      return span;
    };
    const widget = citeKeyPlugin.create(test.view).decorations.iter().value.spec.widget;
    const span = widget.toDOM();
    test.target.replaceWith(span);
    return span;
  }

  it.each([
    ['[[@Stoller2015-ne]]', false],
    ['[[@Stoller2015-ne]]', true],
    ['[[@Stoller2015-ne, p. 318]]', false],
    ['[[@Stoller2015-ne, p. 318]]', true],
  ])('requests the source-note preview for a rendered citation: %s, Command held: %s', (source, metaKey) => {
    const test = editor(source);
    const span = renderedWidget(test);
    const event = new MouseEvent('mouseover', { bubbles: true, metaKey });
    span.dispatchEvent(event);
    expect(test.workspace.trigger).toHaveBeenCalledWith('hover-link', expect.objectContaining({
      event, source: 'editor', targetEl: span,
      hoverParent: test.view.state.field(editorInfoField),
      linktext: '@Stoller2015-ne', sourcePath: 'test.md',
    }));
    expect(test.workspace.openLinkText).not.toHaveBeenCalled();
    expect(span.textContent).toBe('(Stoller, 2015, p. 318)');
  });

  it('retains the widget click path after hover, without duplicate navigation', () => {
    jest.useFakeTimers();
    (global as any).activeWindow = window;
    try {
      const test = editor();
      const span = renderedWidget(test);
      span.dispatchEvent(new MouseEvent('mouseover', { bubbles: true, metaKey: true }));
      span.dispatchEvent(new MouseEvent('click', { bubbles: true, metaKey: true }));
      expect(test.workspace.openLinkText).not.toHaveBeenCalled();
      jest.runOnlyPendingTimers();
      expect(test.workspace.openLinkText).toHaveBeenCalledTimes(1);
      expect(test.workspace.openLinkText).toHaveBeenCalledWith('@Stoller2015-ne', 'test.md', 'tab');
    } finally {
      delete (global as any).activeWindow;
      jest.useRealTimers();
    }
  });

  it('normalizes hovering over a marked citekey in Source mode, not just its page suffix', () => {
    const test = editor(undefined, false);
    const mark = test.target.appendChild(document.createElement('span'));
    mark.className = 'cm-pandoc-citation pandoc-citation is-resolved';
    mark.textContent = 'Stoller2015-ne';
    const nativeHover = jest.fn();
    test.view.contentDOM.addEventListener('mouseover', nativeHover);
    mark.dispatchEvent(new MouseEvent('mouseover', { bubbles: true, metaKey: true }));
    expect(test.workspace.trigger).toHaveBeenCalledWith('hover-link', expect.objectContaining({
      targetEl: test.target, linktext: '@Stoller2015-ne', sourcePath: 'test.md',
    }));
    expect(nativeHover).not.toHaveBeenCalled();
    expect(test.workspace.openLinkText).not.toHaveBeenCalled();
  });
});
