CREATE TABLE IF NOT EXISTS spin_sessions (
    session_id VARCHAR(64) PRIMARY KEY,
    balance INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS spin_results (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(64) NOT NULL,
    prize VARCHAR(64) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_spin_results_created ON spin_results(created_at DESC);
