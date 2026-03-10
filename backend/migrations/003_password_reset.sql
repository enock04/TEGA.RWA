-- Password reset tokens table
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  user_id   UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  token     VARCHAR(36) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used      BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
