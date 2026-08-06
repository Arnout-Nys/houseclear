import crypto from "crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "houseclear_session";

function secret() {
  const value = process.env.SESSION_SECRET;
  if (!value) throw new Error("SESSION_SECRET is missing");
  return value;
}

export function signSession() {
  return crypto.createHmac("sha256", secret()).update("houseclear-family").digest("hex");
}

export async function isSessionValid() {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (!token) return false;
  const expected = signSession();
  const a = Buffer.from(token);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export { COOKIE_NAME };
