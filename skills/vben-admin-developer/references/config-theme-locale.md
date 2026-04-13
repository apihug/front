# Config, Theme, Locale, And Standards

Load this file for environment config, preferences, runtime app config, icons, theme tokens, i18n, or verification commands.

## Environment And Runtime Config

- Use `.env`, `.env.development`, and `.env.production` inside the app.
- Only `VITE_*` variables are exposed to client code.
- `VITE_GLOB_*` variables are emitted into runtime `_app.config.js` so production builds can switch endpoints without rebuilding.
- Read runtime config through `useAppConfig(import.meta.env, import.meta.env.PROD)`.

## Preferences

- Override app behavior in `src/preferences.ts` via `defineOverridesPreferences`.
- Override only the values you need; do not edit framework defaults directly.
- Clear caches after major preference changes, especially auth, layout, and theme settings.
- Common high-value settings:
  - `app.accessMode`
  - `app.defaultHomePath`
  - `app.enableRefreshToken`
  - `app.locale`
  - `app.loginExpiredMode`
  - `theme.builtinType`
  - `theme.mode`
  - `widget.languageToggle`

## I18n

- Keep business strings in the app's own `src/locales/langs/*`.
- Use `$t('key.path')` in routes, tabs, page titles, and component text.
- Switch locale by updating preferences and then calling `loadLocaleMessages(locale)`.
- The request layer should continue sending `Accept-Language`.
- Add a new supported language across the framework only when the whole product truly supports it.

## Icons And Theme

- Prefer icons exported from `@vben/icons` for reusable icons.
- Use Iconify or SVG wrappers for consistent sizing and reuse.
- Tailwind icon classes are acceptable for small one-off cases.
- Vben theme tokens are CSS variables in HSL format.
- Change branding either by:
  - overriding specific CSS variables
  - changing `theme.colorPrimary` or related preference values
  - selecting a different `theme.builtinType`
  - defining a custom `builtinType` plus matching light and dark CSS variable blocks
- Shell colors come primarily from `--sidebar` and `--header`.

## Tooling And Validation

- Upstream Vben uses:
  - `pnpm oxfmt`
  - `pnpm oxlint --fix`
  - `pnpm eslint . --cache`
  - `pnpm stylelint "**/*.{vue,css,less,scss}" --cache`
  - `pnpm check:cspell`
- Typical upstream package or workspace commands:
  - `pnpm dev:antdv-next`
  - `pnpm dev:docs`
  - `pnpm check:type`
  - `pnpm test:unit`
- Run the narrowest command that covers the edited surface.

## Upstream Docs For Deeper Detail

- `vben/docs/src/guide/essentials/settings.md`
- `vben/docs/src/guide/in-depth/locale.md`
- `vben/docs/src/guide/essentials/icons.md`
- `vben/docs/src/guide/in-depth/theme.md`
- `vben/docs/src/guide/project/standard.md`
