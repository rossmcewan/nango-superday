# API Metering Service

A metering API service that logs and queries API usage with rate limiting and Slack alerts.

## Prerequisites

- Node.js (v16 or higher)
- Docker and Docker Compose
- npm or yarn

## Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up the development environment:
   ```bash
   # Copy development environment file
   cp .env.dev .env
   
   # Update any values if needed
   vim .env  # or use your preferred editor
   ```

## Database Connection

When running with Docker, the PostgreSQL database will be accessible at:
- Host: `localhost`
- Port: `5432`
- User: `postgres`
- Password: `postgres`
- Database: `metering_api`
- Connection URL: `postgresql://postgres:postgres@localhost:5432/metering_api`

You can connect to it using any PostgreSQL client:
```bash
# Using psql
psql postgresql://postgres:postgres@localhost:5432/metering_api

# Or with individual parameters
psql -h localhost -p 5432 -U postgres -d metering_api
```

## Running with Docker

1. Start the PostgreSQL database:
   ```bash
   npm run docker:db
   ```

2. Run the application:
   ```bash
   # Development mode with hot reload
   npm run docker:dev

   # Production mode
   npm run build
   npm run docker:start
   ```

### Additional Docker Commands

```bash
# View PostgreSQL logs
npm run docker:db:logs

# Stop the PostgreSQL container
npm run docker:db:stop

# Remove containers and volumes (cleanup)
npm run docker:clean
```

## Running without Docker

1. Create a PostgreSQL database named `metering_api`
2. Run database migrations:
   ```bash
   psql -U postgres -d metering_api -f src/db/schema.sql
   ```
3. Start the application:
   ```bash
   # Development mode
   npm run dev

   # Production mode
   npm run build
   npm start
   ```

## API Endpoints

### Log API Usage

```bash
curl -X POST http://localhost:3000/api/v1/log \
  -H "Content-Type: application/json" \
  -d '{
    "accountId": "123",
    "endpoint": "/api/users",
    "timestamp": "2024-03-20T10:00:00Z"
  }'
```

### Query Usage Statistics

```bash
curl "http://localhost:3000/api/v1/usage?accountId=123&endpoint=/api/users&startTime=2024-03-20T00:00:00Z&endTime=2024-03-20T23:59:59Z&window=hour"
```

## Testing Rate Limits

The service is configured with a rate limit of 100 requests per second per account. To test rate limiting:

1. Send multiple requests in quick succession:
   ```bash
   for i in {1..150}; do
     curl -X POST http://localhost:3000/api/v1/log \
       -H "Content-Type: application/json" \
       -d '{"accountId": "test", "endpoint": "/api/test"}' &
   done
   ```

2. After exceeding the rate limit:
   - You'll receive a 429 status code
   - A Slack alert will be sent to the configured channel
   - The alert will be updated when the rate limit recovers

## Rate Limiting

The service implements a dual rate limiting system:

1. **Global IP-based Rate Limiting**: Applied across all endpoints
   - Limit: 1000 requests per minute per IP address
   - No alerts are sent for IP-based rate limits

2. **Account-based Rate Limiting**: Applied only to POST requests
   - Limit: Configurable through environment variables
   - Alerts are sent when limits are exceeded
   - Duplicate alerts are prevented while an alert is active

To test rate limiting:

1. Send multiple requests in quick succession:
   ```bash
   for i in {1..150}; do
     curl -X POST http://localhost:3000/api/v1/log \
       -H "Content-Type: application/json" \
       -d '{"accountId": "test", "endpoint": "/api/test"}' &
   done
   ```

2. After exceeding the rate limit:
   - You'll receive a 429 status code
   - A Slack alert will be sent to the configured channel
   - The alert will be updated when the rate limit recovers

## Environment Variables

Required environment variables:
- NANGO_SLACK_CONNECTION_ID=your-slack-connection-id
- NANGO_SLACK_PROVIDER_CONFIG_KEY=your-slack-provider-config-key

## Architecture

The service consists of several key components:

1. **API Endpoints**: Express routes for logging and querying usage
2. **Rate Limiting**: Dual system with IP and account-based limits
3. **Metering Service**: PostgreSQL-based implementation for tracking API usage
   - Stores requests in the `api_requests` table
   - Provides usage statistics and request history
4. **Notification System**: 
   - Slack integration using Nango
   - Pre-built action for sending messages
   - Custom integration for updating messages
   - In-memory queue system to prevent race conditions
   - Sequential message processing per topic

## Performance

The service is designed to handle 100 req/s throughput with:
- Efficient PostgreSQL indexing
- In-memory rate limiting
- Connection pooling
- Optimized time-series queries

## Development

The project uses a repository pattern for data access, making it easy to:
- Switch between different storage implementations
- Test the application with mock repositories
- Maintain consistent data access patterns
- Keep business logic separate from data access

### Environment Variables

The development environment (`.env.dev`) includes:
- Database connection details
- Rate limiting configuration
- Nango (Slack) integration settings
- Application port settings

You can override any of these values by editing your local `.env` file.

### Project Structure

```
src/
├── db/
│   ├── index.ts           # Database connection
│   └── schema.sql         # Database schema
├── repositories/
│   ├── interfaces.ts      # Repository interfaces
│   ├── factory.ts         # Repository factory
│   └── postgres/          # PostgreSQL implementations
├── services/
│   ├── rateLimiter.ts     # Rate limiting logic
│   └── slackNotifier.ts   # Slack notifications
└── routes/
    └── metering.ts        # API routes
```

### Available Scripts

- `npm run dev` - Start the application in development mode
- `npm run build` - Build the TypeScript code
- `npm run start` - Start the application in production mode
- `npm test` - Run tests

#### Docker Scripts
- `npm run docker:db` - Start PostgreSQL container
- `npm run docker:db:stop` - Stop PostgreSQL container
- `npm run docker:db:logs` - View PostgreSQL logs
- `npm run docker:dev` - Run application in development mode with Docker
- `npm run docker:start` - Run application in production mode with Docker
- `npm run docker:clean` - Remove all Docker containers and volumes

## Database Migrations

The schema can be initialized/updated in two ways:

1. **With Docker** (automatic):
   - The schema is automatically applied when the container is first created
   - For schema updates, run:
   ```bash
   npm run docker:db:migrate
   ```

2. **Without Docker**:
   ```bash
   npm run migrate
   ```
