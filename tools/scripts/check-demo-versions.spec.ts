/**
 * The CI guard for docs/release-pipeline-alignment-PRD.md (M1), driven against temp trees.
 *
 * For the published libraries it must FAIL when a dist/libs package.json about to be
 * published still holds the placeholder, or when dist/libs holds no library at all, and
 * PASS a private library (the plan step marks an untagged library private instead).
 *
 * For a demo that shows a version it must FAIL in three ways:
 *   - the library package.json is still unstamped (the plan step did not run, or ran too late);
 *   - a bundle dir is missing (a moved build output would otherwise be a silent pass);
 *   - a bundle lacks the stamped version (the demo was built before the stamp, or restored from cache).
 * And it must PASS when the placeholder string appears next to the real version, because
 * @angular/core ships that literal itself.
 */
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterAll, describe, expect, it, vi } from 'vitest';

import { DEMOS, PLACEHOLDER, holdsVersion, libraries, main, problemsOf, scriptFiles } from './check-demo-versions.mjs';

const roots: string[] = [];
function tree(files: Record<string, string>): string {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'mp-demo-versions-')));
  roots.push(root);
  Object.entries(files).map(([rel, content]) => {
    mkdirSync(dirname(join(root, rel)), { recursive: true });
    writeFileSync(join(root, rel), content, 'utf8');
  });
  return root;
}
afterAll(() => roots.map((root) => rmSync(root, { recursive: true, force: true })));

const DEMO = { name: 'demo', packageJson: 'libs/lib/package.json', bundles: ['dist/demo/browser', 'dist/demo/server'] };
const pkg = (version: string) => JSON.stringify({ name: '@mintplayer/lib', version });
const lib = (name: string, version: string, extra: object = {}) => JSON.stringify({ name, version, ...extra });
/** A dist/libs that passes, so a demo test fails only for the demo. */
const STAMPED_LIBS = { 'dist/libs/lib/package.json': lib('@mintplayer/lib', '1.2.3') };

describe('libraries', () => {
  it('reads every library under dist/libs and passes the stamped ones', () => {
    const root = tree({
      'dist/libs/a/package.json': lib('@mintplayer/a', '22.1.0'),
      'dist/libs/b/package.json': lib('@mintplayer/b', '2.0.0'),
      'dist/libs/not-a-lib/readme.md': '',
    });
    expect(libraries(root).sort((x, y) => x.name.localeCompare(y.name))).toEqual([
      { name: '@mintplayer/a', version: '22.1.0', private: false, problem: undefined },
      { name: '@mintplayer/b', version: '2.0.0', private: false, problem: undefined },
    ]);
  });

  it('flags a library that would be published at the placeholder', () => {
    const root = tree({ 'dist/libs/a/package.json': lib('@mintplayer/a', PLACEHOLDER) });
    expect(libraries(root)[0].problem).toBe(`dist/libs/a/package.json still holds ${PLACEHOLDER}: the versioning plan did not stamp it`);
  });

  it('passes a private library at the placeholder: the plan marks an untagged library private', () => {
    const root = tree({ 'dist/libs/a/package.json': lib('@mintplayer/a', PLACEHOLDER, { private: true }) });
    expect(libraries(root)).toEqual([{ name: '@mintplayer/a', version: PLACEHOLDER, private: true, problem: undefined }]);
  });

  it('returns nothing when dist/libs does not exist', () => {
    expect(libraries(tree({ 'readme.md': '' }))).toEqual([]);
  });
});

describe('holdsVersion', () => {
  it('finds the version as a string literal in any quote style', () => {
    expect(holdsVersion('const v={version:"22.28.0"}', '22.28.0')).toBe(true);
    expect(holdsVersion("x='22.28.0'", '22.28.0')).toBe(true);
    expect(holdsVersion('x=`22.28.0`', '22.28.0')).toBe(true);
  });

  it('does not match a longer version that merely contains it', () => {
    expect(holdsVersion('"22.28.01"', '22.28.0')).toBe(false);
    expect(holdsVersion('"122.28.0"', '22.28.0')).toBe(false);
  });
});

describe('scriptFiles', () => {
  it('lists .js and .mjs files recursively and nothing else', () => {
    const root = tree({ 'a.js': '', 'sub/b.mjs': '', 'sub/c.css': '', 'index.html': '' });
    expect(scriptFiles(root).map((file) => file.slice(root.length + 1).replaceAll('\\', '/')).sort()).toEqual(['a.js', 'sub/b.mjs']);
  });
});

