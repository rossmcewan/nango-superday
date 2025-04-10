CREATE TABLE IF NOT EXISTS api_requests (
  id SERIAL PRIMARY KEY,
  account_id VARCHAR(255) NOT NULL,
  endpoint VARCHAR(255) NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_api_requests_account_endpoint ON api_requests(account_id, endpoint);
CREATE INDEX IF NOT EXISTS idx_api_requests_timestamp ON api_requests(timestamp);

CREATE TABLE IF NOT EXISTS rate_limit_alerts (
  id SERIAL PRIMARY KEY,
  account_id VARCHAR(255) NOT NULL,
  slack_message_ts VARCHAR(255),
  status VARCHAR(50) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
); 