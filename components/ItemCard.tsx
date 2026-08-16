"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { api } from "@/lib/api";
import type { Item, Member, VoteLevel } from "@/lib/types";

const destinationLabel: Record<string, string> = {
  family: "👪 Family",
  sell: "💰 Sell",
  donate: "🎁 Donate",
  clearance: "🚚 Clearance",
  recycle: "♻️ Recycle",
  trash: "🗑️ Trash"
};

type PopoverType = "want" | "maybe" | "no" | "decision" | null;
type ViewMode = "photo" | "compact";

export function ItemCard({
  item,
  members,
  selected,
  onChanged,
  viewMode = "photo",
  scrollKey
}: {
  item: Item;
  members: Member[];
  selected: string;
  onChanged?: () => void | Promise<void>;
  viewMode?: ViewMode;
  scrollKey?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [openPopover, setOpenPopover] = useState<PopoverType>(null);
  const votes = item.votes || [];

  const decisionMakers = members.filter((member) => member.is_decision_maker);
  const decisionIds = new Set(decisionMakers.map((member) => member.id));

  const grouped = useMemo(() => {
    const result = { want: [] as string[], maybe: [] as string[], no: [] as string[] };
    for (const vote of votes) {
      const name = vote.members?.name;
      if (!name) continue;
      if (vote.level === "want") result.want.push(name);
      if (vote.level === "maybe") result.maybe.push(name);
      if (vote.level === "no") result.no.push(name);
    }
    return result;
  }, [votes]);

  const decisionStatus = useMemo(
    () => decisionMakers.map((member) => {
      const vote = votes.find((v) => v.member_id === member.id);
      return { name: member.name, voted: Boolean(vote), level: vote?.level || null };
    }),
    [decisionMakers, votes]
  );

  const decisionVoted = decisionStatus.filter((x) => x.voted).length;
  const wanters = grouped.want;
  const myVote = votes.find((vote) => vote.member_id === selected)?.level;
  const photo = item.item_photos?.[0]?.url || item.photo_url;

  async function vote(level: VoteLevel) {
    if (!selected || busy) return;
    setBusy(true);
    try {
      await api("/api/votes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ item_id: item.id, member_id: selected, level })
      });
      await onChanged?.();
    } finally {
      setBusy(false);
    }
  }

  function rememberScroll() {
    if (scrollKey && typeof window !== "undefined") {
      sessionStorage.setItem(scrollKey, String(window.scrollY));
    }
  }

  function togglePopover(type: PopoverType) {
    setOpenPopover(openPopover === type ? null : type);
  }

  const popoverStyle = {
    position: "absolute" as const,
    zIndex: 30,
    top: "calc(100% + 6px)",
    left: 0,
    minWidth: 170,
    maxWidth: 240,
    padding: 10,
    background: "var(--card)",
    border: "1px solid rgba(0,0,0,.12)",
    borderRadius: 10,
    boxShadow: "0 8px 25px rgba(0,0,0,.18)",
    fontSize: 14,
    lineHeight: 1.45
  };

  const Counter = ({ type, emoji, names, label }: {
    type: PopoverType;
    emoji: string;
    names: string[];
    label: string;
  }) => (
    <span
      className="badge"
      style={{ cursor: "pointer", userSelect: "none", position: "relative" }}
      title={names.length ? names.join(", ") : "Nobody"}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        togglePopover(type);
      }}
    >
      {emoji} {names.length}
      {openPopover === type ? (
        <div
          style={popoverStyle}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          <strong>{emoji} {label}</strong>
          <div style={{ marginTop: 6 }}>
            {names.length ? names.map((name) => <div key={name}>{name}</div>) : <div className="subtle">Nobody</div>}
          </div>
        </div>
      ) : null}
    </span>
  );

  return (
    <article className={`card item-card ${viewMode}-mode`}>
      <Link
        href={`/item/${item.id}`}
        className="item-card-link"
        onClick={rememberScroll}
      >
        {photo ? (
          <img className="item-card-media" src={photo} alt={item.title} loading="lazy" />
        ) : (
          <div className="item-card-media" />
        )}

        <div style={{ minWidth: 0 }}>
          <strong className="item-card-title">{item.title}</strong>

          {item.rooms ? (
            <div className="subtle" style={{ marginTop: 4 }}>
              {item.rooms.floor ? `${item.rooms.floor} — ` : ""}{item.rooms.name}
            </div>
          ) : null}

          <div className="badges" style={{ marginTop: 9, position: "relative" }}>
            <Counter type="want" emoji="❤️" names={grouped.want} label="Want" />
            <Counter type="maybe" emoji="🙂" names={grouped.maybe} label="Maybe" />
            <Counter type="no" emoji="🚫" names={grouped.no} label="No interest" />

            <span
              className="badge"
              style={{ cursor: "pointer", userSelect: "none", position: "relative" }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                togglePopover("decision");
              }}
            >
              👤 {decisionVoted}/{decisionMakers.length || 3}
              {openPopover === "decision" ? (
                <div style={popoverStyle} onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
                  <strong>Decision makers</strong>
                  <div style={{ marginTop: 6 }}>
                    {decisionStatus.map((person) => (
                      <div key={person.name}>
                        {person.voted ? "✅" : "⏳"} {person.name}
                        {person.level === "want" ? " — ❤️" : ""}
                        {person.level === "maybe" ? " — 🙂" : ""}
                        {person.level === "no" ? " — 🚫" : ""}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </span>

            {item.status === "removed" ? <span className="badge">✅ Removed</span> : null}
            {item.destination ? <span className="badge">{destinationLabel[item.destination] || item.destination}</span> : null}
          </div>

          {wanters.length > 1 ? (
            <div className="badge conflict" style={{ marginTop: 8, display: "inline-block" }}>
              ⚠️ {wanters.join(", ")}
            </div>
          ) : null}
        </div>
      </Link>

      <div className="grid2" style={{ gridTemplateColumns: "repeat(3,1fr)", marginTop: 10 }}>
        <button className={`btn ${myVote === "want" ? "active" : ""}`} disabled={busy || !selected} onClick={() => vote("want")} aria-label="Want">❤️</button>
        <button className={`btn ${myVote === "maybe" ? "active" : ""}`} disabled={busy || !selected} onClick={() => vote("maybe")} aria-label="Maybe">🙂</button>
        <button className={`btn ${myVote === "no" ? "active" : ""}`} disabled={busy || !selected} onClick={() => vote("no")} aria-label="No interest">🚫</button>
      </div>
    </article>
  );
}
