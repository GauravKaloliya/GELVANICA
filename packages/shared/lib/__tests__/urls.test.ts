import { describe, it, expect } from 'vitest';
import { appUrl } from '../urls';
import { createEnvConfig } from '../env';

const DEV_CONFIG = createEnvConfig({
  NEXT_PUBLIC_LANDING_URL: 'http://localhost:3000',
  NEXT_PUBLIC_FRONTEND_URL: 'http://localhost:3001',
  NEXT_PUBLIC_DOCS_URL: 'http://localhost:3002',
  NEXT_PUBLIC_API_URL: 'http://localhost:5000',
  NEXT_PUBLIC_LANDING_BASE_PATH: '',
  NEXT_PUBLIC_FRONTEND_BASE_PATH: '/app',
  NEXT_PUBLIC_DOCS_BASE_PATH: '/api/v1/docs',
  NEXT_PUBLIC_API_BASE_PATH: '/api/v1',
});

const PROD_CONFIG = createEnvConfig({
  NEXT_PUBLIC_LANDING_URL: 'https://gnovium.com',
  NEXT_PUBLIC_FRONTEND_URL: 'https://app.gnovium.com',
  NEXT_PUBLIC_DOCS_URL: 'https://api.gnovium.com',
  NEXT_PUBLIC_API_URL: 'https://api.gnovium.com',
  NEXT_PUBLIC_LANDING_BASE_PATH: '',
  NEXT_PUBLIC_FRONTEND_BASE_PATH: '',
  NEXT_PUBLIC_DOCS_BASE_PATH: '/v1/docs',
  NEXT_PUBLIC_API_BASE_PATH: '/v1',
});

describe('appUrl — development', () => {
  it('landing at root', () => {
    expect(appUrl('landing', '/', DEV_CONFIG)).toBe('http://localhost:3000/');
  });

  it('frontend at /app base path', () => {
    expect(appUrl('frontend', '/signin', DEV_CONFIG)).toBe('http://localhost:3001/app/signin');
  });

  it('docs at /api/v1/docs base path', () => {
    expect(appUrl('docs', '/changelog', DEV_CONFIG)).toBe('http://localhost:3002/api/v1/docs/changelog');
  });

  it('docs root', () => {
    expect(appUrl('docs', '/', DEV_CONFIG)).toBe('http://localhost:3002/api/v1/docs/');
  });

  it('adds leading slash if missing', () => {
    expect(appUrl('docs', 'changelog', DEV_CONFIG)).toBe('http://localhost:3002/api/v1/docs/changelog');
  });
});

describe('appUrl — production', () => {
  it('landing at root domain', () => {
    expect(appUrl('landing', '/', PROD_CONFIG)).toBe('https://gnovium.com/');
  });

  it('frontend at own subdomain with no base path', () => {
    expect(appUrl('frontend', '/signin', PROD_CONFIG)).toBe('https://app.gnovium.com/signin');
  });

  it('docs at /v1/docs base path on api subdomain', () => {
    expect(appUrl('docs', '/changelog', PROD_CONFIG)).toBe('https://api.gnovium.com/v1/docs/changelog');
  });

  it('docs root', () => {
    expect(appUrl('docs', '/', PROD_CONFIG)).toBe('https://api.gnovium.com/v1/docs/');
  });

  it('frontend home', () => {
    expect(appUrl('frontend', '/', PROD_CONFIG)).toBe('https://app.gnovium.com/');
  });
});
