/** @jest-environment node */
import { createServer, Server, IncomingMessage, ServerResponse } from 'http';
import { AddressInfo } from 'net';
import { getLocalZoteroText } from '../zoteroRequest';

describe('local Zotero HTTP transport', () => {
  let server: Server;
  let port: string;
  let handle: (request: IncomingMessage, response: ServerResponse) => void;

  beforeEach(async () => {
    handle = (_request, response) => response.end('ready');
    server = createServer((request, response) => handle(request, response));
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    port = String((server.address() as AddressInfo).port);
  });

  afterEach(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('reads the availability probe without a download dependency', async () => {
    handle = (request, response) => {
      expect(request.url).toBe('/better-bibtex/cayw?probe=true');
      response.end('ready');
    };
    await expect(getLocalZoteroText(port, '/better-bibtex/cayw?probe=true')).resolves.toBe('ready');
  });

  it('preserves Unicode JSON split across response chunks', async () => {
    handle = (_request, response) => {
      response.write('{"title":"Литература');
      response.end(' café"}');
    };
    await expect(getLocalZoteroText(port, '/library')).resolves.toBe('{"title":"Литература café"}');
  });

  it('rejects HTTP errors instead of treating them as bibliography data', async () => {
    handle = (_request, response) => {
      response.statusCode = 503;
      response.end('unavailable');
    };
    await expect(getLocalZoteroText(port, '/library')).rejects.toThrow('503');
  });

  it('aborts a stalled request at the deadline', async () => {
    handle = () => {};
    await expect(getLocalZoteroText(port, '/probe', 30)).rejects.toThrow('timed out');
  });
});
