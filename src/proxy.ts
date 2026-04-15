import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

export const config = {
  matcher: [
    "/((?!api/|_next/|_static/|_vercel|uploads/|[\\w-]+\\.\\w+).*)",
  ],
};

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

export default async function middleware(req: NextRequest) {
  const url = req.nextUrl;

  let rawHost = req.headers.get("host")!;
  let hostname = rawHost.split(":")[0];

  if (
    hostname.includes("---") &&
    hostname.endsWith(`.${process.env.NEXT_PUBLIC_VERCEL_DEPLOYMENT_SUFFIX}`)
  ) {
    hostname = `${hostname.split("---")[0]}.${
      process.env.NEXT_PUBLIC_ROOT_DOMAIN || "jalawarta.com"
    }`;
  }

  const searchParams = req.nextUrl.searchParams.toString();
  const path = `${url.pathname}${searchParams.length > 0 ? `?${searchParams}` : ""}`;

  // ── ROOT DOMAIN ─────────────────────────────────────────────
  if (hostname === "localhost" || hostname === process.env.NEXT_PUBLIC_ROOT_DOMAIN) {
    return NextResponse.next();
  }

  // ── PLATFORM DOMAIN ─────────────────────────────────────────
  if (hostname === "platform.localhost" || hostname === `platform.${process.env.NEXT_PUBLIC_ROOT_DOMAIN}`) {
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
    
    // Redirect to /platform folder seamlessly
    const targetPath = url.pathname.startsWith("/platform")
      ? url.pathname
      : `/platform${url.pathname === "/" ? "" : url.pathname}`;
      
    return NextResponse.rewrite(
      new URL(`${targetPath}${searchParams.length > 0 ? `?${searchParams}` : ""}`, req.url)
    );
  }

  // ── APP DOMAIN ──────────────────────────────────────────────
  if (hostname === "app.localhost" || hostname === `app.${process.env.NEXT_PUBLIC_ROOT_DOMAIN}`) {
    // Halaman /login bebas diakses — pisah layout (tanpa sidebar dasbor)
    if (url.pathname === "/login") {
      return NextResponse.rewrite(new URL("/app-login", req.url));
    }

    // Cek session cookie untuk semua rute lain
    const session = await getSession(req);
    if (!session) {
      // Redirect ke /login dengan URL absolut (hindari redirect loop)
      const loginUrl = new URL(req.url);
      loginUrl.pathname = "/login";
      loginUrl.searchParams.set("callbackUrl", url.pathname);
      return NextResponse.redirect(loginUrl);
    }

    const targetPath = url.pathname.startsWith("/app") 
      ? url.pathname 
      : `/app${url.pathname === "/" ? "" : url.pathname}`;

    return NextResponse.rewrite(
      new URL(`${targetPath}${searchParams.length > 0 ? `?${searchParams}` : ""}`, req.url)
    );
  }

  // ── TENANT DOMAIN ────────────────────────────────────────────
  return NextResponse.rewrite(new URL(`/${hostname}${path}`, req.url));
}
