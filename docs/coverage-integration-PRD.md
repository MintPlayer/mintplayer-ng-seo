# PRD — Code coverage integration for `mintplayer-ng-seo`

**Status:** Implemented (local verification complete; CI unverified)
**Date:** 2026-09-18
**Owner:** PieterjanDeClippel

---

## 1. Goal

Publish code-coverage reports for every project in this Nx workspace to
**https://coverage.mintplayer.com**, using the pipeline already running in
`mintplayer-ng-bootstrap`, and migrate the test runner from Jest to Vitest along the way.

Success looks like:

- `https://coverage.mintplayer.com/r/MintPlayer/mintplayer-ng-seo` shows a report for every
  push to `master`.
- Pull requests get `coverage/project` and `coverage/patch` check runs, published by the
  service (not by this repo's workflows).
- A coverage badge in `README.md`.
- All 7 test targets run on Vitest, matching ng-bootstrap.

### Out of scope

- Coverage thresholds / CI failure gates. Deliberately deferred — see §8.
- Writing tests for the three libs that currently have none. This PRD only makes their 0%
  **visible**.
- **Going zoneless.** See the decision in §5 — tests stay zone-based.
- Cypress e2e coverage instrumentation (`apps/seo-demo-e2e`).

---

## 2. How the established pipeline works

- **coverage.mintplayer.com is MintPlayer's own self-hosted service**, source in
  `MintPlayer/MintPlayer.Spark` → `apps/CodeCoverage/`. Not Codecov.
- Upload goes through `MintPlayer/MintPlayer.Spark/apps/CodeCoverage/action@coverage-upload-v1`,
  which POSTs `multipart/form-data` to `/api/uploads` with `repository`, `commitSha`, `runId`,
  `runAttempt`, the report `files`, and a `fileList` from `git ls-files`. Max 50 MB.
- **Report format is sniffed, not declared.** lcov and Cobertura both accepted.
- **The server merges the uploaded reports** — multiple per-project `lcov.info` files upload
  in one call. No local merge step, and none of the other repos has one.
- **Auth:** `token: ${{ secrets.COVERAGE_TOKEN }}` — the only secret required.
- **Onboarding:** no per-repo folder to create. The Coverage GitHub App is installed on the
  `MintPlayer` org and the token is bound to the org's numeric GitHub id, so the org-wide
  secret already covers this repo. The repository record is created by the first upload.
- **URLs:** page `…/r/{owner}/{repo}`, badge `…/badge/{owner}/{repo}.svg`.
- The service publishes the check runs itself — the workflows contain no gate step.

### Which repo is the reference

| Repo | Angular libs run on | Use as template for |
|---|---|---|
| `mintplayer-ng-bootstrap` | **Vitest** (`@analogjs/vitest-angular:test`) | Vitest config, test-setup, nx.json, rebase script |
| `mintplayer-ng-video-player` | Jest | nothing — its Vitest deps serve a Vue app only |

ng-bootstrap is on Angular `~22.0.0` — **identical to this repo** — and Nx 23.1.1 vs our
22.7.5. The `@analogjs/vitest-angular:test` executor is Nx-version-independent and
`@nx/vite` 22.7.5 exposes `nx-tsconfig-paths.plugin`, so the setup ports unchanged.

---

## 3. Current state of this repo

**Runner:** Jest (`jest@30.2.0`, `jest-preset-angular@^16.1.5`, `ts-jest@^29.4.11`),
Nx 22.7.5, Angular ~22.0.0, `zone.js ~0.16.0`.

| Project | Path | Specs | Notes |
|---|---|---|---|
| `seo-demo` | `apps/seo-demo` | 6 | `coverageDirectory` in `jest.config.ts`; only file using `jest.fn()` |
| `seo-demo-e2e` | `apps/seo-demo-e2e` | — | no `test` target, cypress only |
| `mintplayer-ng-seo` | `libs/mintplayer-ng-seo` | 4 | `coverageDirectory` in `jest.config.ts` |
| `mintplayer-ng-base-url` | `libs/mintplayer-ng-base-url` | **0** | |
| `mintplayer-ng-router` | `libs/mintplayer-ng-router` | 2 | |
| `mintplayer-ng-router-provider` | `libs/mintplayer-ng-router-provider` | **0** | |
| `mintplayer-ng-share-buttons-demo` | `libs/mintplayer-ng-share-buttons` | 4 | project name ≠ directory name |
| `mintplayer-script-loader` | `libs/mintplayer-script-loader` | **0** | ts-jest, not jest-preset-angular |

### Migration surface — small

- **17 spec files** total.
- **Only Jest-specific API in the entire repo: 6 `jest.fn()` calls**, all in
  `apps/seo-demo/src/app/app.component.spec.ts` → `vi.fn()`. No `jest.mock`, no `spyOn`, no
  fake timers, no `jest.requireActual`.
- **Zero `fakeAsync` / `tick` / `waitForAsync`.** Only 13 `detectChanges` and 1 `whenStable`,
  all of which behave the same under Vitest.
- 6 identical two-line `test-setup.ts` files (`setupZoneTestEnv()` from jest-preset-angular).
- `globals: true` + `types: ["vitest/globals"]` means `describe`/`it`/`expect` need no import
  changes.

The risk in this migration is in the build wiring, not the specs.

### Problems found

1. **CI tests one project, not seven.** All three workflows run
   `npm run test --watch=false --parallel=true`, which resolves to a bare `nx test` — npm
   swallows the flags without a `--` separator, and `nx test` with no project runs only
   `defaultProject` (`seo-demo`). Fix this first or the published number is meaningless.
2. **Vitest 4 removed `coverage.all`.** Without an explicit `coverage.include`, a source file
   no test imports is *absent* from the report rather than 0%. Same trap as Jest's missing
   `collectCoverageFrom` — the three zero-spec libs would report nothing and the number would
   be flattering and wrong.
3. **`outputs[]` must match `reportsDirectory`.** On a cache hit Nx restores only what
   `outputs` declares; a mismatch means the upload silently ships stale or absent reports.
4. **`nx affected` uploads a subset.** The action's `partial: true` is **load-bearing** —
   without it the server reads the subset as a whole-workspace total and the PR reads as a
   coverage collapse.
5. **Vitest needs the path-rebase script.** See §6 — this is the single highest-risk item.
6. **Committed secret (pre-existing, out of band).** `nx.json:68` has a plaintext
   `nxCloudAccessToken`, committed in `43dfb27`. Rotate it and move it to
   `NX_CLOUD_ACCESS_TOKEN` while the CI files are open anyway.

---

## 4. Why Jest → Vitest belongs in this PR

Doing it *after* the coverage work would mean writing `jest.preset.js` reporter config,
per-project `collectCoverageFrom`, and `coverageDirectory` normalisation — then deleting all
of it. The Vitest migration **replaces** that work rather than adding to it.

It also aligns the repo with ng-bootstrap, so future coverage changes apply to both.

Honest counterweight: this converts a config-only PR into a runner migration. The mitigation
is the small surface in §3 and the verification gate in §7 step 1 — if Vitest can't
reproduce the current pass rate, stop and reconsider before touching CI.

---

## 5. Decision: tests stay zone-based

ng-bootstrap's `test-setup.ts` uses `provideZonelessChangeDetection()`. **We are not copying
that.** This repo still ships `zone.js ~0.16.0` and a zone-based app; going zoneless in tests
only would decouple test and runtime change-detection semantics, and going zoneless
everywhere is a separate migration that should not ride along inside a coverage PR.

Our `test-setup.ts` therefore keeps the zone import:

```ts
import 'zone.js';
import 'zone.js/testing';
import { getTestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';

getTestBed().initTestEnvironment(
  BrowserTestingModule,
  platformBrowserTesting(),
  { teardown: { destroyAfterEach: true } }
);
```

Revisit once the app itself goes zoneless.

---

## 6. Plan

Single PR, all changes together.

### M1 — Fix the CI test invocation

Replace the broken `npm run test --watch=false --parallel=true` in `pull-request.yml` and
`publish-master.yml`; uncomment and replace the commented-out step in `build-any.yml`.
`package.json` → `"test": "nx run-many -t test --all"`. Verify seven projects execute, not one.

### M2 — Migrate to Vitest

**Dependencies.** Add `@analogjs/vitest-angular@^2.6.4`, `@analogjs/vite-plugin-angular@^2.6.4`
(explicit, though it arrives transitively), `vitest@~4.1.0`, `@vitest/coverage-v8@^4.0.16`,
`jsdom@^27.2.0`, `vite@^6.4.1`, `@nx/vite@22.7.5`, `@nx/vitest@22.7.5`. Pin `vite ^6` to match
ng-bootstrap. Remove `jest`, `jest-preset-angular`, `ts-jest`, `@types/jest`,
`jest-environment-jsdom`, and any `jest-preset-angular` overrides block.

**Per project**, replace `jest.config.ts` with `vitest.config.ts`:

```ts
import { coverageConfigDefaults, defineConfig } from 'vitest/config';
import angular from '@analogjs/vite-plugin-angular';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';

export default defineConfig({
  plugins: [angular({ jit: true, tsconfig: 'tsconfig.spec.json' }), nxViteTsPaths()],
  test: {
    name: '<project-name>',
    globals: true,
    environment: 'jsdom',
    setupFiles: ['src/test-setup.ts'],
    include: ['src/**/*.spec.ts'],
    reporters: ['default'],
    pool: 'forks',
    coverage: {
      provider: 'v8',
      // Vitest 4 removed `coverage.all`: without an explicit `include`, a source
      // file no test imports is absent from the report rather than 0%.
      include: ['src/**/*.ts'],
      exclude: [...coverageConfigDefaults.exclude, '**/*.d.ts', '**/test-setup.ts'],
      reporter: ['lcov'],
      reportsDirectory: '../../coverage/libs/<lib>',   // apps/<app> for seo-demo
    },
  },
});
```

`reportsDirectory` is resolved against the project dir, so this lands at
`<workspaceRoot>/coverage/libs/<lib>/lcov.info` — matching the upload glob.

`tsconfig.spec.json` per project:

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "outDir": "../../dist/out-tsc",
    "types": ["vitest/globals", "node"],
    "isolatedModules": true
  },
  "files": ["src/test-setup.ts"],
  "include": ["./**/*.test.ts", "./**/*.spec.ts", "./**/*.d.ts", "./vitest.config.ts"]
}
```

`test-setup.ts` per project — the zone-based version from §5.

`project.json` test target per project:

```json
"test": {
  "executor": "@analogjs/vitest-angular:test",
  "outputs": ["{workspaceRoot}/coverage/libs/<lib>"],
  "options": { "configFile": "vitest.config.ts" }
}
```

Note: **not** `@nx/vite:test`, **not** `@nx/vitest:test`, and **not** Angular 22's built-in
`@angular/build:unit-test` — ng-bootstrap uses none of those. Build targets stay
`@nx/angular:package`.

**Root:** add a `vitest.config.ts` aggregator with
`test.projects: ['apps/*/vitest.config.ts', 'libs/*/vitest.config.ts']`; delete
`jest.preset.js` and the root `jest.config.ts`.

**`nx.json`:** set `unitTestRunner: "vitest-analog"` in the angular generators; replace the
`@nx/jest:jest` targetDefault with:

```json
"@analogjs/vitest-angular:test": {
  "inputs": ["default", "^production"],
  "cache": true,
  "outputs": ["{workspaceRoot}/coverage/{projectRoot}"],
  "options": { "passWithNoTests": true },
  "configurations": { "ci": { "coverage": true } }
}
```

and in the `production` namedInput swap `!{projectRoot}/jest.config.[jt]s` for
`!{projectRoot}/vitest.config.[jt]s`.

**Specs:** change the 6 `jest.fn()` → `vi.fn()` in
`apps/seo-demo/src/app/app.component.spec.ts`. Nothing else.

`libs/mintplayer-script-loader` is plain TS (ts-jest, no Angular) — it can use the same
config minus the `angular()` plugin and the `test-setup.ts` line.

### M3 — Copy the path-rebase script

Copy `tools/scripts/rebase-lcov-paths.mjs` (and its spec) from ng-bootstrap. **This is
mandatory under Vitest**, see §7.

### M4 — Wire the upload

All three workflows need `fetch-depth: 0` on checkout.

`pull-request.yml`:

```yaml
- name: Test
  run: npx nx affected -t test --coverage --parallel=2 --output-style=stream --base=${{ github.event.pull_request.base.sha }} --head=${{ github.event.pull_request.head.sha }}

