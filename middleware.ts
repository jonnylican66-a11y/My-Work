import { NextRequest, NextResponse } from "next/server";

const cookieName = "northstar_session";

function decodeBase64Url(value: string): Uint8Array<ArrayBuffer> | null {
  try {
    const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
    return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
  } catch {
    return null;
  }
}

async function hasValidSession(token: string, secret: string): Promise<boolean> {
  const parts = token.split(".");
  if (parts.length !== 3) return false;

  const headerBytes = decodeBase64Url(parts[0]);
  const payloadBytes = decodeBase64Url(parts[1]);
  const signature = decodeBase64Url(parts[2]);
  if (!headerBytes || !payloadBytes || !signature) return false;

  try {
    const header = JSON.parse(new TextDecoder().decode(headerBytes)) as { alg?: string };
    const payload = JSON.parse(new TextDecoder().decode(payloadBytes)) as {
      sub?: string;
      exp?: number;
    };
    if (header.alg !== "HS256" || !payload.sub || !payload.exp || payload.exp <= Date.now() / 1000) {
      return false;
    }

    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );
    return crypto.subtle.verify(
      "HMAC",
      key,
      signature,
      new TextEncoder().encode(`${parts[0]}.${parts[1]}`)
    );
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const token = request.cookies.get(cookieName)?.value;
  const secret = process.env.JWT_SECRET;
  if (token && secret && (await hasValidSession(token, secret))) {
    return NextResponse.next();
  }

  const response = NextResponse.redirect(new URL("/login", request.url));
  response.cookies.delete(cookieName);
  return response;
}

export const config = {
  matcher: ["/dashboard/:path*"]
};
