import { describe, it, expect } from 'vitest';
import { Routes } from '../routes';

describe('Routes', () => {
  describe('landing', () => {
    it('builds home path', () => {
      expect(Routes.landing.home.build({})).toBe('/');
    });

    it('builds download path', () => {
      expect(Routes.landing.download.build({})).toBe('/download');
    });

    it('builds anchor paths', () => {
      expect(Routes.landing.features.build({})).toBe('/#features');
      expect(Routes.landing.about.build({})).toBe('/#about');
    });
  });

  describe('cloud-web', () => {
    it('builds sign-in path', () => {
      expect(Routes.cloudWeb.signIn.build({})).toBe('/signin');
    });

    it('builds sign-up path', () => {
      expect(Routes.cloudWeb.signUp.build({})).toBe('/signup');
    });

    it('builds workspace detail with id parameter', () => {
      const path = Routes.cloudWeb.workspaceDetail.build({ id: 'abc-123' });
      expect(path).toBe('/workspaces/abc-123');
    });

    it('encodes URI components in parameters', () => {
      const path = Routes.cloudWeb.workspaceDetail.build({ id: 'my workspace' });
      expect(path).toBe('/workspaces/my%20workspace');
    });

    it('builds entity detail with multiple parameters', () => {
      const path = Routes.cloudWeb.entityDetail.build({
        workspaceId: 'w1',
        entityId: 'e1',
      });
      expect(path).toBe('/workspaces/w1/entities/e1');
    });
  });

  describe('docs', () => {
    it('builds changelog path', () => {
      expect(Routes.docs.changelog.build({})).toBe('/changelog');
    });

    it('builds error catalog path', () => {
      expect(Routes.docs.errorCatalog.build({})).toBe('/error-catalog');
    });
  });
});

describe('RouteDefinition.match', () => {
  it('matches static paths', () => {
    const result = Routes.landing.download.match('/download');
    expect(result).toEqual({});
  });

  it('rejects non-matching static paths', () => {
    const result = Routes.landing.download.match('/download/extra');
    expect(result).toBeNull();
  });

  it('matches parameterized paths', () => {
    const result = Routes.cloudWeb.workspaceDetail.match('/workspaces/abc-123');
    expect(result).toEqual({ id: 'abc-123' });
  });

  it('matches multi-parameter paths', () => {
    const result = Routes.cloudWeb.entityDetail.match('/workspaces/w1/entities/e1');
    expect(result).toEqual({ workspaceId: 'w1', entityId: 'e1' });
  });

  it('returns null for mismatched parameterized paths', () => {
    const result = Routes.cloudWeb.workspaceDetail.match('/workspaces');
    expect(result).toBeNull();
  });
});
