export {
    configureApiClient,
    getApiClient,
    isApiClientConfigured,
    pathToUrl,
    useDelete,
    useGet,
    usePatch,
    usePost,
    usePut,
    useUpload,
} from '@hope/api'

export type { ApiClient, ApiRequestConfig, RequestConfigExtra } from '@hope/api'

import type { ApiRequestConfig, RequestConfigExtra } from '@hope/api'

type ServiceRequestConfig = ApiRequestConfig & RequestConfigExtra

function mergeServiceConfig(
    permissionConfig?: RequestConfigExtra,
    requestConfig?: ServiceRequestConfig,
): ServiceRequestConfig | undefined {
    if (!permissionConfig && !requestConfig) {
        return undefined
    }
    return {
        ...permissionConfig,
        ...requestConfig,
    }
}

export { mergeServiceConfig }
export type { ServiceRequestConfig }
