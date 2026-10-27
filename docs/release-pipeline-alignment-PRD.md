# PRD — Align the release pipeline with `mintplayer-ng-bootstrap`

**Issue:** [#26](https://github.com/MintPlayer/mintplayer-ng-seo/issues/26)
**Status:** Implemented — local verification done; master run pending
**Date:** 2026-10-27
**Owner:** PieterjanDeClippel

---

## 1. Goal

Make `.github/workflows/publish-master.yml` run the same pipeline as `mintplayer-ng-bootstrap`'s
(reference since [ng-bootstrap#447](https://github.com/MintPlayer/mintplayer-ng-bootstrap/pull/447),
commit `fd49127e`). Adapt it only where this repo differs: one demo (`seo-demo`), no version shown
in the demo, no SSR, and nginx instead of a Node server.

Success (from the issue):

- The master run is green.
- The plan step runs in **server** mode.
- The version guard passes.
- The published packages carry the released versions, and the image is built from the stamped,
  tested `dist`.
- The master run is **not slower** than today (baseline in §3.3).

"Match ng-bootstrap" covers the **other workflows** as well (see the decisions grilled on
2026-10-27 in §4):
- a reusable `test.yml`
- a `setup` composite action
- `pull-request.yml` with ng-bootstrap's job layout
- the self-hosted Nx cache
- an SSH deploy to the VPS

### Out of scope

- Showing a version in `seo-demo`, with its `dev` fallback and e2e version test. If that is ever
  wanted, add an entry to `DEMOS` (M1) and port ng-bootstrap's fallback and e2e test.
- ~~Running the Cypress `seo-demo-e2e` in CI.~~ Brought into scope after review: the e2e moved to
  Playwright and runs in `pull-request.yml` (see §8, "Added after review").

---

## 2. How the reference pipeline works

### 2.1 Jobs in ng-bootstrap's `publish-master.yml`

| Job | needs | Permissions | What it does |
|---|---|---|---|
| `build` | – | `contents: read`, `id-token: write` | Builds the libraries, then runs **plan**, builds the demos (`--exclude-task-dependencies`), runs the guard, and uploads `dist` (retention 1 day). Exposes the plan as a job output (`plan`). |
| `tests` | – | – | Reusable `test.yml`, run in parallel with `build`. Uploads `coverage-*` artifacts. |
| `coverage` | `tests` | – | Downloads `coverage-*`, runs `rebase-lcov-paths.mjs`, uploads. A side job, not a publish gate. |
| `docker` | `build`, `tests` | `packages`, `id-token`, `attestations`, `artifact-metadata: write` | Downloads `dist`, builds target `prebuilt` with `build-contexts: dist=dist/apps/<app>`, pushes, attests. |
| `publish-libs` | `build`, `tests` | `contents: write`, `packages: write`, `id-token: write` | Downloads `dist`, runs **release** with `plan: ${{ needs.build.outputs.plan }}`, then `publish-npm-packages` on `dist/libs`. |
| `deploy` | `docker` | – | SSH deploy. |
| `publish-master` | all, `if: always()` | – | Aggregator. Fails if any job failed or was cancelled. |

The reference steps, quoted verbatim:

```yaml
- name: Plan the package versions
  id: plan
  uses: MintPlayer/MintPlayer.Spark/apps/CodeCoverage/versioning-action@14900a6057ee305ac9b03690fcb2ff989452e2eb # versioning-v1.1.0
  with:
    phase: plan
# ...
- name: Release the planned versions
  uses: MintPlayer/MintPlayer.Spark/apps/CodeCoverage/versioning-action@14900a6057ee305ac9b03690fcb2ff989452e2eb # versioning-v1.1.0
  with:
    phase: release
    plan: ${{ needs.build.outputs.plan }}
```

### 2.2 The versioning action at `14900a60` (versioning-v1.1.0)

This version adds the inputs `phase` (`all` | `plan` | `release`, default `all`) and `plan`, and the
outputs `plan` and `all-versions`. Nothing was removed, so the current single-step use keeps
working. The phases come from MintPlayer.Spark#552, which is an issue, not a PR. That issue proposes
a `plan-file` input, but the shipped action passes the plan through a job output instead.

- **`plan`**
  - Decides the versions without writing any tag.
  - Stamps every publishable npm `package.json`, both the source file and the build-output copy in
    `dist/libs`.
  - A package that releases gets its new version. Any other package gets its highest tag reachable
    from HEAD.
  - A package with no tag that is still `0.0.0-PLACEHOLDER` gets **`"private": true`** and a
    warning, so it is not published.
  - Needs the built libraries (it hashes the `.d.ts` API), so it runs *after* the library build.
- **`release`**
  - Writes exactly the planned tags and stamps again (idempotent), so the job does not need the
    stamped files to publish correctly.
  - Refuses a plan whose commit or branch differs from the current run. It also refuses a
    `stale-plan`, where any version tag moved between plan and release. The recovery is "Re-run all
    jobs".
- **Mode**
  - The mode comes from the `mode` input, else `versioning.mode` in `coverage.yml` (here `server`),
    else `server`.
  - The action falls back to `local` on a missing OIDC token, a network error, a timeout or a 5xx,
    and logs `<url> is unavailable (<reason>); versioning with the local engine instead.`
  - **There is no explicit "server mode" log line.** The evidence is the `mode` output plus the
    absence of that warning (see §6).
- **Permissions:** the plan job needs `contents: read` and `id-token: write`. Without `id-token`, the
  action silently falls back to local mode. The release job needs `contents: write` (tags, and the
  local fallback) and `id-token: write`.
- The action deepens a shallow clone itself, so `fetch-depth: 0` is not required.
- It does nothing (`skipped`) on PR and tag runs.

### 2.3 The guard `tools/scripts/check-demo-versions.mjs`

- 86 lines. It imports `runCli` from `tools/scripts/lib/cli.mjs` (53 lines), which must be ported
  too.
- `DEMOS` is a hardcoded list of `{ name, packageJson, bundles[] }`. For each demo, it fails when:
  - the `package.json` still holds `0.0.0-PLACEHOLDER`,
  - a bundle directory is missing,
  - or no `.js` or `.mjs` file in the bundle contains the version as a string literal.
- It never asserts that the placeholder is absent from the bundles, because `@angular/core` ships
  that literal itself.
- The spec, `check-demo-versions.spec.ts` (121 lines), is a Vitest file run through an Nx `tools`
  project:
  - `tools/project.json` uses executor `@nx/vitest:test` with `reportsDirectory: coverage/tools`.
  - `tools/vitest.config.ts` includes `**/*.spec.ts`, with v8 lcov coverage over `scripts/**/*.mjs`.
  - That coverage is uploaded as `coverage/tools/lcov.info`.

Verbatim copies of the reference files are saved in the session scratchpad (`publish-master.yml`,
`check-demo-versions.mjs`, its spec, `lib/cli.mjs`, the demo Dockerfile, and the ng-bootstrap PRD).
They can always be fetched again from ng-bootstrap master.

---

## 3. Current state of this repo

### 3.1 `publish-master.yml`

It runs one job, `build`, with these steps in order:

1. `npm ci`
2. `npm run build -- --configuration=production` (this is `nx build` of `defaultProject: seo-demo`;
   it builds the libraries through `^build`)
3. Run the tests
4. Rebase the lcov paths
5. Upload coverage
6. **Version the packages** (`fc5aa28d # versioning-v1`, phase `all`, *after* the build)
7. `publish-npm-packages` on `dist/libs`
8. Docker build and push to GHCR
9. Attestation (`attest-build-provenance@v1`)
10. The deploy hook, commented out

### 3.2 Other relevant facts

- **Root `Dockerfile`:** runs `npm install` and `npm run build` inside `node:latest`, then copies
  `dist/apps/seo-demo` and its `nginx.conf` into `nginx:latest`. There is no `.dockerignore`.
- **`seo-demo` build output:** `outputPath: { base: dist/apps/seo-demo, browser: "" }`, so the files
  sit directly in `dist/apps/seo-demo`, and `nginx.conf` is copied there as an asset.
- **The demo imports the libraries from source** through `tsconfig.base.json` path aliases, not
  from `dist`. Building it with `--exclude-task-dependencies` should therefore not need `dist/libs`
  (see S1).
- **Libraries:** all six are at `0.0.0-PLACEHOLDER` in source, and all six have a tag
  (`@mintplayer/ng-seo/v22.1.0`, `script-loader/v2.0.0`, …). After the plan step, every one of them
  must hold a real version.
- **Tests:** the root `vitest.config.ts` only includes `apps/*` and `libs/*`. There is no `tools`
  project yet, but `@nx/vitest` 22.7.5 is installed.
- **Other workflows:** `pull-request.yml` and `build-any.yml` also run tests and upload coverage
  with the same `coverage/libs/*` and `coverage/apps/*` globs.

### 3.3 Speed baseline

| Run | Wall clock | Notes |
|---|---|---|
| 40204499665 (db2a72e, 2026-10-25) | **3 min 28 s** | `npm ci` 55 s, build 3 s and tests 3 s (Nx Cloud hits), versioning 28 s, **docker build 92 s** (`npm install` and build inside the image) |
| 35335357312 (7738cda) | 3 min 11 s | |

The 92 s in-image rebuild is the budget this change frees up. The new critical path is
`build` (`npm ci` + library build + plan + demo build + upload), then `docker`, which needs no
`npm ci` and copies static files into nginx. It is expected to land at or under the baseline. S5
checks this.

---

## 4. Decisions

All of these were settled in a grilling session on 2026-10-27. The owner's guiding rule was "the
workflows should mimic the ng-bootstrap workflows".

| # | Decision | Rationale |
|---|---|---|
| D1 | **A reusable `.github/workflows/test.yml`** (`workflow_call`, no inputs), called by `publish-master.yml` and `pull-request.yml`. It runs `nx run-many -t test --all --coverage` (**never `affected`**) and uploads `coverage/` as artifact `coverage`. | Matches ng-bootstrap. Each project's `test` target declares its coverage directory as a cached output, so with `run-many` an unaffected project's report is restored from the Nx cache, not regenerated. The coverage upload then still covers every project. With one definition, the test command and coverage paths can't drift. |
| D2 | **A `.github/actions/setup` composite action:** setup-node 24, an `actions/cache@v4` cache of `node_modules` keyed on `package-lock.json` plus the Node version, `npm ci` on a miss, and `npm run postinstall` on a hit. | Ported from ng-bootstrap, without its dotnet input. This repo's postinstall is `decorate-angular-cli.js`. ng-bootstrap measured about 30 s saved per job, which pays for the extra jobs. |
| D3 | **Delete `build-any.yml`.** | ng-bootstrap has no equivalent. On a branch with an open PR, every push runs CI twice. The accepted cost is that a branch pushed without a PR gets no CI. |
| D4 | **Restructure `pull-request.yml` like ng-bootstrap's.** It gets these jobs: `build` (uploads `dist`), `tests` (`test.yml`), `coverage` (`flags: pr`, fork guard, `base-sha`), `dry-run-publish-libs`, and a `pull-request` aggregator. Drop `npm ci --force`. | Parity. `--force` dates from the Angular 18 upgrade (5bddf55), and `publish-master` already runs a plain `npm ci` without it. |
| D5 | **Use the self-hosted Nx cache.** Workflow-level `env` gets `NX_SELF_HOSTED_REMOTE_CACHE_SERVER: secrets.NX_CACHE_SERVER`, and `NX_SELF_HOSTED_REMOTE_CACHE_ACCESS_TOKEN` is `NX_CACHE_RW_TOKEN` on a push to the default branch, otherwise `NX_CACHE_RO_TOKEN`. **Remove `nxCloudAccessToken` from `nx.json`.** | Parity. Traefik on the VPS blocks writes from the read-only token. This also removes the committed Nx Cloud token from the repo. **Manual step:** revoke that token in Nx Cloud, because it stays in git history. The first run after the switch starts with a cold cache. |
| D6 | **Add a `publish-master` aggregator job.** | Parity. One status to look at. |
| D7 | **Move the Dockerfile to `apps/seo-demo/Dockerfile`.** Its stages are `prebuilt` (CI: `FROM nginx` + `COPY --from=dist . /usr/share/nginx/html` + `COPY --from=dist nginx.conf /etc/nginx/conf.d/default.conf`), `builder`, and `standalone` (local, the default). Delete the root `Dockerfile`. | Mirrors ng-bootstrap's demo Dockerfiles. The CI image never runs `npm install`, and plain `docker build` still works locally. |
| D8 | **Upgrade the action versions to the ones the reference uses:** checkout@v6, setup-node@v6, upload-artifact@v7, download-artifact@v8, login@v4, metadata@v6, build-push@v7, attest-build-provenance@v4 (plus `artifact-metadata: write`). In the docker job, split build (`push: false, load: true`) from push, using the reference's push-retry step for the GHCR "unknown blob" race. | Mimicking includes these. The issue's "push and attestation stay as they are" means they stay in the pipeline, not that their versions stay frozen. |
| D9 | **Use `fail-ci-if-error: true` on the master coverage upload,** as the reference does. | Parity. The trap is that an outage of coverage.mintplayer.com turns the aggregator red even though publishing succeeded. |
| D10 | **The guard checks the published libraries even with `DEMOS = []`** (M1). It checks `dist/libs`, not the source files. | The issue requires it. `dist` is what gets published, and the plan step stamps both copies. |
| D11 | **Deploy to the VPS over SSH, as ng-bootstrap does.** The `deploy` job uses `appleboy/ssh-action` with the org secrets `VPS_HOST`, `VPS_PORT`, `VPS_USERNAME`, `VPS_SSH_KEY` and `VPS_SSH_KEY_PASSPHRASE`. In `/var/www/ng-seo` it downloads `docker-compose.yml` from master, logs in to GHCR, then runs `docker compose pull` and `up -d --remove-orphans`. | Parity, chosen by the owner. **Today's demo is stale:** `ng-seo-seo-1` runs an image built **2025-12-18**, from a compose file created by hand on 2026-03-24. Nothing has updated it since, because the Sliplane hook was the only automatic deploy. |
| D12 | **Commit `docker-compose.yml` at the repo root, reusing the existing VPS layout exactly:** project directory `/var/www/ng-seo`, service `seo`, router `seo`, ``Host(`seo.mintplayer.com`)``, `websecure`, `letsencrypt`, and external network `web`. Add `traefik.http.services.seo.loadbalancer.server.port=80`. | Because the project and service names are the same, the first deploy recreates `ng-seo-seo-1` in place: no duplicate router and no manual cut-over. |
| D13 | **Remove the commented-out Sliplane hook.** | It is replaced by D11. **Manual step (owner):** delete the repo secret `SLIPLANE_DEPLOY_HOOK`. |

---

## 5. Plan

### Spikes (do these first; each one resolves an open question)

- **S1 — Building the demo with `--exclude-task-dependencies`**
  - Run `rm -rf dist`, then `npx nx run-many -t build --exclude=seo-demo,seo-demo-e2e
    --configuration=production`, then `npx nx build seo-demo --configuration=production
    --exclude-task-dependencies --skip-nx-cache`.
  - Confirm that the demo builds from the source aliases and that
    `dist/apps/seo-demo/nginx.conf` exists.
  - Confirm that no non-`^build` dependency needs an explicit run. The reference had
    `codegen-ssr-chrome`; here there should be none.
  - Takes about 2 minutes locally.
- **S2 — Proof of server mode**
  - There is no log line, so add a `Report versioning mode` step after plan that writes
    `steps.plan.outputs.mode` to `$GITHUB_STEP_SUMMARY` and emits `::warning::` when it is not
    `server`.
  - Confirm the output name `mode` in `action.yml` at `14900a60`.
- **S3 — Local check of the prebuilt image**
  - Using `dist` from S1, run `docker build -f apps/seo-demo/Dockerfile --target prebuilt
    --build-context dist=dist/apps/seo-demo -t seo-demo:prebuilt .`.
  - Run the image and check with `curl` that `/` and a deep link return 200. The deep link proves
    that `nginx.conf` was applied.
  - Skip this if Docker is not available locally, and say so.
- **S4 — Postinstall when `node_modules` is restored from the cache**
  - Check what `decorate-angular-cli.js` does, and whether it is still needed on Nx 22.
  - If it is dead, drop the postinstall from the setup action and from `package.json`, rather than
    porting a no-op.
- **S5 — Speed estimate**
  - No CI run is possible before merge, because `publish-master` only triggers on master and we
    don't push just to get a CI run.
  - Estimate the critical path:
    - `build`: setup with a cache hit, the library build, plan (about 28 s today), the demo build,
      and the upload.
    - then `docker` (no npm; an nginx COPY)
    - then `deploy`
  - Compare it with the 3 min 28 s baseline. Verify on the **second** master run after merge,
    because the first run starts with a cold Nx cache and a cold `node_modules` cache (D5).

### M1 — Version guard and the `tools` test project

- Port `tools/scripts/lib/cli.mjs` verbatim.
- Port `tools/scripts/check-demo-versions.mjs` and adapt it:
  - Keep `DEMOS = []`, with a comment that says how to add `seo-demo` if it ever shows a version.
  - Add a **published-library check**: for every `dist/libs/*/package.json` that is not
    `"private": true`, fail when `version === PLACEHOLDER`. The plan step marks a library that has
    no tag as private instead of stamping it, so skipping private libraries is correct.
  - Fail when `dist/libs` is missing or empty.
  - Log `check-demo-versions: OK <package>@<version>` for each library.
- Port the spec:
  - Drop the "covers the three demos" test and replace it with `DEMOS` being empty.
  - Add cases: a stamped library passes, a placeholder library fails, a private placeholder library
    passes, and a missing `dist/libs` fails.
- Add `tools/project.json`: project `tools`, a `test` target with `@nx/vitest:test`, and
  `reportsDirectory: ../coverage/tools`.
- Add `tools/vitest.config.ts` (`include: ['**/*.spec.ts']`, v8 lcov over `scripts/**/*.mjs`).
- Register it in the root `vitest.config.ts` `projects`.
- Make sure `rebase-lcov-paths.mjs` handles `coverage/tools/lcov.info`.

### M2 — Dockerfile and compose

- Create `apps/seo-demo/Dockerfile` per D7, keeping `LABEL org.opencontainers.image.source`.
- Delete the root `Dockerfile`.
- Add the root `docker-compose.yml` per D12.

### M3 — Shared CI building blocks

- `.github/actions/setup/action.yml` (D2).
- `.github/workflows/test.yml` (D1). It uses the self-hosted cache `env` from D5.

### M4 — `publish-master.yml`

- **Top level**
  - Trigger, concurrency and `permissions: contents: read`, as today.
  - The Nx cache `env` (D5).
- **`build` job**
  - Permissions: `contents: read`, `id-token: write`.
  - Output: `plan: ${{ steps.plan.outputs.plan }}`.
  - Steps:
    - checkout, setup
    - `npx nx run-many -t build --exclude=seo-demo,seo-demo-e2e --configuration=production`
    - plan, pinned to `14900a6057ee305ac9b03690fcb2ff989452e2eb # versioning-v1.1.0` with
      `phase: plan`
    - report the mode (S2)
    - `npx nx build seo-demo --configuration=production --exclude-task-dependencies`
    - `node tools/scripts/check-demo-versions.mjs`
    - upload `dist` (retention 1 day)
- **`tests` job:** `uses: ./.github/workflows/test.yml`, `secrets: inherit`.
- **`coverage` job**
  - Needs `tests`.
  - Steps: download `coverage`, `rebase-lcov-paths.mjs`, then the upload with globs
    `coverage/libs/**/lcov.info`, `coverage/apps/**/lcov.info` and `coverage/tools/lcov.info`,
    `flags: unit`, `fail-ci-if-error: true`.
- **`publish-libs` job**
  - Needs `build` and `tests`.
  - Permissions: `contents: write`, `packages: write`, `id-token: write`.
  - Steps: checkout, setup-node, download `dist`, release (`phase: release`,
    `plan: ${{ needs.build.outputs.plan }}`), then the existing `publish-npm-packages` step.
- **`docker` job**
  - Needs `build` and `tests`.
  - Permissions: `contents: read`, `packages: write`, `id-token: write`, `attestations: write`,
    `artifact-metadata: write`.
  - Steps:
    - download `dist`, login, metadata
    - build-push with `file: ./apps/seo-demo/Dockerfile`, `target: prebuilt`,
      `build-contexts: dist=dist/apps/seo-demo`, `push: false`, `load: true`
    - push (with retry), then attest
  - Also set `DOCKER_BUILD_RECORD_UPLOAD: false`, and make the package public through `gh api`,
    as the reference does. Check whether the package is already public.
- **`deploy` job:** per D11. Needs `docker`, with `if: github.ref == 'refs/heads/master'` and
  permissions `contents: read`, `packages: read`.
- **`publish-master` aggregator:** per D6.

### M5 — `pull-request.yml`, plus the cleanup

- Rewrite `pull-request.yml` per D4 and D5.
- Delete `build-any.yml` (D3).
- Remove `nxCloudAccessToken` from `nx.json` (D5).
- Run `actionlint` on every workflow, if it is available.
- Update this PRD with the spike results and set the status to Implemented.

### Verification (batched at the end)

1. `npx nx test tools`: the guard spec passes.
2. Reuse S1 and S3 as the end-to-end local check: `dist`, then the guard against fake-stamped
   `dist/libs/*/package.json` files, then the prebuilt image serving the demo.
3. `actionlint`, or a line-by-line review against the reference YAML if it is unavailable.
4. The PR's own `pull-request.yml` run is the first real CI check of the new `test.yml`, setup
   action and Nx cache.
5. After merge, check the acceptance criteria in §6.

### Manual steps for the owner

- Revoke the old Nx Cloud access token (D5).
- Delete the repo secret `SLIPLANE_DEPLOY_HOOK` (D13).

---

## 6. Acceptance checks (master runs after merge)

- [ ] All jobs are green and the `publish-master` aggregator succeeds.
- [ ] The job summary shows plan `mode` = `server`, with no "versioning with the local engine"
      warning.
- [ ] The guard logs OK for all six libraries.
- [ ] The packages on npmjs and GitHub Packages carry the planned versions, and the tags
      `<package>/v<version>` exist.
- [ ] The docker job log has no `npm install`, and the image digest on GHCR matches the one pushed.
- [ ] On the VPS, `ng-seo-seo-1` runs the new digest, and `https://seo.mintplayer.com` serves a
      build newer than 2025-12-18 (check `Last-Modified`).
- [ ] Wall clock on the **second** run is ≤ about 3 min 28 s (baseline run 40204499665).

## 7. Risks

- **Stale plan:** a tag pushed between the plan and release steps makes the release fail. The
  recovery is "Re-run all jobs".
- **Testable only partly before merge:** the plan, release and deploy steps only run on master.
  Mitigate with S1, S3, `actionlint`, a diff against the reference, and the PR run (which covers
  the setup action, `test.yml` and the cache).
- **The plan step changes the cache key:** it stamps the source `package.json` files before the
  demo build, so the demo build misses the cache on every release. That is correct, but S5 must
  account for it.
- **Cold cache on the switch:** both the Nx cache (moving from Nx Cloud to self-hosted) and the
  `node_modules` cache start empty, so the first master run and the first PR run will be slow.
- **Coverage outage:** with `fail-ci-if-error: true` (D9), an outage of coverage.mintplayer.com
  turns a successful release red.
- **The deploy recreates a long-running container:** `ng-seo-seo-1` has been up since March, and
  `up -d` replaces it in place. The Traefik router name is the same, so expect only a few seconds
  of downtime.

---

## 8. Results (2026-10-27)

### Spikes

| Spike | Result |
|---|---|
| S1 | **Pass.** From a clean `dist`, `nx run-many -t build --exclude=seo-demo,seo-demo-e2e` took 63 s, and `nx build seo-demo --exclude-task-dependencies --skip-nx-cache` took 29 s. `dist/apps/seo-demo/nginx.conf` is present. There is no non-`^build` dependency to run explicitly. |
| S2 | **Done.** `build` has a "Report the versioning mode" step that writes `steps.plan.outputs.mode` to the job summary and warns when the mode is not `server`. |
| S3 | **Skipped.** Docker is not running on the dev machine, so the prebuilt image was not built locally. The `prebuilt` stage is two `COPY` lines from the named context. The first master run is its test (§6). |
| S4 | **Done.** `decorate-angular-cli.js` only symlinks `node_modules/.bin/ng` to nx, inside `node_modules`. A restored cache already holds that symlink, and CI never calls `ng`. The setup action therefore skips postinstall on a cache hit, and `package.json` keeps the script for local use. |
| S5 | **Estimate.** With a warm `node_modules` cache, `build` is about setup + 63 s (libraries, cold) + about 28 s (plan) + 29 s (demo, which always misses the cache after the stamp) + the upload. With a warm Nx cache the library build is a few seconds. `docker` no longer runs npm. The critical path should be at or under the 3 min 28 s baseline from the second run on. |

### Verification

- `nx run-many -t test --all --coverage`: **8 projects green** (tools: 68 tests across the guard,
  `cli` and `rebase-lcov-paths` specs).
- `rebase-lcov-paths.mjs` over the real `coverage/`: exit 0. `tools` covers 99% of lines.
- The guard against the real `dist`: **exit 1**, naming all six unstamped libraries. Against a
  fake-stamped `dist` with one library marked private: **exit 0**, and the private library is
  logged as skipped.
- `actionlint` 1.7.7: clean apart from `artifact-metadata: write`, a scope newer than actionlint
  1.7.7. ng-bootstrap uses the same scope in passing runs.

### Where the implementation differs from §4 and §5

- **Action versions:** these go one step past ng-bootstrap, to the latest releases, as in
  mintplayer-ng-video-player#102's plan: `checkout@v7`, `setup-node@v7`, `cache@v6`. The rest are as
  in D8.
- **Master concurrency:** `cancel-in-progress: false`, following video-player#102. Cancelling a run
  between the release step's tag push and the npm publish would leave tags without packages.
  `pull-request.yml` keeps `true`.
- **`rebase-lcov-paths.mjs`:** this repo's copy predated `lib/cli.mjs` and could not be parsed for
  coverage, so ng-bootstrap's current version and its spec were ported. That version adds `main()`
  through `runCli`, and shard directories.
- **`nx.json`:** `useLegacyCache: true` was dropped together with `nxCloudAccessToken`. ng-bootstrap
  has neither, and the self-hosted remote cache needs the new cache.
- **Coverage upload:** the upload is now `coverage/libs/**` plus `coverage/tools`, without
  `coverage/apps`, as in ng-bootstrap. The demo's coverage is not a property of the published
  libraries.
- **`.dockerignore`:** added, so the local `standalone` build doesn't send the host's
  `node_modules` into the build context.
- **Noticed, not changed:** the project at `libs/mintplayer-ng-share-buttons` is named
  `mintplayer-ng-share-buttons-demo` in its `project.json`. It is still built, tested and published
  correctly.

### Added after review: Nx 24 and Playwright

At the owner's request the PR also migrates the workspace and replaces Cypress.

- **Nx 22.7.5 → 24.0.2** with `nx migrate`: 41 migrations applied, 3 skipped, 0 unresolved.
  Angular moves to 22.2. ESLint flat configs no longer use `FlatCompat`, so `@eslint/eslintrc` is gone,
  and `lint` and the `tools` test target are now inferred by plugins. `@nx/vitest` runs
  with `testMode: run`, so `nx test` runs once as the old executor did.
- **`nxViteTsPaths` is a no-op stub in Nx 24**, and Vite 6 has no native `resolve.tsconfigPaths`.
  The seven `vitest.config.ts` files use `vite-tsconfig-paths` instead.
- **Cypress → Playwright:** `seo-demo-e2e` was a dead Cypress scaffold, and Nx 24 removed its
  executor. It is now a Playwright project inferred by `@nx/playwright/plugin`, with the same config
  shape as ng-bootstrap: chromium and firefox, against `nx serve seo-demo` in production mode. Its
  specs check what the libraries write into `<head>`: the title, the description and OpenGraph tags,
  the canonical URL, the hreflang alternates, JSON-LD, in-place updates, and the canonical link being
  replaced on navigation. `pull-request.yml` runs them in a `playwright image` + `e2e` matrix
  inside the Playwright container, skipped when `seo-demo-e2e` is not affected.
- **Verified:** lint 8/8, build 7/7, test 8/8, and e2e 4/4 on chromium and on firefox.
  actionlint is unchanged. Running both browsers at once on the Windows dev machine was flaky
  under load; one browser per run, as in CI, passes.
