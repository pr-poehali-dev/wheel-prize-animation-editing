CREATE TABLE IF NOT EXISTS brick_codes (
    id SERIAL PRIMARY KEY,
    code VARCHAR(32) NOT NULL UNIQUE,
    quantity INTEGER NOT NULL DEFAULT 1,
    status VARCHAR(16) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_brick_codes_status ON brick_codes(status);
