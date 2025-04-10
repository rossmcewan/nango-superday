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
3. Set up the environment:
   ```bash
   # Copy environment file
   cp .env.example .env
   
   # Update the values in .env
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
2. Create database schema:
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

## API Documentation

The API is documented using OpenAPI 3.0 specification in `openapi.yaml`. This provides:
- Detailed endpoint descriptions
- Request/response schemas
- Example payloads
- Authentication requirements

You can view the API documentation by:
1. Opening the `openapi.yaml` file in an OpenAPI viewer
2. Using tools like Swagger UI or Redoc
3. Importing into API development tools like Postman

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

The service is configured with rate limits that can be tested using the provided script:

```bash
npm run test:rate-limits
```

This script will:
1. Send multiple requests to trigger the rate limit
2. Demonstrate both IP-based and account-based rate limiting
3. Show notification behavior when limits are exceeded

## Rate Limiting

The service implements a dual rate limiting system:

1. **Global IP-based Rate Limiting**: Applied across all endpoints
   - Limit: 100 requests per second per IP address (configurable)
   - Alerts are sent when limits are exceeded
   - Duplicate alerts are prevented while an alert is active

2. **Account-based Rate Limiting**: Applied only to POST requests
   - Limit: Configurable through environment variables
   - Alerts are sent when limits are exceeded
   - Duplicate alerts are prevented while an alert is active

## Environment Variables

Required environment variables:
```
# Server Configuration
PORT=3000

# Database Configuration
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=metering_api

# Rate Limiting
RATE_LIMIT_POINTS=100
RATE_LIMIT_DURATION=60

# Notification Configuration
NOTIFICATION_SERVICE=slack  # or 'console' for local development
NANGO_CLIENT_ID=your-client-id
NANGO_SECRET=your-secret
NANGO_SLACK_CONNECTION_ID=your-slack-connection-id
NANGO_SLACK_PROVIDER_CONFIG_KEY=your-slack-provider-config-key
```

## Architecture

The service follows a modular architecture using the Factory pattern for dependency injection:

1. **API Layer**:
   - Express routes for handling HTTP requests
   - OpenAPI specification for API documentation
   - Request validation and error handling

2. **Services Layer**:
   - Factory pattern for service instantiation
   - Pluggable implementations for each service:
     - Metering: PostgreSQL implementation
     - Rate Limiting: Memory and PostgreSQL implementations
     - Notifications: Console and Slack implementations
     - Queue: In-memory implementation with sequential processing

3. **Repository Layer**:
   - Abstract interfaces for data access
   - PostgreSQL implementations
   - Factory pattern for repository creation

### Available Scripts

- `npm run dev` - Start the application in development mode
- `npm run build` - Build the TypeScript code
- `npm run start` - Start the application in production mode
- `npm test` - Run tests
- `npm run test:rate-limits` - Test rate limiting functionality

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
