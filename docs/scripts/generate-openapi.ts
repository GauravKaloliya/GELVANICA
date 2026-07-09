import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ENDPOINTS } from '../src/data/index';
import type { Endpoint, Parameter } from '../src/data/types';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// --- Schema definitions (manually curated; these define the OpenAPI schemas) ---

const SCHEMAS: Record<string, object> = {
  ErrorResponse: {
    type: 'object',
    properties: {
      error: {
        type: 'object',
        properties: {
          code: { type: 'string' },
          message: { type: 'string' },
          details: { type: 'string' },
          request_id: { type: 'string' },
        },
      },
    },
  },
  DataEnvelope: {
    type: 'object',
    properties: {
      data: { type: 'object' },
    },
  },
  ListEnvelope: {
    type: 'object',
    properties: {
      data: { type: 'array', items: { type: 'object' } },
      meta: {
        type: 'object',
        properties: {
          page: { type: 'integer' },
          per_page: { type: 'integer' },
          total: { type: 'integer' },
          pages: { type: 'integer' },
        },
      },
    },
  },
  AuthRegisterRequest: {
    type: 'object',
    required: ['email', 'password', 'name'],
    properties: {
      email: { type: 'string', format: 'email', description: 'User email address' },
      password: { type: 'string', minLength: 8, description: 'Password (min 8 chars)' },
      name: { type: 'string', description: 'Full name' },
    },
  },
  AuthLoginRequest: {
    type: 'object',
    required: ['email', 'password'],
    properties: {
      email: { type: 'string', format: 'email' },
      password: { type: 'string' },
    },
  },
  AuthMeUpdateRequest: {
    type: 'object',
    properties: {
      name: { type: 'string' },
      avatar_url: { type: 'string', format: 'uri' },
    },
  },
  CreateWorkspaceRequest: {
    type: 'object',
    required: ['name'],
    properties: {
      name: { type: 'string', description: 'Workspace name' },
      description: { type: 'string', description: 'Workspace description' },
      settings: { type: 'object', description: 'Flexible workspace settings' },
    },
  },
  CreateEntityRequest: {
    type: 'object',
    required: ['workspace_id', 'entity_type_id', 'title'],
    properties: {
      workspace_id: { type: 'string', format: 'uuid' },
      entity_type_id: { type: 'string', format: 'uuid' },
      title: { type: 'string' },
      icon: { type: 'string' },
      cover_image: { type: 'string', format: 'uri', nullable: true },
      properties: { type: 'object' },
    },
  },
  HealthResponse: {
    type: 'object',
    properties: {
      data: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['healthy', 'degraded', 'unhealthy'] },
          service: { type: 'string' },
          version: { type: 'string' },
          uptime: { type: 'number' },
          timestamp: { type: 'string', format: 'date-time' },
        },
      },
    },
  },
};

// Map endpoint id → schema name for request body $refs
const REQUEST_BODY_SCHEMAS: Record<string, string> = {
  'auth-register': 'AuthRegisterRequest',
  'auth-login': 'AuthLoginRequest',
  'auth-me-update': 'AuthMeUpdateRequest',
  'workspaces-create': 'CreateWorkspaceRequest',
  'entities-create': 'CreateEntityRequest',
};

// --- Helpers ---

function toCamelCase(id: string): string {
  return id.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
}

function toOpenApiPath(p: string): string {
  return p.replace(/<([^>]+)>/g, '{$1}');
}

function extractPathParams(path: string): string[] {
  const matches = path.match(/\{(\w+)\}/g);
  return matches ? matches.map(m => m.slice(1, -1)) : [];
}

const TYPE_MAP: Record<string, string> = {
  UUID: 'string',
  String: 'string',
  Integer: 'integer',
  Boolean: 'boolean',
};

function convertParameter(param: Parameter, isPathParam: boolean): object {
  const schemaType = TYPE_MAP[param.type] || param.type.toLowerCase();
  const schema: Record<string, unknown> = { type: schemaType };
  if (param.type === 'UUID') {
    schema.format = 'uuid';
  }
  return {
    name: param.name,
    in: isPathParam ? 'path' : 'query',
    required: isPathParam ? true : param.required,
    schema,
    description: param.description,
  };
}

function buildDescription(ep: Endpoint): string {
  let desc = ep.description;
  if (ep.availability === 'cloud-only') {
    desc = `Cloud-only. ${desc}`;
  }
  return desc;
}

// --- Build endpoint metadata from TS source ---

interface EndpointMeta {
  id: string;
  module: string;
  method: string;
  path: string;
  summary: string;
  description: string;
  tags: string[];
  operationId: string;
  security: object[];
  parameters: object[];
  requestBody?: object;
}

