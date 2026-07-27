import { readFileSync } from 'node:fs';
import { dirname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';

const REPOSITORY_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
let exposureCounter = 0;

/**
 * Evaluate a classic browser script read from the repository in an isolated
 * jsdom window and expose selected top-level bindings from that same script.
 */
export function loadBrowserScript(scriptPath, exposedNames, globals = {}) {
  const absolutePath = resolve(REPOSITORY_ROOT, scriptPath);
  if (absolutePath !== REPOSITORY_ROOT && !absolutePath.startsWith(REPOSITORY_ROOT + sep)) {
    throw new Error(`Browser script must be inside the repository: ${scriptPath}`);
  }

  const source = readFileSync(absolutePath, 'utf8');
  const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>', {
    runScripts: 'outside-only',
    url: 'https://wartab.test/',
  });
  Object.assign(dom.window, globals);

  const exposureKey = `__wartabBrowserHarness${exposureCounter++}`;
  const exposureEntries = exposedNames.map((name) => {
    const encodedName = JSON.stringify(name);
    return `${encodedName}: typeof ${name} === 'undefined' ? undefined : ${name}`;
  });
  const expose = `\n;globalThis[${JSON.stringify(exposureKey)}] = {${exposureEntries.join(',')}};`;

  try {
    dom.window.eval(source + expose);
    const exports = dom.window[exposureKey];
    delete dom.window[exposureKey];
    return {
      window: dom.window,
      document: dom.window.document,
      exports,
      cleanup: () => dom.window.close(),
    };
  } catch (error) {
    dom.window.close();
    throw error;
  }
}
