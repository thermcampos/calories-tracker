/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_APPWRITE_PROJECT_ID: string;
  readonly VITE_APPWRITE_ENDPOINT: string;
  readonly VITE_APPWRITE_DBID: string;
  readonly VITE_APPWRITE_FOODENTRIESID: string;
  readonly VITE_APPWRITE_USERSETTINGSID: string;
  readonly VITE_APPWRITE_MONTLYCALORIESID: string;
  readonly VITE_APPWRITE_SHAREDDAYSID: string;
  readonly VITE_APPWRITE_EXERCISEENTRIESID: string;
  readonly VITE_CLAUDE_API_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
