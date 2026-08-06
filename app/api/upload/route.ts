import { NextResponse } from "next/server";
import { isSessionValid } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function POST(req: Request) {
  if (!(await isSessionValid())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });
  if (file.size > 8 * 1024 * 1024) return NextResponse.json({ error: "Photo must be under 8 MB" }, { status: 400 });
  const ext = (file.name.split(".").pop() || "jpg").replace(/[^a-zA-Z0-9]/g, "");
  const path = `${new Date().toISOString().slice(0,10)}/${crypto.randomUUID()}.${ext}`;
  const db = getSupabaseAdmin();
  const { error } = await db.storage.from("item-photos").upload(path, file, { contentType: file.type || "image/jpeg" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const { data } = db.storage.from("item-photos").getPublicUrl(path);
  return NextResponse.json({ url: data.publicUrl });
}