function buildEndpointsMeta(): EndpointMeta[] {
  return ENDPOINTS.map(ep => {
    const openApiPath = toOpenApiPath(ep.path);
    const pathParams = extractPathParams(openApiPath);

    const parameters: object[] = (ep.parameters || []).map(p =>
      convertParameter(p, pathParams.includes(p.name))
    );

    const security = ep.headers ? [{ BearerAuth: [] }] : [];

    const meta: EndpointMeta = {
      id: ep.id,
      module: ep.module,
      method: ep.method,
      path: openApiPath,
      summary: ep.summary,
      description: buildDescription(ep),
      tags: [ep.module],
      operationId: toCamelCase(ep.id),
      security,
      parameters,
    };

    const schemaName = REQUEST_BODY_SCHEMAS[ep.id];
    if (schemaName) {
      meta.requestBody = {
        required: ep.method === 'POST',
        content: {
          'application/json': {
            schema: { $ref: `#/components/schemas/${schemaName}` },
          },
        },
      };
    }

    return meta;
  });
}

// --- Build OpenAPI spec ---

function buildPaths(endpointsMeta: EndpointMeta[]) {
  const paths: Record<string, Record<string, object>> = {};
  for (const ep of endpointsMeta) {
    if (!paths[ep.path]) paths[ep.path] = {};
    const method = ep.method.toLowerCase();
    const responses = {
      '200': { description: 'Success', content: { 'application/json': { schema: { $ref: '#/components/schemas/DataEnvelope' } } } },
      '400': { description: 'Bad Request', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
      '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
    };

    const operation: Record<string, unknown> = {
      tags: ep.tags,
      summary: ep.summary,
      description: ep.description,
      operationId: ep.operationId,
      parameters: ep.parameters,
      responses,
      security: ep.security,
    };

    if (ep.requestBody) {
      operation.requestBody = ep.requestBody;
    }

    paths[ep.path][method] = operation;
  }
  return paths;
}

const ENDPOINTS_META = buildEndpointsMeta();

const spec = {
  openapi: '3.0.3',
  info: {
    title: 'Gnovium Knowledge OS API',
    version: '1.0.1',
    description: `Gnovium API is a local-first Knowledge Operating System API for building applications where knowledge behaves like a living system rather than a collection of disconnected documents.

This API supports:
- Block-based content management with rich text editing
- Structured relational knowledge modeling with typed entities and properties
- Interactive knowledge graph with traversal, pathfinding, and queries
- Git-inspired versioning with branches, snapshots, and visual diffs
- AI-powered semantic search and natural language question answering
- Workspace governance with health scoring and duplicate detection
- Cross-device synchronization with conflict resolution
- File management with presigned URL uploads (cloud mode)

Deployment modes:
- **Local Mode** (default): SQLite storage, offline-first, local AI via Inference Runtime
- **Cloud Mode**: PostgreSQL, S3 storage, managed infrastructure`,
    contact: {
      name: 'Gaurav Kaloliya — Founder & Creator',
      url: 'https://www.linkedin.com/in/gaurav-kaloliya-b44569417',
      email: 'gaurav@gnovium.com',
    },
    license: {
      name: 'MIT',
      url: 'https://github.com/GauravKaloliya/gnovium/blob/main/LICENSE',
    },
    termsOfService: `${process.env.NEXT_PUBLIC_LANDING_URL || 'https://gnovium.com'}/terms`,
  },
  servers: [
    { url: `${process.env.NEXT_PUBLIC_API_URL || 'https://api.gnovium.com'}${process.env.NEXT_PUBLIC_API_BASE_PATH || '/api/v1'}`, description: 'Production (Cloud Mode)' },
    { url: `http://localhost:5000${process.env.NEXT_PUBLIC_API_BASE_PATH || '/api/v1'}`, description: 'Local Development (Local Mode)' },
    { url: `https://staging.api.gnovium.com${process.env.NEXT_PUBLIC_API_BASE_PATH || '/api/v1'}`, description: 'Staging' },
  ],
  paths: buildPaths(ENDPOINTS_META),
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT access token obtained via OAuth2 or direct login. Format: Bearer <token>',
      },
      ApiKeyAuth: {
        type: 'apiKey',
        in: 'header',
        name: 'X-API-Key',
        description: 'API key for server-to-server authentication. Generate from workspace settings.',
      },
      OAuth2: {
        type: 'oauth2',
        flows: {
          authorizationCode: {
            authorizationUrl: `${process.env.NEXT_PUBLIC_API_URL || 'https://api.gnovium.com'}/oauth/authorize`,
            tokenUrl: `${process.env.NEXT_PUBLIC_API_URL || 'https://api.gnovium.com'}/oauth/token`,
            scopes: {
              'workspace:read': 'Read workspace metadata and content',
              'workspace:write': 'Create, update, and delete workspace content',
              'workspace:admin': 'Manage workspace settings, members, and billing',
              'user:read': 'Read user profile information',
              'user:write': 'Update user profile settings',
              'offline_access': 'Receive refresh tokens for long-lived access',
            },
          },
        },
      },
    },
    schemas: SCHEMAS,
  },
  tags: [
    { name: 'System', description: 'Health checks and system information' },
    { name: 'Auth', description: 'Authentication and user management' },
    { name: 'Workspaces', description: 'Workspace CRUD and management' },
    { name: 'Entities', description: 'Entity/page CRUD and management' },
    { name: 'Blocks', description: 'Content blocks within entities' },
    { name: 'Tags', description: 'Tag management and assignment' },
    { name: 'Relations', description: 'Typed relations between entities' },
    { name: 'Comments', description: 'Comment system with threads' },
    { name: 'Branches', description: 'Version control branches' },
    { name: 'Versions', description: 'Version history and snapshots' },
    { name: 'Diffs', description: 'Comparison between versions' },
    { name: 'Search', description: 'Full-text and semantic search' },
    { name: 'AI', description: 'AI-powered workspace assistant' },
    { name: 'Files', description: 'File upload and management' },
    { name: 'Graph', description: 'Knowledge graph queries' },
    { name: 'Sync', description: 'Cross-device synchronization' },
    { name: 'Activity', description: 'Activity and audit logs' },
    { name: 'Governance', description: 'Workspace health and governance' },
    { name: 'Dashboard', description: 'Workspace dashboard analytics' },
    { name: 'Notifications', description: 'User notifications' },
    { name: 'Jobs', description: 'Background job management' },
    { name: 'Backups', description: 'Workspace export and import' },
  ],
  externalDocs: {
    description: 'Gnovium API Documentation',
    url: `${process.env.NEXT_PUBLIC_DOCS_URL || 'https://api.gnovium.com'}${process.env.NEXT_PUBLIC_DOCS_BASE_PATH || '/v1/docs'}`,
  },
};

