---
name: vben-admin-developer
description: Develop, debug, and extend `vue-vben-admin` or Vben-derived frontend repos. Use when working on Vben app bootstrap, preferences, routes and menus, login/auth/access control, request clients, forms, VXE tables, modals, drawers, `Page` layouts, icons, i18n, themes, or when translating upstream `vben/docs` guidance into a local app such as `admin-antdv-next`.
---

# Vben Admin Developer

Use this skill to turn Vben docs into concrete code changes without guessing the framework shape.

## Quick Start

1. Verify the real repo shape before editing. This checkout contains `vben/` and a thin local app `admin-antdv-next/`. Some older local notes still mention `admin-center`.
2. Read [references/repo-context.md](references/repo-context.md) first.
3. Load only the task-specific reference you need:
   - [references/routes-auth.md](references/routes-auth.md) for routes, menus, login, permissions, request/auth flows.
   - [references/data-ui.md](references/data-ui.md) for page shells, forms, VXE grids, modals, drawers, and API-backed field components.
   - [references/config-theme-locale.md](references/config-theme-locale.md) for env config, preferences, icons, theme, i18n, and lint/tooling.
4. Prefer local app and `@hope/*` edits. Touch `vben/` only when the change truly belongs in the shared framework.
5. If the local app is missing structure, copy the pattern from `vben/apps/web-antdv-next/src` instead of inventing a new layout.

## Workflow

1. Locate the owner.
   - App behavior lives in the actual app directory and `@hope/*`.
   - Canonical upstream examples live in `vben/apps/web-antdv-next/src`.
2. Match the change to the right Vben abstraction before coding.
   - Route/menu work: route modules and `meta`.
   - Auth/access work: `preferences.ts`, `src/router/access.ts`, stores, and the request client.
   - CRUD or filter screens: `Page`, `useVbenForm`, and `useVbenVxeGrid`.
   - Transient workflows: `useVbenModal` or `useVbenDrawer`.
   - Global UX: `preferences.ts`, env files, locale loaders, and CSS variables.
3. Preserve framework extension points.
   - Override preferences instead of editing defaults.
   - Extend adapters in `src/adapter/*`.
   - Adjust request behavior in `src/api/request.ts`.
   - Keep app translations in the app's `src/locales/langs/*`.
4. Keep the developer experience smooth.
   - Reuse upstream naming and folder conventions so future diffs stay easy to compare.
   - Make narrow edits with obvious ownership.
   - When docs and the repo disagree, trust the filesystem and state the discrepancy explicitly.
5. Validate at the smallest useful scope.
   - Run package- or app-level lint/typecheck commands.
   - If workspace wiring is unclear, run commands from `vben/` or the concrete package directory instead of assuming the repo root is valid.

## Reference Map

- [references/repo-context.md](references/repo-context.md)
- [references/routes-auth.md](references/routes-auth.md)
- [references/data-ui.md](references/data-ui.md)
- [references/config-theme-locale.md](references/config-theme-locale.md)
