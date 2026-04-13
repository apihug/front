# Routes, Auth, And Access

Load this file for route and menu work, login flows, permissions, or request-layer auth logic.

## Route Structure

- `src/router/routes/core.ts` owns required routes: root layout, auth pages, and 404.
- `src/router/routes/index.ts` merges route files from `./modules/**/*.ts`.
- Optional `static/**/*.ts` and `external/**/*.ts` patterns exist but are disabled by default in the upstream example.
- Menus are generated from the route tree, so route shape and `meta` drive navigation.

## Route Authoring Rules

- Keep business routes out of `core.ts`.
- Define page groups as parent routes with `children`.
- Use `$t(...)` for titles so menus and tabs localize correctly.
- Put page components under `src/views/**/*`.
- For backend-generated menus, the backend `component` field should use view paths without `views/` and without `.vue`.

## Useful `meta` Fields

- `title`, `icon`, `activeIcon`, `order`
- `keepAlive`, `affixTab`, `affixTabOrder`
- `hideInMenu`, `hideInTab`, `hideInBreadcrumb`, `hideChildrenInMenu`
- `authority`, `ignoreAccess`, `menuVisibleWithForbidden`
- `activePath`, `fullPathKey`, `maxNumOfOpenTab`, `domCached`
- `noBasicLayout`, `link`, `iframeSrc`, `openInNewWindow`

## Tabs And Refresh Behavior

- Use `query.pageKey` when one route should open multiple tabs with distinct identities.
- If `meta.fullPathKey !== false`, tab keys use `fullPath`; otherwise they use `path`.
- Use `useRefresh()` from `@vben/hooks` to refresh the current route.

## Access Modes

- Set `preferences.app.accessMode` in `src/preferences.ts`.
- `frontend`:
  - Declare `meta.authority` on routes.
  - Ensure `userInfo.roles` returned by the app matches those values.
- `backend`:
  - Fetch menus in `src/router/access.ts`.
  - Return a Vben-compatible menu tree from the backend.
- `mixed`:
  - Combine both approaches.

## Button-Level Access

- Use `@vben/access` for fine-grained UI gating.
- Choose one of:
  - `AccessControl` component
  - `useAccess().hasAccessByCodes` or `hasAccessByRoles`
  - `v-access:code` or `v-access:role` directives

## Login Integration

- Customize the shell in `src/layouts/auth.vue` via `AuthPageLayout`.
- Customize form behavior in `src/views/_core/authentication/login.vue` via `AuthenticationLogin`.
- Minimum backend endpoints:
  - `POST /auth/login` returning at least `accessToken`
  - `GET /user/info` returning at least `roles` and `realName`
  - optional `GET /auth/codes` returning string codes for button-level access

## Request Client Rules

- Prefer the app request wrapper in `src/api/request.ts`.
- Preserve these common behaviors unless intentionally changing them:
  - inject `Authorization`
  - inject `Accept-Language`
  - normalize `{ code, data, message }`
  - refresh token when enabled
  - route expired auth through logout or login-expired UX
- Configure proxying in `vite.config.mts` when using `/api` during local development.

## Common Failure Modes

- Menu exists but page redirects to 403: check `menuVisibleWithForbidden`, `authority`, and actual roles.
- Backend menus load but views do not: check backend `component` path format and the app's `pageMap`.
- Login works but protected pages fail: check access mode, `getUserInfo`, `getAccessCodes`, and request token injection.
- Permission changes do not appear: clear cached preferences and auth state if needed.

## Upstream Docs For Deeper Detail

- `vben/docs/src/guide/essentials/route.md`
- `vben/docs/src/guide/in-depth/access.md`
- `vben/docs/src/guide/in-depth/login.md`
- `vben/docs/src/guide/essentials/server.md`
