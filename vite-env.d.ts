/// <reference types="vite/client" />

declare global {
  interface ImportMetaEnv {
    readonly VITE_GRAPHQL_API_URL?: string
    readonly VITE_TWENTY_GRAPHQL_URL?: string
    readonly VITE_TWENTY_API_KEY?: string
    readonly DEV: boolean
  }

  interface ImportMeta {
    readonly env: ImportMetaEnv
  }
}

export {}
