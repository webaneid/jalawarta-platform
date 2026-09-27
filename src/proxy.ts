import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { normalizeHost } from "@/lib/normalize-host";

export const config = {
  matcher: [
    "/((?!api/|_next/|_static/|_vercel|uploads/|[\\w-]+\\.\\w+).*)",
  ],
};

const ROOT = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "jalawarta.com";

async function getSession(req: NextRequest) {
  const token = req.cookies.get("jw_session")?.value;
  if (!token) return null;
  try {
    const secret = new TextEncoder().encode(process.env.AUTH_SECRET!);
    const { payload } = await jwtVerify(token, secret, { algorithms: ["HS256"] });
    return payload;
  } catch {
    return null;
  }
}

// Base URL untuk internal resolve — WAJIB set APP_INTERNAL_URL di production env
// agar tidak fallback ke host header yang bisa dimanipulasi attacker (SSRF).
const INTERNAL_BASE = process.env.APP_INTERNAL_URL ?? "http://localhost:3000";

async function resolveTenantSlug(hostname: string): Promise<string | null> {
  try {
    const resolveUrl = new URL("/api/internal/resolve-domain", INTERNAL_BASE);
    resolveUrl.searchParams.set("domain", hostname);
    const headers: Record<string, string> = {};
    if (process.env.INTERNAL_API_SECRET) {
      headers["x-internal-secret"] = process.env.INTERNAL_API_SECRET;
    }
    const res = await fetch(resolveUrl.toString(), {
      cache: "no-store",
      headers,
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return null;
    const { slug } = (await res.json()) as { slug: string };
    return slug ?? null;
  } catch {
    return null;
  }
}

export default async function middleware(req: NextRequest) {
  const url = req.nextUrl;

  let rawHost = req.headers.get("host")!;

  // Vercel preview URL normalization: foo---branch-xxx.vercel.app → foo.jalawarta.com
  if (
    rawHost.includes("---") &&
    rawHost.endsWith(`.${process.env.NEXT_PUBLIC_VERCEL_DEPLOYMENT_SUFFIX}`)
  ) {
    rawHost = `${rawHost.split("---")[0]}.${ROOT}`;
  }

  const hostname = normalizeHost(rawHost);
  const rawHostname = rawHost.split(":")[0];
  const hasWww = rawHostname !== hostname;

  const searchParams = req.nextUrl.searchParams.toString();
  const qs = searchParams.length > 0 ? `?${searchParams}` : "";

  // ── ROOT DOMAIN ──────────────────────────────────────────────────────────
  // jalawarta.com/webane → path-based tenant routing, Next.js handles [domain] naturally
  if (hostname === "localhost" || hostname === ROOT) {
    return NextResponse.next();
  }

  // ── PLATFORM DOMAIN ──────────────────────────────────────────────────────
  if (hostname === "platform.localhost" || hostname === `platform.${ROOT}`) {
    if (url.pathname === "/login") {
      return NextResponse.rewrite(new URL("/app-login", req.url));
    }

    const session = await getSession(req);
    if (!session) {
      const loginUrl = new URL(req.url);
      loginUrl.pathname = "/login";
      loginUrl.searchParams.set("callbackUrl", url.pathname);
      return NextResponse.redirect(loginUrl);
    }

    const targetPath = url.pathname.startsWith("/platform")
      ? url.pathname
      : `/platform${url.pathname === "/" ? "" : url.pathname}`;

    return NextResponse.rewrite(new URL(`${targetPath}${qs}`, req.url));
  }

  // ── APP DOMAIN ───────────────────────────────────────────────────────────
  if (hostname === "app.localhost" || hostname === `app.${ROOT}`) {
    if (url.pathname === "/login") {
      return NextResponse.rewrite(new URL("/app-login", req.url));
    }

    const session = await getSession(req);
    if (!session) {
      const loginUrl = new URL(req.url);
      loginUrl.pathname = "/login";
      loginUrl.searchParams.set("callbackUrl", url.pathname);
      return NextResponse.redirect(loginUrl);
    }

    const targetPath = url.pathname.startsWith("/app")
      ? url.pathname
      : `/app${url.pathname === "/" ? "" : url.pathname}`;

    return NextResponse.rewrite(new URL(`${targetPath}${qs}`, req.url));
  }

  // ── TENANT DOMAIN (subdomain atau custom domain) ──────────────────────────

  // Blok /app/* dan /platform/* dari domain tenant — CMS dashboard hanya via app.jalawarta.com
  if (url.pathname.startsWith("/app") || url.pathname.startsWith("/platform")) {
    return NextResponse.redirect(new URL("/", `https://${ROOT}`));
  }

  // www redirect → apex domain (301 permanent)
  if (hasWww) {
    const apexUrl = req.nextUrl.clone();
    apexUrl.host = hostname;
    return NextResponse.redirect(apexUrl, 301);
  }

  const slug = await resolveTenantSlug(hostname);

  if (!slug) {
    return NextResponse.next();
  }

  // Cegah double-path: /{slug}/{slug}/... jika path sudah berisi slug
  if (url.pathname.startsWith(`/${slug}/`) || url.pathname === `/${slug}`) {
    return NextResponse.next();
  }

  return NextResponse.rewrite(
    new URL(`/${slug}${url.pathname === "/" ? "" : url.pathname}${qs}`, req.url)
  );
}
