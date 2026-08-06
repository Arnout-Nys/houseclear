import { NextResponse } from "next/server";
import { COOKIE_NAME, signSession } from "@/lib/session";

export async function POST(req: Request) {
  const { pin } = await req.json();
  if (!process.env.FAMILY_PIN || pin !== process.env.FAMILY_PIN) {
    return NextResponse.json({ error: "Wrong PIN" }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, signSession(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30,
    path: "/"
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, "", { maxAge: 0, path: "/" });
  return res;
}
