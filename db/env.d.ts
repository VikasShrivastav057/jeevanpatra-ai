declare namespace Cloudflare {
  interface Env {
    DB: D1Database;
    FILES: R2Bucket;
    GROQ_API_KEY?: string;
    GROQ_MODEL?: string;
    ADMIN_EMAIL?: string;
    ADMIN_PASSWORD_HASH?: string;
    SESSION_SECRET?: string;
    AI_TEST_MODE?: string;
  }
}
