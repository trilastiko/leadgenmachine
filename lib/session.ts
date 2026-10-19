export const SESSION_COOKIE = "lgm_session";
export const SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

export function parseSessionToken(token: string | undefined) {
  if (!token || !/^\d{13}\.[a-f0-9]{64}$/.test(token)) return null;
  const [issued, sig] = token.split(".");
  const age = Date.now() - Number(issued);
  if (age < -60_000 || age > SESSION_MAX_AGE_MS) return null;
  return { issued, sig };
}
