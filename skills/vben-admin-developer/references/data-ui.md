# Data UI Patterns

Load this file for pages, forms, tables, modals, drawers, or API-driven field components.

## Default Page Shell

- Use `Page` as the default top-level content container.
- Fill `title`, `description`, `extra`, and `footer` instead of recreating header chrome.
- Use `autoContentHeight` when the page hosts `appendToMain` modals or drawers.

## Forms

- Prefer the app adapter exposed from `src/adapter/form.ts`.
- `useVbenForm` returns `[Form, formApi]`.
- Keep UI-library specifics inside `src/adapter/component/index.ts` and `src/adapter/form.ts`.
- Use schema-driven forms first; fall back to raw UI components only when the abstraction stops helping.
- Use `dependencies` with explicit `triggerFields` for field linkage.
- Use Vee-validate or `zod`-backed validation when schema rules are not enough.
- For search forms, `submitOnChange` is often the right default.

## Tables

- Prefer `useVbenVxeGrid` for list pages that need search, pagination, and CRUD affordances.
- Keep search UI in `formOptions`; it uses Vben Form under the hood.
- Use `gridOptions.proxyConfig.ajax.query` for remote loading.
- Use `gridApi.reload()` to reset pagination and refetch.
- Use `gridApi.query()` to keep the current page and refetch.
- Put global cell renderers and VXE defaults in `src/adapter/vxe-table.ts`.

## Modals And Drawers

- Choose `useVbenModal` for centered overlays and short workflows.
- Choose `useVbenDrawer` for side panels and longer forms.
- Extract complex content with `connectedComponent` instead of embedding everything inline.
- Use `setData` and `getData` plus `onOpenChange` for parent-child state sharing.
- Remember the precedence rule: `slot > props > state`. `setState` will not override values that are hard-coded via slots or props.
- Use `lock()` and `unlock()` during submits to prevent double actions and accidental close.
- If you use `appendToMain`, wrap the page in `Page autoContentHeight`.

## API-Backed Field Components

- Prefer the adapted `ApiSelect`, `ApiTreeSelect`, or `ApiCascader` patterns when options come from the server.
- Configure mapping through `resultField`, `labelField`, `valueField`, and `childrenField`.
- Use `visibleEvent` plus `immediate: false` for lazy-loaded dropdowns.
- Use `autoSelect` only for simple single-select cases.
- If many instances share one data source, cache the fetch with a query layer instead of issuing duplicate requests.

## When To Avoid The Abstraction

- Use raw UI components when the Vben wrapper becomes harder to reason about than the direct component.
- Extend the adapter layer when the same custom behavior will repeat across screens.
- Keep one-off hacks out of shared adapters.

## Upstream Reference Paths

- `vben/apps/web-antdv-next/src/adapter/form.ts`
- `vben/apps/web-antdv-next/src/adapter/component/index.ts`
- `vben/apps/web-antdv-next/src/adapter/vxe-table.ts`
- `vben/docs/src/components/layout-ui/page.md`
- `vben/docs/src/components/common-ui/vben-form.md`
- `vben/docs/src/components/common-ui/vben-vxe-table.md`
- `vben/docs/src/components/common-ui/vben-modal.md`
- `vben/docs/src/components/common-ui/vben-drawer.md`
- `vben/docs/src/components/common-ui/vben-api-component.md`
