/** @jest-environment node */
import { mkdtempSync, writeFileSync, renameSync, unlinkSync, rmSync, readFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { watchBibliography, BibliographyWatcher } from '../bibliographyWatcher';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
async function until(check: () => boolean) {
  const end = Date.now() + 3000;
  while (!check()) { if (Date.now() > end) throw new Error('Watcher condition timed out'); await delay(15); }
}

describe('bibliography path monitoring on real temporary files', () => {
  let directory: string, file: string, watcher: BibliographyWatcher;
  beforeEach(() => { directory = mkdtempSync(join(tmpdir(), 'citation-bib-watch-')); file = join(directory, 'main.bib'); writeFileSync(file, 'original'); });
  afterEach(() => { watcher?.close(); rmSync(directory, { recursive: true, force: true }); });
  const options = { intervalMs: 20, settleMs: 20 };

  it('survives atomic replacement and detects a subsequent edit', async () => {
    const seen: string[] = [];
    watcher = watchBibliography(file, () => { seen.push(readFileSync(file, 'utf8')); }, options);
    await delay(50);
    writeFileSync(join(directory, 'incoming.bib'), 'added source'); renameSync(join(directory, 'incoming.bib'), file);
    await until(() => seen.includes('added source'));
    writeFileSync(file, 'another new source');
    await until(() => seen.includes('another new source'));
  });

  it('does not try reading a missing file and recovers when it is recreated', async () => {
    const seen: string[] = [], onError = jest.fn();
    watcher = watchBibliography(file, () => { seen.push(readFileSync(file, 'utf8')); }, { ...options, onError });
    unlinkSync(file); await delay(100);
    expect(seen).toEqual([]); expect(onError).not.toHaveBeenCalled();
    writeFileSync(file, 'recreated'); await until(() => seen.includes('recreated'));
  });

  it('serializes refreshes and retains a change arriving during a slow refresh', async () => {
    let release: () => void;
    const blocked = new Promise<void>(resolve => { release = resolve; });
    let active = 0, maximum = 0;
    const seen: string[] = [];
    watcher = watchBibliography(file, async () => {
      active++; maximum = Math.max(maximum, active);
      seen.push(readFileSync(file, 'utf8'));
      if (seen.length === 1) await blocked;
      active--;
    }, options);
    writeFileSync(file, 'first'); await until(() => seen.length === 1);
    writeFileSync(file, 'second'); await delay(100); release();
    await until(() => seen.includes('second'));
    expect(maximum).toBe(1);
  });

  it('keeps monitoring after a failed refresh and cancels queued work on close', async () => {
    const onError = jest.fn(), seen: string[] = [];
    watcher = watchBibliography(file, () => {
      const value = readFileSync(file, 'utf8');
      if (value === 'bad') throw new Error('Temporary parser failure');
      seen.push(value);
    }, { ...options, onError });
    writeFileSync(file, 'bad'); await until(() => onError.mock.calls.length === 1);
    writeFileSync(file, 'valid'); await until(() => seen.includes('valid'));
    watcher.close(); writeFileSync(file, 'after close'); await delay(100);
    expect(seen).toEqual(['valid']);
  });

  it('closing one watcher leaves other subscribers on the same path intact', async () => {
    const first = jest.fn(), second = jest.fn();
    const one = watchBibliography(file, first, options);
    watcher = watchBibliography(file, second, options);
    one.close(); writeFileSync(file, 'changed'); await until(() => second.mock.calls.length > 0);
    expect(first).not.toHaveBeenCalled();
  });
});
