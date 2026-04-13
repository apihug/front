# Repo Context

Load this file first when the task touches a repo that embeds `vben/` or copies patterns from it.

## What Is In This Checkout

- `vben/`: upstream `vue-vben-admin` monorepo with apps, packages, docs, and the canonical `web-antdv-next` example app.
- `admin-antdv-next/`: local app folder in this checkout. It currently looks much thinner than the upstream example app.
- `@hope/`: local shared packages for custom API, adapter, and realtime work.
- `skills/`: local Codex skills.

## Important Local Caveats

- `AGENT.md` and some older repo notes still mention `admin-center`.
- The actual top-level app folder in this checkout is `admin-antdv-next`.
- The thin local app already shows signs of drift from package reality, so verify imports and package names against the filesystem and `package.json` files before editing.
- Trust the current tree more than stale prose.

## Canonical Upstream Reference Paths

- App bootstrap: `vben/apps/web-antdv-next/src/bootstrap.ts`
- Preferences: `vben/apps/web-antdv-next/src/preferences.ts`
- Request client: `vben/apps/web-antdv-next/src/api/request.ts`
- Form adapter: `vben/apps/web-antdv-next/src/adapter/form.ts`
- Component adapter: `vben/apps/web-antdv-next/src/adapter/component/index.ts`
- VXE adapter: `vben/apps/web-antdv-next/src/adapter/vxe-table.ts`
- Router access: `vben/apps/web-antdv-next/src/router/access.ts`
- Core routes: `vben/apps/web-antdv-next/src/router/routes/core.ts`
- Route modules: `vben/apps/web-antdv-next/src/router/routes/modules/*.ts`
- Locales: `vben/apps/web-antdv-next/src/locales/*`

## Place Changes Deliberately

- Put app-specific pages, views, routes, layouts, locales, and request customization in the actual app directory.
- Put reusable transport, schema, adapter, or realtime logic in `@hope/*`.
- Change `vben/` only when the behavior belongs in the shared framework or when you are intentionally syncing with upstream.
- If the local app is incomplete, mirror upstream structure instead of inventing a parallel architecture.

## Commands And Workspace Reality

- Upstream Vben docs assume commands run from the `vben/` workspace root.
- Common upstream commands:
  - `pnpm dev:antdv-next`
  - `pnpm dev:docs`
  - `pnpm lint`
  - `pnpm check:type`
  - `pnpm test:unit`
- This repo root may not be a fully wired pnpm workspace. If a root command fails, retry from `vben/` or from the touched package or app directory.

## Developer-Experience Rules

- Compare large local changes against `vben/apps/web-antdv-next` before refactoring.
- Prefer Vben extension points over one-off hacks:
  - `src/preferences.ts`
  - `src/api/request.ts`
  - `src/adapter/*`
  - `src/router/*`
- Keep aliases, folder names, and route conventions close to upstream so future upgrades stay cheap.

## Upstream Docs Worth Loading Only When Needed

- `vben/docs/src/guide/introduction/quick-start.md`
- `vben/docs/src/guide/essentials/development.md`
- `vben/docs/src/guide/project/dir.md`
- `vben/docs/src/guide/project/standard.md`
