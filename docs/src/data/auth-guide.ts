import type { AuthMethod, RateLimitTier } from './types';

export const AUTH_METHODS: AuthMethod[] = [
  {
    id: 'oauth2',
    name: 'OAuth 2.0 (Authorization Code + PKCE)',
    type: 'oauth2',
    description: 'The recommended authentication flow for web and mobile applications. Uses the Authorization Code grant with PKCE for secure token exchange. Ideal for applications that need to act on behalf of users.',
    setup: [
      'Register your application to obtain a client_id and client_secret',
      'Configure your redirect URI(s) in the application settings',
      'Initiate the OAuth2 flow by redirecting users to GET /oauth/authorize',
      'Exchange the authorization code for tokens via POST /oauth/token',
      'Use the access_token in the Authorization header for API requests',
      'Refresh the access token using the refresh_token when it expires (30 min)',
    ],
    scopes: [
      'workspace:read — Read workspace metadata and content',
      'workspace:write — Create, update, and delete workspace content',
      'workspace:admin — Manage workspace settings, members, and billing',
      'user:read — Read user profile information',
      'user:write — Update user profile settings',
      'offline_access — Receive refresh tokens for long-lived access',
    ],
    example: `# Step 1: Redirect user to authorize endpoint
GET https://api.gnovium.com/oauth/authorize?
  response_type=code&
  client_id=YOUR_CLIENT_ID&
  redirect_uri=https://yourapp.com/callback&
  code_challenge=CHALLENGE&
  code_challenge_method=S256&
  scope=workspace:read+workspace:write+offline_access

# Step 2: Exchange authorization code for tokens
POST https://api.gnovium.com/oauth/token
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code&
code=AUTH_CODE&
redirect_uri=https://yourapp.com/callback&
client_id=YOUR_CLIENT_ID&
client_secret=YOUR_CLIENT_SECRET&
code_verifier=VERIFIER

# Response
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "Bearer",
  "expires_in": 1800
}

# Step 3: Use access token
curl -X GET https://api.gnovium.com/api/v1/workspaces/ \\
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."`,
    bestFor: 'Web apps, mobile apps, third-party integrations',
  },
  {
    id: 'api-key',
    name: 'API Key Authentication',
    type: 'api-key',
    description: 'Simple static token authentication for server-to-server communication. API keys are long-lived and should be treated as secrets. Best for service accounts, CI/CD pipelines, and automated scripts.',
    setup: [
      'Generate an API key from the workspace Settings → API Keys page',
      'Assign appropriate scopes to the key during generation',
      'Store the key securely in environment variables or a secrets manager',
      'Include the key in every request via the X-API-Key header',
      'Rotate keys periodically and immediately if compromised',
    ],
    scopes: [
      'full_access — Complete API access across all workspaces',
      'workspace_limited — Access limited to a specific workspace',
      'read_only — Read-only access to workspace content',
      'ai_only — Access limited to AI query endpoints',
    ],
    example: `# Generate API key (from workspace settings)
GNOVIUM_API_KEY="gnovium_live_abc123def456..."

# Use API key
curl -X GET https://api.gnovium.com/api/v1/workspaces/ \\
  -H "X-API-Key: gnovium_live_abc123def456..."

# Python
import requests

response = requests.get(
    "https://api.gnovium.com/api/v1/workspaces/",
    headers={"X-API-Key": "gnovium_live_abc123def456..."}
)`,
    bestFor: 'Server-to-server, CI/CD, service accounts, automated scripts',
  },
  {
    id: 'pat',
    name: 'Personal Access Tokens (PAT)',
    type: 'pat',
    description: 'User-scoped tokens for command-line tools and personal scripts. PATs inherit the permissions of the user who creates them and can be revoked individually.',
    setup: [
      'Generate a PAT from your User Settings → Access Tokens page',
      'Provide a descriptive name for the token to track its usage',
      'Copy the token immediately — it will not be shown again',
      'Use the token with Bearer authentication scheme',
      'Revoke individual tokens from the same page if compromised',
    ],
    scopes: [
      'All permissions of the generating user',
      'Can be limited to read-only during token creation',
    ],
    example: `# Generate PAT from user settings
GNOVIUM_PAT="gnovium_pat_abc123def456..."

# Use PAT
curl -X GET https://api.gnovium.com/api/v1/auth/me \\
  -H "Authorization: Bearer gnovium_pat_abc123def456..."

# Store securely in .env
echo "GNOVIUM_PAT=gnovium_pat_abc123def456..." >> .env

# Use with gnovium CLI
gnovium config set token $GNOVIUM_PAT`,
    bestFor: 'CLI tools, personal scripts, developer tooling',
  },
];

