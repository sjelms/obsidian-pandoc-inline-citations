// Real BibTeX -> installed Pandoc -> citeproc -> note cache and editor effect.
// Obsidian's shell is stubbed; native UI verification remains a separate gate.
jest.mock('obsidian', () => {
  const { StateField } = require('@codemirror/state');
  return {
    TFile: class { constructor(public path: string) {} },
    MarkdownView: class {}, Keymap: {},
    editorInfoField: StateField.define({ create: () => null, update: v => v }),
    editorLivePreviewField: StateField.define({ create: () => true, update: v => v }), livePreviewState: {},
  };
}, { virtual: true });
jest.mock('../bibliographyWatcher', () => {
  const actual = jest.requireActual('../bibliographyWatcher');
  return { watchBibliography: (file, refresh) => actual.watchBibliography(file, refresh, { intervalMs: 25, settleMs: 30 }) };
});
const { mkdtempSync, writeFileSync, renameSync, rmSync, readFileSync } = require('fs');
const { tmpdir } = require('os');
const { join } = require('path');
const { TFile } = require('obsidian');
const { BibManager } = require('../bibManager');
const { styles, locales } = require('../../parser/tests/styles');
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
async function until(check: () => boolean) {
  const end = Date.now() + 5000;
  while (!check()) { if (Date.now() > end) throw new Error('Citation refresh timed out'); await delay(25); }
}

const original = '@book{Old2020,title={Original},author={Old, Ada},year={2020}}';
const added = '\n@book{Added2024,title={New source},author={Added, Bea},year={2024}}';
const extra = '\n@book{Extra2025,title={Another source},author={Extra, Chris},year={2025}}';
const content = 'Original [[@Old2020]]. New [[@Added2024]]. Extra [[@Extra2025]].';

describe('automatic bibliography refresh through the actual citation manager', () => {
  let directory: string, bibliography: string, manager: any, plugin: any, file: any, dispatch: any;
  beforeEach(async () => {
    directory = mkdtempSync(join(tmpdir(), 'citation-refresh-'));
    bibliography = join(directory, 'main.bib'); writeFileSync(bibliography, original);
    file = new TFile('test.md'); dispatch = jest.fn();
    (global as any).app = {
      vault: { adapter: { getBasePath: () => directory } },
      metadataCache: { getFileCache: () => null },
      workspace: { getLeavesOfType: () => [{ view: { file, previewMode: {}, editor: { cm: { dispatch } } } }] },
    };
    plugin = {
      settings: { pathToBibliography: bibliography, pathToPandoc: '/opt/homebrew/bin/pandoc', cslStyleURL: 'fixture:apa', cslLang: 'en-US', renderLinkCitations: true },
      initPromise: { promise: Promise.resolve() }, emitter: { trigger: jest.fn() },
      processReferences: jest.fn(async () => manager.getReferenceList(file, content)),
    };
    manager = new BibManager(plugin);
    manager.styleCache.set('fixture:apa', styles.apa); manager.langCache.set('en-US', locales['en-US']);
    manager.prepBibHTML = el => el;
    await manager.loadGlobalBibFile(); manager.initPromise.resolve();
    await plugin.processReferences();
  });
  afterEach(() => { manager?.destroy(); rmSync(directory, { recursive: true, force: true }); });

  it('resolves a newly added source after atomic replacement, then still detects later edits', async () => {
    expect(manager.fileCache.get(file).unresolvedKeys.has('Added2024')).toBe(true);
    writeFileSync(join(directory, 'incoming.bib'), original + added);
    renameSync(join(directory, 'incoming.bib'), bibliography);
    await until(() => manager.fileCache.get(file)?.resolvedKeys.has('Added2024'));
    let cache = manager.fileCache.get(file);
    expect(cache.unresolvedKeys.has('Added2024')).toBe(false);
    expect(cache.citations.some(c => c.val.includes('Added, 2024'))).toBe(true);
    expect(cache.citeBibMap.get('Added2024')).toContain('New source');
    expect(dispatch).toHaveBeenCalledWith({ effects: expect.any(Array) });
    expect(dispatch.mock.calls.every(([transaction]) => !('changes' in transaction))).toBe(true);
    expect(plugin.emitter.trigger).toHaveBeenCalledWith('citation-cache-updated', 'test.md');
    writeFileSync(bibliography, original + added + extra);
    await until(() => manager.fileCache.get(file)?.resolvedKeys.has('Extra2025'));
    cache = manager.fileCache.get(file);
    expect(cache.citations.some(c => c.val.includes('Extra, 2025'))).toBe(true);
    expect(readFileSync(bibliography, 'utf8')).toBe(original + added + extra);
  });

  it('retains the last usable bibliography after a conversion failure and recovers on the next update', async () => {
    const failure = jest.spyOn(console, 'error').mockImplementation(() => {});
    try {
      writeFileSync(bibliography, '@book{broken');
      await until(() => failure.mock.calls.length > 0);
      expect(manager.bibCache.has('Old2020')).toBe(true);
      expect(manager.fileCache.get(file).resolvedKeys.has('Old2020')).toBe(true);
      writeFileSync(bibliography, original + added);
      await until(() => manager.fileCache.get(file)?.resolvedKeys.has('Added2024'));
    } finally { failure.mockRestore(); }
  });
});
