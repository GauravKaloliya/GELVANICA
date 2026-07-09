export interface Parameter {
  name: string;
  type: string;
  required: boolean;
  description: string;
}

export interface Endpoint {
  id: string;
  module: string;
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  path: string;
  summary: string;
  description: string;
  headers?: Record<string, string>;
  parameters?: Parameter[];
  requestBody?: string;
  response: string;
  availability?: 'cloud-only';
}

export interface ErrorCode {
  code: string;
  httpStatus: number;
  module: string;
  title: string;
  description: string;
  causes: string[];
  resolution: string;
  example?: string;
}

export interface ChangelogEntry {
  version: string;
  date: string;
  type: 'major' | 'minor' | 'patch' | 'deprecation' | 'beta';
  title: string;
  description: string;
  breaking?: boolean;
  changes: {
    type: 'added' | 'changed' | 'deprecated' | 'removed' | 'fixed' | 'security';
    description: string;
    module?: string;
  }[];
}

export interface AuthMethod {
  id: string;
  name: string;
  type: 'oauth2' | 'api-key' | 'pat';
  description: string;
  setup: string[];
  scopes?: string[];
  example: string;
  bestFor: string;
}

export interface RateLimitTier {
  tier: string;
  requestsPerMinute: number;
  requestsPerHour: number;
  burstLimit: number;
  description: string;
}
