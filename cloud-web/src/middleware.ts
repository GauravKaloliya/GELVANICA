import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const API_PROXY_TARGET = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

const PUBLIC_PATHS = [
  "/auth",
  "/auth/sign-in",
  "/auth/sign-up",
  "/onboarding",
  "/auth/callback",
  "/invites",
];

const API_PATHS = ["/api/"];

const CSRF_MUTATION_METHODS = ["POST", "PUT", "PATCH", "DELETE"];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

function isApiPath(pathname: string): boolean {
  return API_PATHS.some((p) => pathname.startsWith(p));
}

function getTokenFromRequest(request: NextRequest): string | null {
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }
  return request.cookies.get("access_token")?.value ?? null;
}

function buildCacheHeaders(pathname: string): Record<string, string> {
  if (pathname.startsWith("/_next/static/")) {
    return {
      "Cache-Control": "public, max-age=31536000, immutable",
    };
  }

  if (pathname.match(/\.(svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|eot)$/)) {
    return {
      "Cache-Control": "public, max-age=2592000, stale-while-revalidate=86400",
    };
  }

  if (pathname === "/" || pathname.startsWith("/auth") || pathname === "/onboarding") {
    return {
      "Cache-Control": "public, max-age=0, must-revalidate",
      "Surrogate-Control": "max-age=60",
    };
  }

  if (pathname.startsWith("/workspace/")) {
    return {
      "Cache-Control": "private, no-cache, must-revalidate",
    };
  }

  if (pathname === "/workspaces" || pathname === "/profile" || pathname === "/settings") {
    return {
      "Cache-Control": "private, no-cache, must-revalidate",
    };
  }

  return {
    "Cache-Control": "public, max-age=0, must-revalidate",
  };
}

function buildCspHeader(): string {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
  const wsUrl = apiUrl.replace(/^http/, "ws");

  const isProduction = process.env.NODE_ENV === "production";

  const scriptSrc = isProduction
    ? "'self'"
    : "'self' 'unsafe-eval' 'unsafe-inline'";

  const styleSrc = isProduction
    ? "'self' 'unsafe-inline'"
    : "'self' 'unsafe-inline'";

  const imgSrc = isProduction
    ? "'self' blob: data: https://api.dicebear.com"
    : "'self' blob: data: https://api.dicebear.com https:";

  const connectSrc = isProduction
    ? `'self' ${apiUrl} ${wsUrl}`
    : `'self' ${apiUrl} ${wsUrl} http://localhost:5001 ws://localhost:5000`;

  const frameSrc = "'self' https://www.youtube.com https://player.vimeo.com";

  return [
    `default-src 'self'`,
    `script-src ${scriptSrc}`,
    `style-src ${styleSrc}`,
    `img-src ${imgSrc}`,
    `font-src 'self' https:`,
    `connect-src ${connectSrc}`,
    `frame-src ${frameSrc}`,
    `frame-ancestors 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
  ].join("; ");
}

async function proxyApiRequest(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (!pathname.startsWith("/api/")) return undefined;

  const targetUrl = `${API_PROXY_TARGET}${pathname}${search}`;

  const headers = new Headers(request.headers);
  headers.delete("host");

  const method = request.method;
  const body = method !== "GET" && method !== "HEAD" ? await request.blob() : undefined;

  const response = await fetch(targetUrl, {
    method,
    headers,
    body,
    redirect: "manual",
  });

  const responseHeaders = new Headers(response.headers);
  responseHeaders.delete("content-encoding");
  responseHeaders.delete("content-length");
  responseHeaders.delete("transfer-encoding");

  return new NextResponse(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
  });
}

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/api/")) {
    const apiResponse = await proxyApiRequest(request);
    if (apiResponse) return apiResponse;
  }

  if (isPublicPath(pathname)) {
    const token = getTokenFromRequest(request);
    if (token) {
      const url = request.nextUrl.clone();
      url.pathname = "/workspaces";
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  const token = getTokenFromRequest(request);

  if (!token) {
    if (pathname.startsWith("/workspace/")) {
      const url = request.nextUrl.clone();
      url.pathname = "/auth/sign-in";
      url.searchParams.set("redirect", pathname);
      return NextResponse.redirect(url);
    }

    if (pathname === "/workspaces" || pathname === "/profile" || pathname === "/settings") {
      const url = request.nextUrl.clone();
      url.pathname = "/auth/sign-in";
      url.searchParams.set("redirect", pathname);
      return NextResponse.redirect(url);
    }
  }

  if (CSRF_MUTATION_METHODS.includes(request.method)) {
    const origin = request.headers.get("origin");
    const referer = request.headers.get("referer");
    const host = request.headers.get("host");
    const contentType = request.headers.get("content-type") || "";

    const isFormSubmission = contentType.includes("multipart/form-data") || contentType.includes("application/x-www-form-urlencoded");
    const isJsonRequest = contentType.includes("application/json");

    if (host) {
      let requestOrigin: string | null = null;

      if (origin) {
        requestOrigin = origin;
      } else if (referer) {
        try {
          requestOrigin = new URL(referer).origin;
        } catch {
          return NextResponse.json(
            { error: { message: "CSRF validation failed: invalid referer" } },
            { status: 403 }
          );
        }
      }

      if (requestOrigin) {
        try {
          const originUrl = new URL(requestOrigin);
          if (originUrl.host !== host) {
            return NextResponse.json(
              { error: { message: "CSRF validation failed: origin mismatch" } },
              { status: 403 }
            );
          }
        } catch {
          return NextResponse.json(
            { error: { message: "CSRF validation failed: invalid origin" } },
            { status: 403 }
          );
        }
      } else if (isJsonRequest || isFormSubmission) {
        return NextResponse.json(
          { error: { message: "CSRF validation failed: missing origin" } },
          { status: 403 }
        );
      }
    }
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", pathname);
  requestHeaders.set("Content-Security-Policy", buildCspHeader());
  requestHeaders.set("X-Content-Type-Options", "nosniff");
  requestHeaders.set("X-Frame-Options", "DENY");
  requestHeaders.set("Referrer-Policy", "strict-origin-when-cross-origin");
  requestHeaders.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  requestHeaders.set("X-XSS-Protection", "1; mode=block");
  requestHeaders.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()");
  requestHeaders.set("Cross-Origin-Opener-Policy", "same-origin");
  requestHeaders.set("Cross-Origin-Resource-Policy", "same-origin");

  const cacheHeaders = buildCacheHeaders(pathname);
  for (const [key, value] of Object.entries(cacheHeaders)) {
    requestHeaders.set(key, value);
  }

  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
