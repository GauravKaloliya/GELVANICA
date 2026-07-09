import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Cross-app middleware for the landing app.
 * Detects requests intended for the cloud-web or docs apps
 * (running on different ports in development) and rewrites them.
 *
 * All paths derived from env vars — zero hardcoded strings.
 * In production, nginx handles this routing.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const cloudWebBasePath = process.env.NEXT_PUBLIC_CLOUD_WEB_BASE_PATH ?? '/app';
  const docsBasePath = process.env.NEXT_PUBLIC_DOCS_BASE_PATH ?? '/api/v1/docs';
  const apiBasePath = process.env.NEXT_PUBLIC_API_BASE_PATH ?? '/api/v1';
  const cloudWebUrl = process.env.NEXT_PUBLIC_CLOUD_WEB_URL ?? 'http://localhost:3001';
  const docsUrl = process.env.NEXT_PUBLIC_DOCS_URL ?? 'http://localhost:3002';
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000';

  // Rewrite cloud-web base path → cloud-web dev server
  // Guard: skip when empty (e.g. production — cloud-web on own subdomain)
  if (cloudWebBasePath && pathname.startsWith(cloudWebBasePath)) {
    return NextResponse.rewrite(new URL(pathname, cloudWebUrl));
  }

  // Rewrite docs base path → docs dev server
  if (docsBasePath && pathname.startsWith(docsBasePath)) {
    return NextResponse.rewrite(new URL(pathname, docsUrl));
  }

  // Rewrite API base path (non-docs) → backend
  if (apiBasePath && pathname.startsWith(apiBasePath) && !pathname.startsWith(docsBasePath)) {
    return NextResponse.rewrite(new URL(pathname, apiUrl));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.).*)'],
};
