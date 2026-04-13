# AGENT.md

## Project Summary

This repository is an integration layer around `vue-vben-admin`, not a standalone greenfield app.

- `vben/` is the upstream `vue-vben-admin` monorepo pulled in as a Git submodule. It contains the real workspace, shared packages, docs, Vite config, and Nitro mock backend.
- `admin-center/` is the custom app in this repo. It is largely derived from `vben/apps/web-antdv-next`, but switched from `antdv-next` to `ant-design-vue` and extended to use local `@hope/*` packages.
- `@hope/api` is a framework-neutral API client container plus shared schema/types.
- `@hope/api-antd-adapter` converts neutral ApiHug request/response schema into Ant Design / Vben form and table config.
- `@hope/realtime` is a framework-neutral SSE/WebSocket library with unit tests.
- `skills/` currently exists but is empty.

In practice, this repo is still closer to an integration scaffold than a finished business frontend. The custom app keeps most of the Vben demo/auth/profile/dashboard structure, while the new `@hope/*` packages provide the shared extension points intended for future business work.

## Repo Shape

Use this mental model:

- Upstream foundation: `vben/`
- Custom shared extensions: `@hope/*`
- Actual app shell: `admin-center/`

Keep app-specific work in `admin-center`. Keep reusable transport/schema/realtime logic in `@hope/*`. Touch `vben/` only when the change truly belongs in the upstream/shared foundation.

## What Is Custom Here

The main customizations over upstream `vben/apps/web-antdv-next` are:

- UI library swap to `ant-design-vue`
- custom request/response handling in `admin-center/src/api/request.ts`
- IoC injection of the app request client into `@hope/api` in `admin-center/src/bootstrap.ts`
- local schema adapter re-export in `admin-center/src/adapter/api-schema.ts`
- local realtime package prepared in code, but not fully wired yet

Important current status:

- `@hope/api` is actively wired into the app
- `@hope/realtime` is present and tested, but the app bootstrap keeps realtime setup commented out
- `@hope/api-antd-adapter` is available, but the current app views do not yet use it heavily
- most visible pages are still inherited Vben auth/dashboard/demo/profile pages

## Current Setup Limitation

The architecture is clear, but the repository root is not yet a working pnpm workspace.

- `admin-center/package.json` uses `workspace:*` dependencies
- it also uses `catalog:` versions
- those workspace/catalog definitions live in `vben/pnpm-workspace.yaml`, not at the repo root
- result: `admin-center` cannot be installed cleanly as a standalone package from its own directory in the current checkout

Treat the top-level `README.md` install section as outdated or incomplete for the repo in its current state.

Also prefer the toolchain requirements from `vben/package.json`, not the older root README values:

- Node.js `^20.19.0 || ^22.18.0 || ^24.0.0`
- pnpm `>=10`

## How To Use This Project

### 1. Get the full source tree

```bash
git submodule update --init --recursive
```

### 2. Fix the workspace wiring before first install

You need one real pnpm workspace root that contains:

- the full nested Vben workspace declared in `vben/pnpm-workspace.yaml`
- `admin-center`
- `@hope/*`

Recommended approach:

- make the repo root the actual workspace root
- copy the `catalog:` definitions from `vben/pnpm-workspace.yaml`
- copy the Vben workspace package globs from `vben/pnpm-workspace.yaml`
- then add `admin-center` and `@hope/*` to those root workspace packages

Alternative approach:

- fold `admin-center` and `@hope/*` into the `vben` workspace and register them in `vben/pnpm-workspace.yaml`

Do not expect `pnpm install` inside `admin-center/` alone to work until this is fixed.

### 3. Install dependencies from the workspace root

```bash
pnpm install
```

### 4. Run the mock backend

The app is configured to proxy `/api` to `http://localhost:5320/api`.

- `admin-center/.env.development` uses `VITE_GLOB_API_URL=/api`
- `admin-center/vite.config.mts` proxies that to `http://localhost:5320/api`
- `@vben/vite-config` can auto-start the Nitro mock server when `VITE_NITRO_MOCK=true` and `@vben/backend-mock` is resolvable from the workspace

If auto-start is not working, start the mock server explicitly from the workspace that contains `vben`:

```bash
pnpm -F @vben/backend-mock start
```

### 5. Run the frontend

```bash
pnpm --dir admin-center dev
```

Expected local ports:

- frontend: `http://localhost:5666`
- mock backend: `http://localhost:5320/api`

Useful commands:

```bash
pnpm --dir admin-center typecheck
pnpm --dir @hope/realtime test
```

## Runtime Behavior

The current app expects a Vben-style auth/menu API shape.

Main endpoints used by `admin-center`:

- `/auth/login`
- `/auth/refresh`
- `/auth/logout`
- `/auth/codes`
- `/user/info`
- `/menu/all`

`admin-center/src/api/request.ts` adds:

- bearer token injection
- locale header injection
- unified response parsing for `{ code, message, data, errors }`
- refresh-token retry flow on `401`
- shared UI error messaging

## Where To Make Changes

- Shared HTTP client behavior, neutral schema types, upload helpers: `@hope/api`
- Schema to Ant Design/Vben form or table conversion: `@hope/api-antd-adapter`
- Realtime transport, parsers, reconnect logic: `@hope/realtime`
- App routes, auth flow, request interceptors, views, adapters: `admin-center/src`
- Upstream framework internals, common packages, mock server, build config: `vben/`

## Practical Guidance For Future Work

- Treat `vben/apps/web-antdv-next` as the closest upstream reference for `admin-center`.
- Before large refactors in `admin-center`, compare with upstream to avoid unnecessary drift.
- Keep business-specific changes out of `vben/` whenever possible so submodule upgrades stay cheap.
- The fastest path for new product features is usually:
  1. add or adapt transport/schema logic in `@hope/*` if it should be shared
  2. consume it from `admin-center/src`
  3. only modify `vben/` if the feature truly belongs in the base framework

## Repo Maintenance Notes

- `DEV.md` documents a dual-remote workflow: push to both GitHub `origin` and Gitee `gitee`.
- `vben/` is a submodule, so updates to upstream should be committed as submodule pointer changes, not copied files.