describe('problemsOf', () => {
  it('passes when the client and the server bundle both carry the stamped version', () => {
    const root = tree({
      'libs/lib/package.json': pkg('22.28.0'),
      'dist/demo/browser/assets/main-abc.js': 'var p={version:"22.28.0"};',
      'dist/demo/server/main.server.mjs': 'export const v="22.28.0";',
    });
    expect(problemsOf(DEMO, root)).toEqual([]);
  });

  it('passes even when @angular/core-style code holds the placeholder literal beside the real version', () => {
    const root = tree({
      'libs/lib/package.json': pkg('22.28.0'),
      'dist/demo/browser/main.js': `e==="${PLACEHOLDER}"?"next":"v";var p={version:"22.28.0"};`,
      'dist/demo/server/chunk.mjs': `e==="${PLACEHOLDER}";export const v="22.28.0";`,
    });
    expect(problemsOf(DEMO, root)).toEqual([]);
  });

  it('fails an unstamped package.json without looking at the bundles', () => {
    const root = tree({ 'libs/lib/package.json': pkg(PLACEHOLDER) });
    expect(problemsOf(DEMO, root)).toEqual([`libs/lib/package.json still holds ${PLACEHOLDER}: the versioning plan did not stamp it`]);
  });

  it('fails a bundle dir that does not exist', () => {
    const root = tree({ 'libs/lib/package.json': pkg('22.28.0'), 'dist/demo/browser/main.js': '"22.28.0"' });
    expect(problemsOf(DEMO, root)).toEqual(['dist/demo/server does not exist; build demo first']);
  });

  it('fails a bundle built before the stamp', () => {
    const root = tree({
      'libs/lib/package.json': pkg('22.29.0'),
      'dist/demo/browser/main.js': 'var p={version:"22.28.0"};',
      'dist/demo/server/main.mjs': 'export const v="22.29.0";',
    });
    expect(problemsOf(DEMO, root)).toEqual(['no script under dist/demo/browser contains the version 22.29.0']);
  });
});

describe('main', () => {
  it('returns 0 and logs each library, without any demo', () => {
    const root = tree({
      'dist/libs/a/package.json': lib('@mintplayer/a', '22.1.0'),
      'dist/libs/b/package.json': lib('@mintplayer/b', PLACEHOLDER, { private: true }),
    });
    const log = vi.fn();
    const error = vi.fn();
    expect(main({ repoRoot: root, log, error })).toBe(0);
    expect(log).toHaveBeenCalledWith('check-demo-versions: OK  @mintplayer/a@22.1.0');
    expect(log).toHaveBeenCalledWith(`check-demo-versions: OK  @mintplayer/b@${PLACEHOLDER} (private, not published)`);
    expect(error).not.toHaveBeenCalled();
  });

  it('returns 1 and names every unstamped library', () => {
    const root = tree({
      'dist/libs/a/package.json': lib('@mintplayer/a', PLACEHOLDER),
      'dist/libs/b/package.json': lib('@mintplayer/b', PLACEHOLDER),
    });
    const error = vi.fn();
    expect(main({ repoRoot: root, log: vi.fn(), error })).toBe(1);
    expect(error.mock.calls[0][0]).toContain('@mintplayer/a: dist/libs/a/package.json still holds');
    expect(error.mock.calls[0][0]).toContain('@mintplayer/b: dist/libs/b/package.json still holds');
  });

  it('returns 1 when dist/libs holds no library, so a moved build output cannot pass silently', () => {
    const error = vi.fn();
    expect(main({ repoRoot: tree({ 'readme.md': '' }), log: vi.fn(), error })).toBe(1);
    expect(error).toHaveBeenCalledWith('check-demo-versions: dist/libs: no libraries found; build them first');
  });

  it('returns 0 and logs each demo when all carry their version', () => {
    const root = tree({
      ...STAMPED_LIBS,
      'libs/lib/package.json': pkg('1.2.3'),
      'dist/demo/browser/main.js': '"1.2.3"',
      'dist/demo/server/main.mjs': '"1.2.3"',
    });
    const log = vi.fn();
    const error = vi.fn();
    expect(main({ repoRoot: root, demos: [DEMO], log, error })).toBe(0);
    expect(log).toHaveBeenCalledWith('check-demo-versions: OK  demo');
    expect(error).not.toHaveBeenCalled();
  });

  it('returns 1 and names every failing demo', () => {
    const root = tree({ ...STAMPED_LIBS, 'libs/lib/package.json': pkg(PLACEHOLDER) });
    const error = vi.fn();
    expect(main({ repoRoot: root, demos: [DEMO, { ...DEMO, name: 'other' }], log: vi.fn(), error })).toBe(1);
    expect(error.mock.calls[0][0]).toContain('demo: libs/lib/package.json still holds');
    expect(error.mock.calls[0][0]).toContain('other: libs/lib/package.json still holds');
  });

  it('lists no demo: seo-demo shows no version', () => {
    expect(DEMOS).toEqual([]);
  });
});
