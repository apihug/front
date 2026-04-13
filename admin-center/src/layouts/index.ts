const BasicLayout = () => import('./basic.vue');
const AuthPageLayout = () => import('./auth.vue');

const IFrameView = () => import('@vben/layouts').then((m) => m.IFrameView);

export { AuthPageLayout, BasicLayout, IFrameView };


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
