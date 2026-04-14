export function getApiURL(): string {
  if (import.meta.env.PROD) {
    const runtimeConfig = (window as any)?._VBEN_ADMIN_PRO_APP_CONF_ ?? {};
    return String(runtimeConfig.VITE_GLOB_API_URL ?? '');
  }
  return String(import.meta.env.VITE_GLOB_API_URL ?? '');
}