// --- YAML serialization ---

function toYaml(obj: unknown, indent = 0): string {
  const spaces = '  '.repeat(indent);
  let result = '';
  if (Array.isArray(obj)) {
    if (obj.length === 0) return `${spaces}[]\n`;
    for (const item of obj) {
      if (typeof item === 'object' && item !== null) {
        result += `${spaces}- `;
        const nested = toYaml(item, indent + 1).trimStart();
        const lines = nested.split('\n');
        result += lines[0] + '\n';
        for (let i = 1; i < lines.length; i++) {
          result += `${spaces}  ${lines[i].trimStart()}\n`;
        }
      } else {
        result += `${spaces}- ${formatYamlValue(item)}\n`;
      }
    }
    return result;
  }
  if (typeof obj === 'object' && obj !== null) {
    const keys = Object.keys(obj);
    if (keys.length === 0) return '{}\n';
    for (const key of keys) {
      const val = (obj as Record<string, unknown>)[key];
      if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
        const nestedKeys = Object.keys(val);
        if (nestedKeys.length > 0) {
          result += `${spaces}${key}:\n`;
          result += toYaml(val, indent + 1);
        } else {
          result += `${spaces}${key}: {}\n`;
        }
      } else if (Array.isArray(val)) {
        if (val.length === 0) {
          result += `${spaces}${key}: []\n`;
        } else {
          result += `${spaces}${key}:\n`;
          result += toYaml(val, indent + 1);
        }
      } else {
        result += `${spaces}${key}: ${formatYamlValue(val)}\n`;
      }
    }
    return result;
  }
  return `${formatYamlValue(obj)}\n`;
}

function formatYamlValue(val: unknown): string {
  if (val === null || val === undefined) return 'null';
  if (typeof val === 'string') {
    if (val.includes(': ') || val.includes('#') || val.includes('\n') || val === 'true' || val === 'false' || val === 'null') {
      return `"${val.replace(/"/g, '\\"')}"`;
    }
    return val;
  }
  return String(val);
}

// --- Write output ---

const publicDir = path.resolve(__dirname, '..', 'public');

fs.writeFileSync(path.join(publicDir, 'openapi.json'), JSON.stringify(spec, null, 2), 'utf-8');
console.log('✓ Generated openapi.json');

const yamlContent = `# Gnovium Knowledge OS API — OpenAPI 3.0.3 Specification
# Generated at ${new Date().toISOString()}

${toYaml(spec)}`;
fs.writeFileSync(path.join(publicDir, 'openapi.yaml'), yamlContent, 'utf-8');
console.log('✓ Generated openapi.yaml');

fs.writeFileSync(path.join(publicDir, 'api-version.json'), JSON.stringify({
  version: spec.info.version,
  specVersion: spec.openapi,
  endpoints: ENDPOINTS_META.length,
  generatedAt: new Date().toISOString(),
}, null, 2), 'utf-8');
console.log('✓ Generated api-version.json');