- name: Rebase coverage paths to workspace-relative
  run: node tools/scripts/rebase-lcov-paths.mjs

- name: Upload coverage
  if: github.event.pull_request.head.repo.full_name == github.repository
  continue-on-error: true
  uses: MintPlayer/MintPlayer.Spark/apps/CodeCoverage/action@coverage-upload-v1
  with:
    url: https://coverage.mintplayer.com
    token: ${{ secrets.COVERAGE_TOKEN }}
    files: |
      coverage/libs/*/lcov.info
      coverage/apps/*/lcov.info
    disable-search: true
    flags: pr
    partial: true
    base-sha: ${{ github.event.pull_request.base.sha }}
    finish: true
    fail-ci-if-error: false
```

The fork guard is required — repo secrets and OIDC are unavailable to fork PRs.
`disable-search: true` matters: without it an empty glob silently falls back to
auto-detection and uploads whatever it finds.

Note the flag is now `--coverage` (Vitest), not `--codeCoverage` (Jest). This is the one
place the migration simplifies the CI wiring.

`publish-master.yml` — `run-many --all`, not `affected`, because this is the run whose number
becomes the headline and a partial set reads as a collapse:

```yaml
- name: Test
  run: npx nx run-many -t test --all --coverage --parallel=2 --output-style=stream

