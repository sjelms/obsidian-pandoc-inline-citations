jest.mock('obsidian', () => ({
  MarkdownRenderChild: class {
    events: any[] = [];
    registerEvent(event: any) { this.events.push(event); }
    unload() { this.events.forEach(event => event.off()); }
  },
}), { virtual: true });
const { processCiteKeys } = require('../../markdownPostprocessor');
const { getCitationSegments, getCitations } = require('../../parser/parser');

function fragment() {
  const frag = document.createDocumentFragment() as any;
  frag.appendText = text => frag.append(document.createTextNode(text));
  frag.createSpan = ({ attr = {}, cls = '', text = '' }) => {
    const span = document.createElement('span') as any;
    span.className = cls; span.textContent = text;
    for (const [key, value] of Object.entries(attr)) span.setAttribute(key, value as string);
    span.setText = value => { span.textContent = value; };
    frag.append(span); return span;
  };
  return frag;
}

function setup(ready: boolean) {
  (global as any).createFragment = fragment;
  const data = getCitationSegments('[@Smith2020-ab]')[0];
  const cite = { ...getCitations(data), data, val: '(Smith, 2020)' };
  let cache = ready ? { citations: [cite] } : null;
  const listeners = new Set<(path: string) => void>();
  const plugin = {
    settings: { renderLinkCitations: true, renderCitationsReadingMode: true },
    emitter: { on: (_event, fn) => { listeners.add(fn); return { off: () => listeners.delete(fn) }; } },
    bibManager: { getCacheForPath: () => cache },
    tooltipManager: { bindPreviewTooltipHandler: jest.fn() },
  };
  const el = document.createElement('div') as any;
  el.hasClass = cls => el.classList.contains(cls);
  el.innerHTML = '<div class="callout"><p>Text <a data-href="@Smith2020-ab">@Smith2020-ab</a>. <a data-href="@Smith2020-ab">Chosen label</a>. <a href="https://example.com">Example</a></p><code>[@Smith2020-ab]</code></div>';
  const children: any[] = [];
  const ctx = { sourcePath: 'test.md', getSectionInfo: () => null, addChild: child => { children.push(child); child.onload(); } };
  return { el, children, listeners, plugin, ctx, ready: () => { cache = { citations: [cite] }; },
    update: (path = 'test.md') => [...listeners].forEach(fn => fn(path)) };
}

describe('Live Preview callout lifecycle', () => {
  it('formats callouts without section metadata, preserving aliases, URLs and code', () => {
    const test = setup(true);
    processCiteKeys(test.plugin)(test.el, test.ctx);
    expect(test.el.querySelector('.pandoc-citation').textContent).toBe('(Smith, 2020)');
    expect(test.el.querySelectorAll('a')[1].textContent).toBe('Chosen label');
    expect(test.el.querySelector('a[href]').getAttribute('href')).toBe('https://example.com');
    expect(test.el.querySelector('code').textContent).toBe('[@Smith2020-ab]');
  });
  it('waits for its own cache, avoids nesting and releases subscriptions on unload', () => {
    const test = setup(false);
    processCiteKeys(test.plugin)(test.el, test.ctx);
    expect(test.el.querySelector('.pandoc-citation')).toBeNull();
    test.ready(); test.update('another.md');
    expect(test.el.querySelector('.pandoc-citation')).toBeNull();
    test.update(); test.update();
    expect(test.el.querySelectorAll('.pandoc-citation').length).toBe(1);
    test.children.forEach(child => child.unload());
    expect(test.listeners.size).toBe(0);
  });
});
