export type RuntimeEnvironment = {
  DATABASE_URL?: string;
  GROQ_API_KEY?: string;
  OPENAI_API_KEY?: string;
  OPENAI_IMAGE_MODEL?: string;
  ARTWORK_GENERATION_ENABLED?: string;
  PUBLIC_SITE_URL?: string;
  VERCEL_PROJECT_PRODUCTION_URL?: string;
  GROQ_MODEL?: string;
  GROQ_VISION_MODEL?: string;
  ADMIN_EMAIL?: string;
  ADMIN_PASSWORD_HASH?: string;
  SESSION_SECRET?: string;
  AI_TEST_MODE?: string;
  CHROMA_URL?: string;
  CHROMA_API_KEY?: string;
  CHROMA_TENANT?: string;
  CHROMA_DATABASE?: string;
  BLOB_STORE_ID?: string;
  BLOB_READ_WRITE_TOKEN?: string;
};

export const runtimeEnv = process.env as RuntimeEnvironment;