- name: Rebase coverage paths to workspace-relative
  run: node tools/scripts/rebase-lcov-paths.mjs

- name: Upload coverage
  uses: MintPlayer/MintPlayer.Spark/apps/CodeCoverage/action@coverage-upload-v1
  with:
    url: https://coverage.mintplayer.com
    token: ${{ secrets.COVERAGE_TOKEN }}
    files: |
      coverage/libs/*/lcov.info
      coverage/apps/*/lcov.info
    disable-search: true
    flags: unit
    finish: true
    fail-ci-if-error: false
```

`build-any.yml` (non-master branch pushes) uploads too. No meaningful base sha exists, so it
runs the full set rather than `affected` — and therefore **no `partial: true`**, since the
upload is a complete total:

```yaml
- name: Test
  run: npx nx run-many -t test --all --coverage --parallel=2 --output-style=stream

- name: Rebase coverage paths to workspace-relative
  run: node tools/scripts/rebase-lcov-paths.mjs

- name: Upload coverage
  continue-on-error: true
  uses: MintPlayer/MintPlayer.Spark/apps/CodeCoverage/action@coverage-upload-v1
  with:
    url: https://coverage.mintplayer.com
    token: ${{ secrets.COVERAGE_TOKEN }}
    files: |
      coverage/libs/*/lcov.info
      coverage/apps/*/lcov.info
    disable-search: true
    flags: branch
    finish: true
    fail-ci-if-error: false
