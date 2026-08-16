"use client";

import Link from "next/link";
import { useState } from "react";
import { useMember } from "@/components/MemberPicker";

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return (parts[0]?.[0] || "?") + (parts[1]?.[0] || "");
}

export function GlobalMenu({ roomId }: { roomId?: string }) {
  const [open, setOpen] = useState(false);
  const { members, selected, setSelected } = useMember();
  const active = members.find((member) => member.id === selected);

  return (
    <>
      <button
        type="button"
        className="menu-trigger"
        onClick={() => setOpen(true)}
        aria-label="Menu openen"
      >
        <span className="menu-avatar">{initials(active?.name || "?")}</span>
        <span className="menu-bars">☰</span>
      </button>

      {open ? (
        <div className="menu-backdrop" role="presentation" onClick={() => setOpen(false)}>
          <aside className="global-menu" role="dialog" aria-modal="true" aria-label="HouseClear menu" onClick={(event) => event.stopPropagation()}>
            <div className="global-menu-head">
              <div>
                <strong>HouseClear</strong>
                <div className="subtle">Je bent {active?.name || "…"}</div>
              </div>
              <button className="menu-close" onClick={() => setOpen(false)} aria-label="Menu sluiten">×</button>
            </div>

            <section className="menu-section">
              <strong>Wie ben je?</strong>
              <div className="menu-members">
                {members.map((member) => (
                  <button
                    key={member.id}
                    className={`menu-member ${selected === member.id ? "active" : ""}`}
                    onClick={() => {
                      setSelected(member.id);
                      setOpen(false);
                    }}
                  >
                    <span className="menu-member-avatar">{initials(member.name)}</span>
                    <span>{member.name}</span>
                    {member.is_decision_maker ? <small>beslisser</small> : null}
                  </button>
                ))}
              </div>
            </section>

            <nav className="menu-links" aria-label="Secundaire navigatie">
              <Link href="/items?filter=my_work" onClick={() => setOpen(false)}>👤 Mijn open items <span>›</span></Link>
              <Link href="/decide" onClick={() => setOpen(false)}>⚠️ Beslissingen nodig <span>›</span></Link>
              {roomId ? <Link href={`/batch-add?room=${roomId}`} onClick={() => setOpen(false)}>📸 Batch foto’s toevoegen <span>›</span></Link> : null}
              <Link href="/items?filter=sell" onClick={() => setOpen(false)}>💰 Te verkopen <span>›</span></Link>
              <Link href="/items?filter=clearance" onClick={() => setOpen(false)}>🚚 Voor opruimer <span>›</span></Link>
              <Link href="/items?filter=removed" onClick={() => setOpen(false)}>✅ Verwijderd <span>›</span></Link>
            </nav>
          </aside>
        </div>
      ) : null}
    </>
  );
}

export function IdentityButton() {
  const [open, setOpen] = useState(false);
  const { members, selected, setSelected } = useMember();
  const active = members.find((member) => member.id === selected);

  return (
    <div className="identity-switcher">
      <button type="button" className="identity-button" onClick={() => setOpen((value) => !value)}>
        <span className="menu-avatar small">{initials(active?.name || "?")}</span>
        <span>Stem als <strong>{active?.name || "…"}</strong></span>
        <span>⌄</span>
      </button>
      {open ? (
        <div className="identity-popover">
          {members.map((member) => (
            <button
              key={member.id}
              className={selected === member.id ? "active" : ""}
              onClick={() => {
                setSelected(member.id);
                setOpen(false);
              }}
            >
              {member.name}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
