"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Nav } from "@/components/Nav";
import { ItemCard } from "@/components/ItemCard";
import { useMember } from "@/components/MemberPicker";
import type { Item } from "@/lib/types";

type ViewMode = "photo" | "compact";

export default function RoomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [items, setItems] = useState<Item[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>("photo");
  const { members, selected } = useMember();
  const scrollKey = `houseclear:room:${id}:scroll`;

  async function load() {
    setItems(await api<Item[]>(`/api/items?room_id=${id}`));
  }

  useEffect(() => {
    const savedView = localStorage.getItem("houseclear:item-view");
    if (savedView === "photo" || savedView === "compact") setViewMode(savedView);
    load().catch(() => {});
  }, [id]);

  useEffect(() => {
    if (!items.length) return;
    const stored = sessionStorage.getItem(scrollKey);
    if (!stored) return;
    const y = Number(stored);
    if (!Number.isFinite(y)) return;
    requestAnimationFrame(() => window.scrollTo({ top: y, behavior: "auto" }));
  }, [items.length, scrollKey]);

  function changeView(mode: ViewMode) {
    setViewMode(mode);
    localStorage.setItem("houseclear:item-view", mode);
  }

  const room = items[0]?.rooms;

  return (
    <main className="shell stack">
      <header className="sticky-head">
        <div className="topbar" style={{ marginBottom: 0 }}>
          <div style={{ minWidth: 0 }}>
            <Link className="subtle" href="/">← Rooms</Link>
            <h1 className="title" style={{ marginTop: 3 }}>{room?.name || "Room"}</h1>
            <div className="subtle">{items.length} items</div>
          </div>

          <div className="view-toggle" aria-label="Item view">
            <button className={viewMode === "photo" ? "active" : ""} onClick={() => changeView("photo")} aria-label="Photo view">▣</button>
            <button className={viewMode === "compact" ? "active" : ""} onClick={() => changeView("compact")} aria-label="Compact view">▦</button>
          </div>
        </div>
      </header>

      <div className="filter-strip" aria-label="Room actions">
        <Link className="filter-chip" href={`/add?room=${id}`}>＋ Add one</Link>
        <Link className="filter-chip" href={`/batch-add?room=${id}`}>📸 Batch add</Link>
        <Link className="filter-chip" href="/items?filter=needs_review">Needs review</Link>
        <Link className="filter-chip" href="/items?filter=conflicts">⚠️ Conflicts</Link>
      </div>

      {items.length === 0 ? (
        <div className="card empty">
          Nothing photographed here yet.
          <br /><br />
          <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
            <Link className="btn" href={`/batch-add?room=${id}`}>📸 Batch add</Link>
            <Link className="btn primary" href={`/add?room=${id}`}>+ Add one item</Link>
          </div>
        </div>
      ) : (
        <section className="stack">
          {items.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              members={members}
              selected={selected}
              onChanged={load}
              viewMode={viewMode}
              scrollKey={scrollKey}
            />
          ))}
        </section>
      )}

      <Link className="floating-add" href={`/add?room=${id}`} aria-label="Add item">＋</Link>
      <Nav />
    </main>
  );
}
