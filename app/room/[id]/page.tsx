"use client";

import Link from "next/link";
import { use, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { Nav } from "@/components/Nav";
import { GlobalMenu } from "@/components/GlobalMenu";
import { ItemCard } from "@/components/ItemCard";
import { useMember } from "@/components/MemberPicker";
import type { Item } from "@/lib/types";

type ViewMode = "photo" | "compact";
type RoomFilter = "all" | "needs_review" | "conflicts" | "decided" | "removed";

const filterLabels: Record<RoomFilter, string> = {
  all: "Alles",
  needs_review: "Nog te bekijken",
  conflicts: "Conflicten",
  decided: "Beslist",
  removed: "Verwijderd"
};

export default function RoomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [items, setItems] = useState<Item[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>("photo");
  const [filter, setFilter] = useState<RoomFilter>("all");
  const [filterOpen, setFilterOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
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

  const decisionMakerIds = useMemo(
    () => new Set(members.filter((member) => member.is_decision_maker).map((member) => member.id)),
    [members]
  );

  const visibleItems = useMemo(() => {
    return items.filter((item) => {
      if (filter === "all") return true;
      if (filter === "removed") return item.status === "removed";
      if (filter === "decided") return Boolean(item.destination) && item.status !== "removed";

      const votes = item.votes || [];
      const wants = votes.filter((vote) => vote.level === "want").length;
      if (filter === "conflicts") return wants > 1;

      if (filter === "needs_review") {
        if (item.destination || item.status === "removed") return false;
        const votedDecisionMakers = new Set(
          votes.filter((vote) => decisionMakerIds.has(vote.member_id)).map((vote) => vote.member_id)
        );
        return wants > 1 || votedDecisionMakers.size < decisionMakerIds.size;
      }

      return true;
    });
  }, [items, filter, decisionMakerIds]);

  const room = items[0]?.rooms;

  return (
    <main className="shell stack">
      <header className="sticky-head compact-room-head">
        <div className="room-head-row">
          <div style={{ minWidth: 0 }}>
            <Link className="subtle" href="/">← Kamers</Link>
            <h1 className="title" style={{ marginTop: 3 }}>{room?.name || "Kamer"}</h1>
            <div className="subtle">{items.length} items</div>
          </div>
          <GlobalMenu roomId={id} />
        </div>

        <div className="room-tools">
          <div className="view-toggle" aria-label="Weergave">
            <button className={viewMode === "photo" ? "active" : ""} onClick={() => changeView("photo")}>▣ Foto</button>
            <button className={viewMode === "compact" ? "active" : ""} onClick={() => changeView("compact")}>▦ Compact</button>
          </div>

          <div className="filter-menu-wrap">
            <button className={`filter-button ${filter !== "all" ? "active" : ""}`} onClick={() => setFilterOpen((value) => !value)}>
              ⏷ {filterLabels[filter]}
            </button>
            {filterOpen ? (
              <div className="filter-popover">
                {(Object.keys(filterLabels) as RoomFilter[]).map((value) => (
                  <button
                    key={value}
                    className={filter === value ? "active" : ""}
                    onClick={() => {
                      setFilter(value);
                      setFilterOpen(false);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                  >
                    {filterLabels[value]}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </header>

      {filter !== "all" ? (
        <div className="active-filter-row">
          <span>{visibleItems.length} resultaten · {filterLabels[filter]}</span>
          <button onClick={() => setFilter("all")}>Wis filter</button>
        </div>
      ) : null}

      {items.length === 0 ? (
        <div className="card empty">
          Nog niets gefotografeerd in deze kamer.
          <br /><br />
          <div style={{ display: "grid", gap: 8 }}>
            <Link className="btn primary" href={`/add?room=${id}`}>＋ Eén item toevoegen</Link>
            <Link className="btn" href={`/batch-add?room=${id}`}>📸 Meerdere foto’s met AI</Link>
          </div>
        </div>
      ) : visibleItems.length === 0 ? (
        <div className="card empty">
          Geen items voor deze filter.
          <br /><br />
          <button className="btn" onClick={() => setFilter("all")}>Toon alles</button>
        </div>
      ) : (
        <section className="stack">
          {visibleItems.map((item) => (
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

      {addOpen ? (
        <div
          style={{
            position: "fixed",
            right: 16,
            bottom: "calc(var(--nav-h) + 92px + env(safe-area-inset-bottom))",
            zIndex: 36,
            width: 250,
            display: "grid",
            gap: 8,
            padding: 10,
            borderRadius: 18,
            background: "rgba(255,255,255,.98)",
            border: "1px solid var(--line)",
            boxShadow: "0 12px 32px rgba(0,0,0,.18)",
            backdropFilter: "blur(14px)"
          }}
        >
          <div style={{ padding: "4px 4px 2px" }}>
            <strong>Toevoegen</strong>
            <div className="subtle" style={{ marginTop: 2 }}>Kies hoe je items wilt registreren.</div>
          </div>
          <Link className="btn primary" href={`/add?room=${id}`} onClick={() => setAddOpen(false)}>＋ Eén item</Link>
          <Link className="btn" href={`/batch-add?room=${id}`} onClick={() => setAddOpen(false)}>📸 Meerdere foto’s met AI</Link>
        </div>
      ) : null}

      <button
        type="button"
        className="floating-add"
        aria-label="Items toevoegen"
        aria-expanded={addOpen}
        onClick={() => setAddOpen((value) => !value)}
      >
        {addOpen ? "×" : "＋"}
      </button>

      <Nav />
    </main>
  );
}
