import { Stats, watchFile, unwatchFile } from 'fs';

export interface BibliographyWatcher { close(): void; }
interface WatchOptions {
  intervalMs?: number;
  settleMs?: number;
  onError?: (error: unknown) => void;
}

/** Follow the path across atomic replacement, deletion and recreation. */
export function watchBibliography(
  file: string,
  refresh: () => Promise<unknown> | void,
  options: WatchOptions = {}
): BibliographyWatcher {
  let closed = false;
  let running = false;
  let pending = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const onError = options.onError || ((error) => console.error('Bibliography refresh failed:', error));
  const schedule = () => {
    if (timer !== undefined) clearTimeout(timer);
    timer = setTimeout(run, options.settleMs ?? 150);
  };
  const run = async () => {
    timer = undefined;
    if (closed || running) return;
    running = true;
    pending = false;
    try {
      await refresh();
    } catch (error) {
      if (!closed) onError(error);
    } finally {
      running = false;
      if (!closed && pending && timer === undefined) schedule();
    }
  };
  const changed = (current: Stats, previous: Stats) => {
    if (closed || !current.nlink) return;
    if (current.ino === previous.ino && current.size === previous.size &&
      current.mtimeMs === previous.mtimeMs && current.ctimeMs === previous.ctimeMs) return;
    pending = true;
    schedule();
  };
  // Stat only this file once a second; do not scan or reread the vault.
  watchFile(file, { interval: options.intervalMs ?? 1000, persistent: false }, changed);
  return {
    close() {
      closed = true;
      pending = false;
      if (timer !== undefined) clearTimeout(timer);
      unwatchFile(file, changed);
    },
  };
}
