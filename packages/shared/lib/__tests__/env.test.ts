import { describe, it, expect } from 'vitest';
import { createEnvConfig, assertEnv, envSchema } from '../env';

describe('envSchema', () => {
  it('parses valid env with defaults', () => {
    const result = envSchema.parse({});
    expect(result.NEXT_PUBLIC_LANDING_URL).toBe('http://localhost:3000');
    expect(result.NEXT_PUBLIC_CLOUD_WEB_URL).toBe('http://localhost:3001');
    expect(result.NEXT_PUBLIC_DOCS_URL).toBe('http://localhost:3002');
    expect(result.NEXT_PUBLIC_API_URL).toBe('http://localhost:5000');
    expect(result.NEXT_PUBLIC_API_BASE_PATH).toBe('/api/v1');
    expect(result.NEXT_PUBLIC_DOCS_BASE_PATH).toBe('/api/v1/docs');
  });

  it('parses custom values', () => {
    const result = envSchema.parse({
      NEXT_PUBLIC_LANDING_URL: 'https://gnovium.com',
      NEXT_PUBLIC_DOCS_URL: 'https://docs.gnovium.com',
    });
    expect(result.NEXT_PUBLIC_LANDING_URL).toBe('https://gnovium.com');
    expect(result.NEXT_PUBLIC_DOCS_URL).toBe('https://docs.gnovium.com');
  });

  it('rejects non-url values', () => {
    const result = envSchema.safeParse({
      NEXT_PUBLIC_LANDING_URL: 'not-a-url',
    });
    expect(result.success).toBe(false);
  });
});

describe('createEnvConfig', () => {
  it('returns config with defaults for empty env', () => {
    const config = createEnvConfig({});
    expect(config.NEXT_PUBLIC_LANDING_URL).toBe('http://localhost:3000');
    expect(config.NEXT_PUBLIC_DOCS_BASE_PATH).toBe('/api/v1/docs');
  });

  it('overrides with provided values', () => {
    const config = createEnvConfig({
      NEXT_PUBLIC_API_URL: 'https://api.example.com',
    });
    expect(config.NEXT_PUBLIC_API_URL).toBe('https://api.example.com');
  });
});

describe('assertEnv', () => {
  it('returns value when present', () => {
    const val = assertEnv('NEXT_PUBLIC_DOCS_URL', {
      NEXT_PUBLIC_DOCS_URL: 'http://localhost:3002',
    });
    expect(val).toBe('http://localhost:3002');
  });

  it('throws when missing', () => {
    expect(() =>
      assertEnv('NEXT_PUBLIC_DOCS_URL', {}),
    ).toThrow('Missing required environment variable');
  });

  it('throws on empty string', () => {
    expect(() =>
      assertEnv('NEXT_PUBLIC_DOCS_URL', {
        NEXT_PUBLIC_DOCS_URL: '',
      }),
    ).toThrow('Missing required environment variable');
  });
});
