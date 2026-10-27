#!/usr/bin/env node
/**
 * Guard for docs/release-pipeline-alignment-PRD.md (M1), ported from
 * mintplayer-ng-bootstrap: every published library, and every demo that shows
 * a version, must carry the version the run releases.
 *
 * The library package.json files hold 0.0.0-PLACEHOLDER; the versioning
 * action's `phase: plan` stamps the real version into them (source and
 * dist/libs) in the `build` job. This runs after that and fails when a library
 * about to be published still holds the placeholder. A library the plan marks
 * `"private": true` (no tag yet) is not published, so it is skipped.
 *
 * seo-demo shows no version, so DEMOS is empty. A demo that starts showing one
 * gets an entry here; for it the guard asserts PRESENCE of the stamped version
 * in its bundles, never absence of the placeholder: @angular/core ships the
 * literal 0.0.0-PLACEHOLDER in its own code.
 *
 * Usage (from the workspace root, after the plan step and the demo build):
 *   node tools/scripts/check-demo-versions.mjs
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { runCli } from './lib/cli.mjs';

export const REPO_ROOT = resolve(import.meta.dirname, '../..');
export const PLACEHOLDER = '0.0.0-PLACEHOLDER';

/** The build output of the published libraries, as publish-npm-packages reads it. */
export const LIBS_DIR = 'dist/libs';

/**
 * Each demo that shows a library version, the library whose version it shows,
 * and its bundle dirs. For example:
 *   { name: 'seo-demo', packageJson: 'libs/mintplayer-ng-seo/package.json', bundles: ['dist/apps/seo-demo'] }
 */
export const DEMOS = [];

const SCRIPT = /\.(m?js)$/;

/** Every .js / .mjs file under dir, recursively. */
export function scriptFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory()
      ? scriptFiles(join(dir, entry.name))
      : SCRIPT.test(entry.name) ? [join(dir, entry.name)] : [],
  );
}

/** Whether `source` holds `version` as a string literal, in any quote style a minifier may print. */
export const holdsVersion = (source, version) =>
  ['"', "'", '`'].some((quote) => source.includes(`${quote}${version}${quote}`));

/** What is wrong with one demo, as human-readable lines. Empty when it carries its version. */
export function problemsOf(demo, repoRoot) {
  const { version } = JSON.parse(readFileSync(resolve(repoRoot, demo.packageJson), 'utf8'));
  if (version === PLACEHOLDER) return [`${demo.packageJson} still holds ${PLACEHOLDER}: the versioning plan did not stamp it`];
  return demo.bundles.flatMap((bundle) => {
    const dir = resolve(repoRoot, bundle);
    if (!existsSync(dir)) return [`${bundle} does not exist; build ${demo.name} first`];
    return scriptFiles(dir).some((file) => holdsVersion(readFileSync(file, 'utf8'), version))
      ? []
      : [`no script under ${bundle} contains the version ${version}`];
  });
}

/**
 * Every library under LIBS_DIR, as { name, version, private, problem }. `problem`
 * is set when a library that will be published still holds the placeholder.
 */
export function libraries(repoRoot) {
  const dir = resolve(repoRoot, LIBS_DIR);
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && existsSync(join(dir, entry.name, 'package.json')))
    .map((entry) => {
      const file = `${LIBS_DIR}/${entry.name}/package.json`;
      const pkg = JSON.parse(readFileSync(resolve(repoRoot, file), 'utf8'));
      const unstamped = pkg.private !== true && pkg.version === PLACEHOLDER;
      return {
        name: pkg.name,
        version: pkg.version,
        private: pkg.private === true,
        problem: unstamped ? `${file} still holds ${PLACEHOLDER}: the versioning plan did not stamp it` : undefined,
      };
    });
}

/** The guard: 1 when a library or demo lacks its version, 0 when all carry it. */
export function main({ repoRoot = REPO_ROOT, demos = DEMOS, log = console.log, error = console.error } = {}) {
  const libs = libraries(repoRoot);
  const failures = libs.length === 0 ? [`${LIBS_DIR}: no libraries found; build them first`] : [];
  for (const lib of libs) {
    if (lib.problem) failures.push(`${lib.name}: ${lib.problem}`);
    else log(`check-demo-versions: OK  ${lib.name}@${lib.version}${lib.private ? ' (private, not published)' : ''}`);
  }
  for (const demo of demos) {
    const problems = problemsOf(demo, repoRoot);
    if (problems.length === 0) log(`check-demo-versions: OK  ${demo.name}`);
    failures.push(...problems.map((problem) => `${demo.name}: ${problem}`));
  }
  if (failures.length === 0) return 0;
  error(`check-demo-versions: ${failures.join('\ncheck-demo-versions: ')}`);
  return 1;
}

runCli(import.meta.url, main);
