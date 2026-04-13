import  { AuthPageLayout, BasicLayout, IFrameView } from '#/layouts/index'

/**
 * Layout component mapping for meta.layout string references.
 * Used by VueAutoRouterGenerator to resolve layout names to components.
 *
 * Add new layouts here when creating custom layout components.
 */
export const layoutMap: Record<string, any> = {
  BasicLayout,
  AuthPageLayout,
  IFrameView,
};
