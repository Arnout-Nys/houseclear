"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { MemberPicker, useMember } from "@/components/MemberPicker";
import { Nav } from "@/components/Nav";
import type { Destination, Item, VoteLevel } from "@/lib/types";

const destinations: Destination[] = ["undecided", "family", "sell", "donate", "clearance", "recycle", "trash"];
const labels: Record<string, string> = {
  undecided: "❓ Undecided",
  family: "👪 Family",
  sell: "💰 Sell",
  donate: "🎁 Donate",
  clearance: "🚚 Clearance",
  recycle: "♻️ Recycle",
  trash: "🗑️ Trash"
};

export default function ItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [item, setItem] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [siblings, setSiblings] = useState<Item[]>([]);
  const { members, selected, setSelected } = useMember();

  async function load() {
    const x: any = await api(`/api/items/${id}`);
    setItem(x);
    setTitle(x.title || "");
    setDescription(x.description || "");

    if (x.room_id) {
      api<Item[]>(`/api/items?room_id=${x.room_id}`)
        .then(setSiblings)
        .catch(() => {});
    }
  }

  useEffect(() => {
    load().catch(() => {});
  }, [id]);

  async function vote(level: VoteLevel) {
    if (!selected) return;
    setBusy(true);
    try {
      await api("/api/votes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ item_id: id, member_id: selected, level })
      });
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function patch(body: any) {
    setBusy(true);
    try {
      await api(`/api/items/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body)
      });
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function saveText() {
    await patch({ title: title.trim() || "Untitled item", description: description.trim() || null });
    setEditing(false);
  }

  async function addPhoto(file: File | null) {
    if (!file) return;
    setBusy(true);
    try {
      const fd = new FormData();
      fd.set("file", file);
      const up = await api<{ url: string }>("/api/upload", { method: "POST", body: fd });
      await api(`/api/items/${id}/photos`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: up.url })
      });
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirm(`Delete “${item.title}”? This cannot be undone.`)) return;
    setBusy(true);
    const result: any = await api(`/api/items/${id}`, { method: "DELETE" });
    router.push(`/room/${result.room_id || item.room_id}`);
    router.refresh();
  }

  if (!item) return <main className="shell">Loading…</main>;

  const myVote = (item.votes || []).find((v: any) => v.member_id === selected)?.level;
  const wants = (item.votes || []).filter((v: any) => v.level === "want");
  const photos = (item.item_photos || []).slice().sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0));
  if (!photos.length && item.photo_url) photos.push({ id: "legacy", url: item.photo_url });

  const currentIndex = siblings.findIndex((s) => s.id === id);
  const previous = currentIndex > 0 ? siblings[currentIndex - 1] : null;
  const next = currentIndex >= 0 && currentIndex < siblings.length - 1 ? siblings[currentIndex + 1] : null;

  return (
    <main className="shell stack">
      <header className="sticky-head">
        <div className="topbar" style={{ marginBottom: 0 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <Link className="subtle" href={`/room/${item.room_id}`}>← {item.rooms?.name || "Room"}</Link>
            {editing ? (
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                style={{ fontSize: "1.35rem", fontWeight: 700, width: "100%", marginTop: 6, padding: 8 }}
              />
            ) : (
              <h1 className="title" style={{ marginTop: 3, overflow: "hidden", textOverflow: "ellipsis" }}>{item.title}</h1>
            )}
          </div>
          <button className="btn" onClick={() => setEditing(!editing)}>{editing ? "Cancel" : "✏️ Edit"}</button>
        </div>
      </header>

      {photos.length > 0 ? (
        <div className="photo-strip">
          {photos.map((p: any) => <img key={p.id} className="photo" src={p.url} alt={item.title} />)}
        </div>
      ) : null}

      <label className="btn" style={{ textAlign: "center" }}>
        📷 Add another photo
        <input hidden type="file" accept="image/*" capture="environment" onChange={(e) => addPhoto(e.target.files?.[0] || null)} />
      </label>

      {editing ? (
        <section className="card stack">
          <label className="field">Notes<textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)} /></label>
          <button className="btn primary" disabled={busy} onClick={saveText}>Save changes</button>
        </section>
      ) : item.description ? (
        <div className="card">{item.description}</div>
      ) : null}

      <MemberPicker members={members} selected={selected} setSelected={setSelected} />

      <section className="card stack">
        <strong>Do you want this?</strong>
        <div className="grid2" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
          <button disabled={busy} className={`btn ${myVote === "want" ? "active" : ""}`} onClick={() => vote("want")}>❤️ Want</button>
          <button disabled={busy} className={`btn ${myVote === "maybe" ? "active" : ""}`} onClick={() => vote("maybe")}>🙂 Maybe</button>
          <button disabled={busy} className={`btn ${myVote === "no" ? "active" : ""}`} onClick={() => vote("no")}>🚫 No</button>
        </div>
        {wants.length > 0 ? <div><strong>Wanted by:</strong> {wants.map((v: any) => v.members?.name).filter(Boolean).join(", ")}</div> : null}
        {wants.length > 1 ? <div className="badge conflict">⚠️ Decision needed</div> : null}
      </section>

      <section className="card stack">
        <strong>Final destination</strong>
        <select
          value={item.destination || "undecided"}
          onChange={(e) => patch({
            destination: e.target.value === "undecided" ? null : e.target.value,
            status: e.target.value === "undecided" ? "undecided" : "decided"
          })}
        >
          {destinations.map((d) => <option key={d} value={d}>{labels[d] || d}</option>)}
        </select>

        {item.destination === "family" ? (
          <select value={item.assigned_member_id || ""} onChange={(e) => patch({ assigned_member_id: e.target.value || null })}>
            <option value="">Choose family member…</option>
            {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        ) : null}

        <button className={`btn ${item.status === "removed" ? "active" : ""}`} onClick={() => patch({ status: item.status === "removed" ? "decided" : "removed" })}>
          {item.status === "removed" ? "✅ Physically removed" : "📦 Mark as physically removed"}
        </button>
      </section>

      <section className="card">
        <button className="btn" disabled={busy} onClick={remove} style={{ width: "100%" }}>🗑️ Delete item</button>
      </section>

      {siblings.length > 1 ? (
        <div className="item-pager">
          {previous ? <Link href={`/item/${previous.id}`}>← Previous</Link> : <span />}
          <span className="subtle">{currentIndex + 1} / {siblings.length}</span>
          {next ? <Link href={`/item/${next.id}`}>Next →</Link> : <span />}
        </div>
      ) : null}

      <Nav />
    </main>
  );
}
