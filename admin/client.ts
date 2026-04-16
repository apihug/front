import { preferences } from '@vben/preferences';
import { configureApiClient, type ApiClient } from '@hope/api';
import { configureRealtimeClient } from '@hope/realtime';
import { useAppConfig } from '@vben/hooks';


import { requestClient } from '#/api/request';
import { getApiURL } from '#/utils/app-config';
import {useAccessStore} from "@vben/stores";


const { apiURL } = useAppConfig(import.meta.env, import.meta.env.PROD);


// 创建 ApiClient 适配器
const apiClientAdapter: ApiClient = {
  get: (url, config) => requestClient.get(url, config),
  post: (url, data, config) => requestClient.post(url, data, config),
  put: (url, data, config) => requestClient.put(url, data, config),
  delete: (url, data, config) =>
    requestClient.request(url, { ...(config ?? {}), data, method: 'DELETE' }),
  request: (url, config) => requestClient.request(url, config ?? {}),
};


async function initClient() {

  // 配置 aip-service API 客户端（IoC 依赖注入）
  // 注入应用层的 requestClient，之后所有 API Service 自动使用
  configureApiClient(apiClientAdapter);

  // 配置 realtime 客户端（IoC 依赖注入）
  // 注入 baseURL 和动态 headers，SSE/WebSocket 自动使用
  configureRealtimeClient({
    baseURL: apiURL,
    getHeaders: () => {
      const accessToken = useAccessStore().accessToken;
      return {
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        'Accept-Language': preferences.app.locale,
      };
    },
  });

}

export { initClient };
