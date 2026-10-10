import { request } from 'http';

/** Read Better BibTeX locally, with a deadline that also closes the request. */
export function getLocalZoteroText(
  port: string,
  resource: string,
  timeoutMs: number = 5000
): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = request(
      { hostname: '127.0.0.1', port, path: resource, method: 'GET' },
      (response) => {
        const chunks: string[] = [];
        response.setEncoding('utf8');
        response.on('data', (chunk: string) => chunks.push(chunk));
        response.on('error', reject);
        response.on('aborted', () => reject(new Error('Zotero response aborted')));
        response.on('end', () => {
          if (response.statusCode >= 200 && response.statusCode < 300) {
            resolve(chunks.join(''));
          } else {
            reject(new Error(`Zotero HTTP status ${response.statusCode}`));
          }
        });
      }
    );
    const deadline = setTimeout(() => {
      req.destroy(new Error('Zotero request timed out'));
    }, timeoutMs);
    req.on('error', reject);
    req.on('close', () => clearTimeout(deadline));
    req.end();
  });
}