```

`flags: branch` keeps these distinguishable from `pr` and `unit` in the service.

### M5 — Badge + housekeeping

```markdown
[![Coverage](https://coverage.mintplayer.com/badge/MintPlayer/mintplayer-ng-seo.svg)](https://coverage.mintplayer.com/r/MintPlayer/mintplayer-ng-seo)
```

Rotate the `nxCloudAccessToken` (§3.6) and move it to a secret.

---

## 7. Why the rebase script is mandatory under Vitest

This is the highest-risk item in the PRD, and it is the one thing Jest was getting right for
free.

Vitest writes `SF:` paths inside `lcov.info` **relative to each project's own vitest root**,
so `libs/foo/src/index.ts` is emitted as `src/index.ts`. The coverage service resolves report
paths against `git ls-files` by longest suffix, and **silently drops** any path whose suffix is
ambiguous across projects. Measured on ng-bootstrap PR #405: **314 of 1405 files (22.3%)
excluded from the totals**, including ~58% each of two libs.

This repo is especially exposed: six of the seven projects have a `src/index.ts`.

`rebase-lcov-paths.mjs` rewrites each `SF:` to workspace-relative, deriving the prefix from
the report's own directory minus the leading `coverage/`, and fails loudly if a rewritten path
doesn't resolve on disk. It is idempotent.

**Do not skip this step, and do not reorder it after the upload.**

---

## 8. Verification — results

Measured on 2026-09-18, all seven projects, branch `feature/code-coverage`.

| Gate | Result |
|---|---|
| 1. Vitest reproduces the Jest pass rate | **PASS** — 16 suites / 22 tests, identical to baseline |
| 2. Seven non-empty lcov reports, spec-less libs at 0% not blank | **PASS** |
| 3. `SF:` paths rebase to workspace-relative, idempotently | **PASS** |
| 4. Nx cache hit still leaves reports on disk | **PASS** |
| 5. PR upload succeeds, check runs appear | **not yet run** |
| 6. Badge renders on master | **not yet run** |

### Speed

Per-project suite time, Jest vs Vitest:

| Project | Jest | Vitest |
|---|---|---|
| seo-demo | 26.9s | 7.2s |
| mintplayer-ng-seo | 69.2s | 5.8s |
| mintplayer-ng-share-buttons | 18.2s | 6.3s |
| mintplayer-ng-router | 72.7s | 4.4s |
| **total suite time** | **~187s** | **~24s** |

### Baseline coverage

Printed by `rebase-lcov-paths.mjs` before upload:

```
  project                             files                   lines                branches
  apps/seo-demo                          15          17/38 (44.74%)            1/6 (16.67%)
  libs/mintplayer-ng-base-url            10            0/48 (0.00%)            0/32 (0.00%)
  libs/mintplayer-ng-router               9          19/78 (24.36%)            2/50 (4.00%)
  libs/mintplayer-ng-router-provider      5             0/5 (0.00%)                       -
  libs/mintplayer-ng-seo                 16         93/143 (65.03%)          45/73 (61.64%)
  libs/mintplayer-ng-share-buttons        8           8/103 (7.77%)            0/42 (0.00%)
  libs/mintplayer-script-loader           3            0/43 (0.00%)            0/20 (0.00%)
  TOTAL                                  66        137/458 (29.91%)         48/223 (21.52%)
```

### Confirmed during implementation

- **The rebase script was necessary, as predicted.** Vitest emitted
  `SF:canonical-url\index.ts` and `SF:src\main.ts`; six of seven projects have a
  `src/`, so suffix matching would have dropped them. All 66 paths resolve after
  rebasing.
- **The `src/**` include glob was wrong.** `mintplayer-ng-seo` and
  `mintplayer-ng-share-buttons` are secondary-entrypoint libraries with specs
  under `<lib>/<entrypoint>/src/`; the first run found 9 of 16 spec files. Fixed
  to `**/*.spec.ts`.
- **13 specs used `declarations` for standalone components.** Angular 22 makes
  components standalone by default; Jest tolerated it, JIT rejects it. Merged
  into `imports`.

## 9. Prerequisites

- [ ] `COVERAGE_TOKEN` reachable from this repo — confirm the org-wide secret exists, or issue
      a repo-scoped `covt_` token from coverage.mintplayer.com.
- [ ] Coverage GitHub App installed on the `MintPlayer` org (already true if the other repos
      report).

---

## 10. Deferred

**Thresholds.** Do not enable a coverage gate in this PR. `coverage.include` will pull the
three zero-spec libs in at 0% and a global threshold would fail CI immediately. Land the
reporting, read the real numbers off coverage.mintplayer.com, then set a threshold at or just
below the observed baseline in a follow-up.

**A vacuously-passing test.** `advanced-router-link.directive.spec.ts >
should have the correct hrefs` wraps its assertions in
`fixture.whenStable().then(...)` without returning or awaiting the promise, so
they run after the test has already passed and the test asserts nothing. Vitest
surfaces this as a stderr `AssertionError` on every run; Jest hid it. The
underlying assertion genuinely fails — the hrefs are `null`. Left as-is here
because fixing it turns CI red on a real defect that predates this work, and
it needs its own investigation. It is one of the 22 tests counted above, so the
true passing count is 21.

**Zoneless.** See §5. Once the app drops `zone.js`, revisit `test-setup.ts` to match
ng-bootstrap's `provideZonelessChangeDetection()`.
