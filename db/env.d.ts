declare namespace NodeJS {
  interface ProcessEnv {
    DATABASE_URL?: string;
    GROQ_API_KEY?: string;
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
  }
}

