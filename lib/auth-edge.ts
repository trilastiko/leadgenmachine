import { env } from "./env";
import { parseSessionToken } from "./session";

// Web Crypto preserves the server's HMAC token format without Node-only imports.
export async function verifySessionTokenEdge(token: string | undefined): Promise<boolean> {
  const parts = parseSessionToken(token);
  if (!parts) return false;
  try {
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(env().SESSION_SECRET),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"],
    );
    const signature = Uint8Array.from(parts.sig.match(/../g)!, (byte) => parseInt(byte, 16));
    return await crypto.subtle.verify("HMAC", key, signature, new TextEncoder().encode(parts.issued));
  } catch {
    return false;
  }
}