export const RATE_LIMIT_TIERS: RateLimitTier[] = [
  { tier: 'Free', requestsPerMinute: 30, requestsPerHour: 500, burstLimit: 10, description: 'Personal use, development, and testing. Suitable for individual knowledge workers.' },
  { tier: 'Pro', requestsPerMinute: 120, requestsPerHour: 3000, burstLimit: 30, description: 'Professional use for small teams and power users. Includes priority queueing.' },
  { tier: 'Team', requestsPerMinute: 500, requestsPerHour: 10000, burstLimit: 100, description: 'Team collaboration with higher throughput. Suitable for small to medium teams.' },
  { tier: 'Enterprise', requestsPerMinute: 2000, requestsPerHour: 50000, burstLimit: 250, description: 'Large-scale deployments with custom rate limits available on request.' },
];

export const BACKOFF_STRATEGY = `## Recommended Backoff Strategy

When you receive a 429 Too Many Requests response, implement the following retry strategy:

\`\`\`
1. Check the Retry-After header (value in seconds)
2. If present, wait exactly Retry-After seconds before retrying
3. If absent, use exponential backoff:
   - Initial delay: 1 second
   - Multiplier: 2x per retry
   - Maximum delay: 60 seconds
   - Maximum retries: 5
4. Add jitter (±20% random variation) to prevent thundering herd
\`\`\`

### Rate Limit Headers

Every API response includes the following rate limit headers:

| Header | Description | Example |
|--------|-------------|---------|
| X-RateLimit-Limit | Maximum requests per hour | 500 |
| X-RateLimit-Remaining | Requests remaining in current window | 423 |
| X-RateLimit-Reset | Unix timestamp when the window resets | 1758470400 |
| Retry-After | Seconds to wait before retrying (only on 429) | 30 |

### Best Practices

- **Cache responses** where possible to minimize API calls
- **Batch operations** using bulk endpoints instead of individual requests
- **Distribute requests** evenly across the rate limit window
- **Monitor headers** to proactively slow down before hitting limits
- **Webhook fallbacks** for polling-heavy workflows
`;

export const CORS_GUIDE = `## CORS Configuration

Gnovium supports Cross-Origin Resource Sharing (CORS) for browser-based applications. By default, all origins are allowed in local mode. In cloud mode, you can configure allowed origins.

### Default CORS Policy

| Setting | Value |
|---------|-------|
| Access-Control-Allow-Origin | * (local mode) or configurable (cloud mode) |
| Access-Control-Allow-Methods | GET, POST, PATCH, DELETE, OPTIONS |
| Access-Control-Allow-Headers | Content-Type, Authorization, X-API-Key, X-Request-ID |
| Access-Control-Expose-Headers | X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset, Retry-After |
| Access-Control-Max-Age | 86400 (24 hours) |

### Configuring Allowed Origins

In cloud mode, configure allowed origins via the workspace settings:

\`\`\`json
// Workspace settings
{
  "cors": {
    "allowed_origins": [
      "https://app.example.com",
      "https://admin.example.com"
    ],
    "allow_credentials": true
  }
}
\`\`\`

### Preflight Requests

The API responds to OPTIONS preflight requests automatically. Browsers send these before actual cross-origin requests to check CORS permissions.

### Local Mode

In local mode, CORS is fully permissive to support local development:
- All origins allowed
- All standard methods allowed  
- All standard headers allowed

This is safe in local mode because the API is only accessible from your device.
`;
