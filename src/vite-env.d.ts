/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/react" />

// Virtual PWA Register module declarations
declare module 'virtual:pwa-register/react' {
  import type { Dispatch, SetStateAction } from 'react'
  
  export interface RegisterSWOptions {
    immediate?: boolean
    onNeedRefresh?: () => void
    onOfflineReady?: () => void
    onRegistered?: (registration: ServiceWorkerRegistration | undefined) => void
    onRegisteredSW?: (swScriptUrl: string, registration: ServiceWorkerRegistration | undefined) => void
    onRegisterError?: (error: any) => void
  }

  export function useRegisterSW(options?: RegisterSWOptions): {
    offlineReady: [boolean, Dispatch<SetStateAction<boolean>>]
    needRefresh: [boolean, Dispatch<SetStateAction<boolean>>]
    updateServiceWorker: (reloadPage?: boolean) => Promise<void>
  }
}
