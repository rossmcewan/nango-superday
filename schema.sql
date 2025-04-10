CREATE TABLE IF NOT EXISTS rate_limit_requests (
    id SERIAL PRIMARY KEY,
    key_type VARCHAR(50) NOT NULL,
    key_value VARCHAR(255) NOT NULL,
    timestamp TIMESTAMP NOT NULL,
    CONSTRAINT rate_limit_requests_key_type_value_idx UNIQUE (key_type, key_value, timestamp)
);

CREATE INDEX IF NOT EXISTS rate_limit_requests_lookup_idx ON rate_limit_requests (key_type, key_value, timestamp); 