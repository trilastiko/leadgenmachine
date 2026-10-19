import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "crypto";
import { env } from "./env";

const COOKIE = "lgm_session";

function sign(value: string, secret: string): string {
  return createHmac("sha256", secret).update(value).digest("hex");
}

export function makeSessionToken(): string {
  const secret = env().SESSION_SECRET;
  const issued = Date.now().toString();
  return `${issued}.${sign(issued, secret)}`;
}

export function verifySessionToken(token: string | undefined): boolean {
  if (!token || !/^\d{13}\.[a-f0-9]{64}$/.test(token)) return false;
  const [issued, sig] = token.split(".");
  const age = Date.now() - Number(issued);
  // Match the 30-day cookie lifetime and allow a small clock skew.
  if (age < -60_000 || age > 30 * 24 * 60 * 60 * 1000) return false;
  const secret = env().SESSION_SECRET;
  const expected = sign(issued, secret);
  try {
    return timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
  } catch {
    return false;
  }
}

export async function isAuthed(): Promise<boolean> {
  const jar = await cookies();
  return verifySessionToken(jar.get(COOKIE)?.value);
}

export async function login(secret: string): Promise<boolean> {
  if (secret !== env().SESSION_SECRET) return false;
  const jar = await cookies();
  jar.set(COOKIE, makeSessionToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return true;
}

export async function logout(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE);
}

export const SESSION_COOKIE = COOKIE;
