import { createApp, watchEffect } from 'vue';

import { registerAccessDirective } from '@vben/access';
import { registerLoadingDirective } from '@vben/common-ui/es/loading';
import { preferences } from '@vben/preferences';
import { initStores } from '@vben/stores';
import '@vben/styles';
import '@vben/styles/antd';


import { configureApiClient, type ApiClient } from '@hope/api-core';

import { useTitle } from '@vueuse/core';

import { $t, setupI18n } from '#/locales';
import { requestClient } from '#/api/request';

import { initComponentAdapter } from './adapter/component';
import { initSetupVbenForm } from './adapter/form';
import App from './app.vue';
import { router } from './router';

// 创建 ApiClient 适配器
const apiClientAdapter: ApiClient = {
  get: (url, config) => requestClient.get(url, config),
  post: (url, data, config) => requestClient.post(url, data, config),
  put: (url, data, config) => requestClient.put(url, data, config),
  delete: (url, data, config) => requestClient.delete(url, data, config),
  request: (url, config) => requestClient.request(url, config),
};

async function bootstrap(namespace: string) {
  // 初始化组件适配器
  await initComponentAdapter();

  // 初始化表单组件
  await initSetupVbenForm();

  // // 设置弹窗的默认配置
  // setDefaultModalProps({
  //   fullscreenButton: false,
  // });
  // // 设置抽屉的默认配置
  // setDefaultDrawerProps({
  //   zIndex: 1020,
  // });

  const app = createApp(App);

  // 注册v-loading指令
  registerLoadingDirective(app, {
    loading: 'loading', // 在这里可以自定义指令名称，也可以明确提供false表示不注册这个指令
    spinning: 'spinning',
  });

  // 国际化 i18n 配置
  await setupI18n(app);

  // 配置 pinia-tore
  await initStores(app, { namespace });

  // 配置 aip-service API 客户端（IoC 依赖注入）
  // 注入应用层的 requestClient，之后所有 API Service 自动使用
  configureApiClient(apiClientAdapter);


  //import { configureRealtimeClient } from '@hope/realtime';
  // 配置 realtime 客户端（IoC 依赖注入）
  // 注入 baseURL 和动态 headers，SSE/WebSocket 自动使用
  //const { apiURL } = useAppConfig(import.meta.env, import.meta.env.PROD);
  //configureRealtimeClient({
  //  baseURL: apiURL,
  //  getHeaders: () => ({
  //    Authorization: `Bearer ${useAccessStore().accessToken}`,
  //    'Accept-Language': preferences.app.locale,
  //  }),
  //});

  // 安装权限指令
  registerAccessDirective(app);

  // 初始化 tippy
  const { initTippy } = await import('@vben/common-ui/es/tippy');
  initTippy(app);

  // 配置路由及路由守卫
  app.use(router);

  // 配置Motion插件
  const { MotionPlugin } = await import('@vben/plugins/motion');
  app.use(MotionPlugin);

  // 动态更新标题
  watchEffect(() => {
    if (preferences.app.dynamicTitle) {
      const routeTitle = router.currentRoute.value.meta?.title;
      const pageTitle =
        (routeTitle ? `${$t(routeTitle)} - ` : '') + preferences.app.name;
      useTitle(pageTitle);
    }
  });

  app.mount('#app');
}

export { bootstrap };
