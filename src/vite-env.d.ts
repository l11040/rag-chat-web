/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_OPENAPI_SPEC_URL?: string;
  readonly VITE_OPENAPI_SPEC_PATH?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

