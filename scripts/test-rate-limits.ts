import axios, { AxiosResponseHeaders, RawAxiosResponseHeaders } from 'axios';
import dotenv from 'dotenv';
import chalk from 'chalk';

dotenv.config();

const API_URL = process.env.API_URL || 'http://localhost:3000/api/v1';
const TEST_ACCOUNT_ID = 'test-account-1';
const TEST_ENDPOINT = '/test-endpoint';

interface RateLimitHeaders {
  'x-ratelimit-limit': string;
  'x-ratelimit-remaining': string;
  'x-ratelimit-reset': string;
  'retry-after'?: string;
}

function extractRateLimitHeaders(headers: AxiosResponseHeaders | RawAxiosResponseHeaders): RateLimitHeaders {
  return {
    'x-ratelimit-limit': headers['x-ratelimit-limit'] as string,
    'x-ratelimit-remaining': headers['x-ratelimit-remaining'] as string,
    'x-ratelimit-reset': headers['x-ratelimit-reset'] as string,
    'retry-after': headers['retry-after'] as string | undefined
  };
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function makeRequest(requestNumber: number): Promise<void> {
  try {
    const response = await axios.post(`${API_URL}/usage`, {
      accountId: TEST_ACCOUNT_ID,
      endpoint: TEST_ENDPOINT,
      timestamp: new Date().toISOString()
    });

    const headers = extractRateLimitHeaders(response.headers);
    console.log(
      chalk.green(`✓ Request ${requestNumber} succeeded`),
      chalk.blue(`(Remaining: ${headers['x-ratelimit-remaining']}/${headers['x-ratelimit-limit']})`)
    );
  } catch (error: any) {
    // console.error(error);
    if (error.response?.status === 429) {
      const headers = extractRateLimitHeaders(error.response.headers);
      console.log(
        chalk.red(`✗ Request ${requestNumber} rate limited`),
        chalk.yellow(`(Retry after: ${headers['retry-after']}s)`)
      );
    } else {
      console.error(chalk.red(`✗ Request ${requestNumber} failed:`, error.message));
    }
  }
}

async function testBurst(requestCount: number) {
  console.log(chalk.cyan('\n=== Testing Burst Requests ==='));
  const requests = Array.from({ length: requestCount }, (_, i) => makeRequest(i + 1));
  await Promise.all(requests);
}

async function testSteadyRate(requestCount: number, intervalMs: number) {
  console.log(chalk.cyan('\n=== Testing Steady Rate ==='));
  for (let i = 0; i < requestCount; i++) {
    await makeRequest(i + 1);
    await sleep(intervalMs);
  }
}

async function testRecovery() {
  console.log(chalk.cyan('\n=== Testing Rate Limit Recovery ==='));
  
  // First, hit the rate limit
  await testBurst(100);
  
  // Wait for recovery
  const waitSeconds = 5;
  console.log(chalk.yellow(`\nWaiting ${waitSeconds} seconds for partial recovery...`));
  await sleep(waitSeconds * 1000);
  
  // Try some more requests
  console.log(chalk.cyan('\nTesting after partial recovery:'));
  await testBurst(10);
}

async function validateRateLimitHeaders() {
  console.log(chalk.cyan('\n=== Validating Rate Limit Headers ==='));
  
  try {
    const response = await axios.post(`${API_URL}/usage`, {
      accountId: TEST_ACCOUNT_ID,
      endpoint: TEST_ENDPOINT,
      timestamp: new Date().toISOString()
    });

    const headers = extractRateLimitHeaders(response.headers);
    const validationResults = [
      {
        check: 'X-RateLimit-Limit present',
        passed: !!headers['x-ratelimit-limit'],
        value: headers['x-ratelimit-limit']
      },
      {
        check: 'X-RateLimit-Remaining present',
        passed: !!headers['x-ratelimit-remaining'],
        value: headers['x-ratelimit-remaining']
      },
      {
        check: 'X-RateLimit-Reset present',
        passed: !!headers['x-ratelimit-reset'],
        value: headers['x-ratelimit-reset']
      }
    ];

    validationResults.forEach(({ check, passed, value }) => {
      console.log(
        passed ? chalk.green('✓') : chalk.red('✗'),
        check,
        value ? chalk.blue(`(${value})`) : ''
      );
    });
  } catch (error) {
    console.error(chalk.red('Header validation failed:', error));
  }
}

async function runTests() {
  try {
    // Validate headers first
    await validateRateLimitHeaders();

    // Test different scenarios
    await testSteadyRate(20, 200);  // 20 requests, 200ms apart
    await testBurst(150);            // 50 requests simultaneously
    await testRecovery();           // Test rate limit recovery

    console.log(chalk.green('\n✓ All tests completed'));
  } catch (error) {
    console.error(chalk.red('\n✗ Tests failed:', error));
  }
}

// Run the tests
runTests(); 