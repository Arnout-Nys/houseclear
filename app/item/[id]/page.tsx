"use client";

import Link from "next/link";
import { use, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { MemberPicker, useMember } from "@/components/MemberPicker";
import { Nav } from "@/components/Nav";
import type { Destination, Item, VoteLevel } from "@/lib/types";

const destinations: Array<{ value: Destination | "undecided"; label: string }> = [
  { value: "family", label: "👪 Familie" },
  { value: "sell", label: "💰 Verkopen" },
  { value: "donate", label: "🎁 Weggeven" },
  { value: "clearance", label: "🚚 Opruimer" },
  { value: "recycle", label: "♻️ Recyclage" },
  { value: "trash", label: "🗑️ Afval" },
  { value: "undecided", label: "❓ Later beslissen" }
];

const voteMeta: Record<VoteLevel, { icon: string; label: string }> = {
  want: { icon: "❤️", label: "Wil ik" },
  maybe: { icon: "🙂", label: "Misschien" },
  no: { icon: "🚫", label: "Geen interesse" }
};

export default function ItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [item, setItem] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingDescription, setEditingDescription] = useState(false);
  const [siblings, setSiblings] = useState<Item[]>([]);
  const [activePhoto, setActivePhoto] = useState(0);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const { members, selected, setSelected } = useMember();

  async function load() {
    const x: any = await api(`/api/items/${id}`);
    setItem(x);
    setTitle(x.title || "");
    setDescription(x.description || "");
    setActivePhoto(0);

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
    if (!selected || busy) return;
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

  async function patch(body: any, reload = true) {
    setBusy(true);
    try {
      await api(`/api/items/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body)
      });
      if (reload) await load();
    } finally {
      setBusy(false);
    }
  }

  async function saveText() {
    await patch({
      title: title.trim() || "Naamloos voorwerp",
      description: description.trim() || null
    });
    setEditingTitle(false);
    setEditingDescription(false);
  }

  async function saveAndNext() {
    if (busy) return;
    const titleChanged = title.trim() !== (item.title || "").trim();
    const descriptionChanged = description.trim() !== (item.description || "").trim();

    if (titleChanged || descriptionChanged) {
      await patch(
        {
          title: title.trim() || "Naamloos voorwerp",
          description: description.trim() || null
        },
        false
      );
    }

    if (next) router.push(`/item/${next.id}`);
    else router.push(`/room/${item.room_id}`);
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
    if (!confirm(`Verwijder “${item.title}”? Dit kan niet ongedaan worden gemaakt.`)) return;
    setBusy(true);
    const result: any = await api(`/api/items/${id}`, { method: "DELETE" });
    router.push(`/room/${result.room_id || item.room_id}`);
    router.refresh();
  }

  if (!item) return <main className="shell">Laden…</main>;

  const votes = item.votes || [];
  const myVote = votes.find((v: any) => v.member_id === selected)?.level;
  const wants = votes.filter((v: any) => v.level === "want");
  const decisionMakers = members.filter((m) => m.is_decision_maker);
  const decisionMakerVotes = decisionMakers.filter((m) => votes.some((v: any) => v.member_id === m.id));
  const assignedMember = members.find((m) => m.id === item.assigned_member_id);

  const groupedVotes = useMemo(() => {
    const result: Record<VoteLevel, any[]> = { want: [], maybe: [], no: [] };
    for (const v of votes) {
      if (v.level && result[v.level as VoteLevel]) result[v.level as VoteLevel].push(v);
    }
    return result;
  }, [votes]);

  const photos = (item.item_photos || [])
    .slice()
    .sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0));
  if (!photos.length && item.photo_url) photos.push({ id: "legacy", url: item.photo_url });

  const currentIndex = siblings.findIndex((s) => s.id === id);
  const previous = currentIndex > 0 ? siblings[currentIndex - 1] : null;
  const next = currentIndex >= 0 && currentIndex < siblings.length - 1 ? siblings[currentIndex + 1] : null;

  let statusTone = "neutral";
  let statusTitle = "Nog te beslissen";
  let statusText = "Kies wat er met dit voorwerp moet gebeuren.";

  if (item.status === "removed") {
    statusTone = "done";
    statusTitle = "Fysiek verwijderd";
    statusText = "Dit voorwerp is niet meer in de woning.";
  } else if (item.destination === "family" && assignedMember) {
    statusTone = "done";
    statusTitle = `Beslist: voor ${assignedMember.name}`;
    statusText = "Het voorwerp is toegewezen en wacht op ophaling of verwijdering.";
  } else if (item.destination) {
    statusTone = "done";
    const destination = destinations.find((d) => d.value === item.destination);
    statusTitle = `Beslist: ${destination?.label || item.destination}`;
    statusText = "De bestemming is gekozen; markeer het later als fysiek verwijderd.";
  } else if (wants.length > 1) {
    statusTone = "warning";
    statusTitle = "Beslissing nodig";
    statusText = `${wants.map((v: any) => v.members?.name).filter(Boolean).join(" en ")} willen dit voorwerp.`;
  } else if (decisionMakers.length && decisionMakerVotes.length < decisionMakers.length) {
    statusTitle = "Nog niet iedereen heeft gereageerd";
    statusText = `${decisionMakerVotes.length}/${decisionMakers.length} hoofd-beslissers hebben gestemd.`;
  }

  function movePhoto(direction: number) {
    if (!photos.length) return;
    setActivePhoto((current) => (current + direction + photos.length) % photos.length);
  }

  function finishSwipe(endX: number) {
    if (touchStart === null) return;
    const delta = endX - touchStart;
    if (Math.abs(delta) > 45) movePhoto(delta < 0 ? 1 : -1);
    setTouchStart(null);
  }

  async function chooseDestination(value: Destination | "undecided") {
    if (value === "undecided") {
      await patch({ destination: null, assigned_member_id: null, status: "undecided" });
      return;
    }

    await patch({
      destination: value,
      assigned_member_id: value === "family" ? item.assigned_member_id || null : null,
      status: item.status === "removed" ? "removed" : "decided"
    });
  }

  async function toggleRemoved() {
    if (item.status !== "removed") {
      const ok = confirm("Markeer dit voorwerp als fysiek verwijderd uit de woning?");
      if (!ok) return;
    }
    await patch({ status: item.status === "removed" ? (item.destination ? "decided" : "undecided") : "removed" });
  }

  return (
    <main className="shell stack item-workbench">
      <header className="sticky-head workbench-head">
        <div className="workbench-head-row">
          <Link className="back-link" href={`/room/${item.room_id}`}>← {item.rooms?.name || "Kamer"}</Link>
          <span className="subtle">{currentIndex >= 0 ? `${currentIndex + 1} / ${siblings.length}` : ""}</span>
        </div>
      </header>

      {photos.length > 0 ? (
        <section className="hero-gallery">
          <button
            type="button"
            className="hero-photo-button"
            onClick={() => setViewerOpen(true)}
            onTouchStart={(e) => setTouchStart(e.touches[0].clientX)}
            onTouchEnd={(e) => finishSwipe(e.changedTouches[0].clientX)}
            aria-label="Foto op volledig scherm bekijken"
          >
            <img className="hero-photo" src={photos[activePhoto]?.url} alt={item.title} />
          </button>

          {photos.length > 1 ? (
            <>
              <button type="button" className="gallery-arrow left" onClick={() => movePhoto(-1)} aria-label="Vorige foto">‹</button>
              <button type="button" className="gallery-arrow right" onClick={() => movePhoto(1)} aria-label="Volgende foto">›</button>
              <div className="gallery-meta">
                <div className="gallery-dots">
                  {photos.map((p: any, index: number) => (
                    <button
                      key={p.id}
                      type="button"
                      className={index === activePhoto ? "gallery-dot active" : "gallery-dot"}
                      onClick={() => setActivePhoto(index)}
                      aria-label={`Foto ${index + 1}`}
                    />
                  ))}
                </div>
                <span>{activePhoto + 1}/{photos.length}</span>
              </div>
            </>
          ) : (
            <div className="gallery-meta"><span>Tik om te vergroten</span></div>
          )}
        </section>
      ) : null}

      <section className="item-identity card">
        {editingTitle ? (
          <div className="inline-edit-row">
            <input className="inline-title-input" autoFocus value={title} onChange={(e) => setTitle(e.target.value)} />
            <button className="mini-action" disabled={busy} onClick={saveText}>✓</button>
            <button className="mini-action" onClick={() => { setTitle(item.title || ""); setEditingTitle(false); }}>×</button>
          </div>
        ) : (
          <button type="button" className="editable-title" onClick={() => setEditingTitle(true)}>
            <span>{item.title}</span><span>✎</span>
          </button>
        )}

        {editingDescription ? (
          <div className="inline-description-edit">
            <textarea autoFocus rows={4} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Voeg een korte omschrijving toe…" />
            <div className="inline-edit-actions">
              <button className="btn primary" disabled={busy} onClick={saveText}>Opslaan</button>
              <button className="btn" onClick={() => { setDescription(item.description || ""); setEditingDescription(false); }}>Annuleren</button>
            </div>
          </div>
        ) : (
          <button type="button" className="editable-description" onClick={() => setEditingDescription(true)}>
            <span>{item.description || "Voeg een omschrijving toe"}</span><span>✎</span>
          </button>
        )}
      </section>

      <section className={`decision-banner ${statusTone}`}>
        <strong>{statusTone === "warning" ? "⚠️" : statusTone === "done" ? "✅" : "ℹ️"} {statusTitle}</strong>
        <span>{statusText}</span>
      </section>

      <section className="card stack vote-section">
        <div>
          <strong>Wat wil jij hiermee?</strong>
          <div className="subtle" style={{ marginTop: 3 }}>Stem als:</div>
        </div>
        <MemberPicker members={members} selected={selected} setSelected={setSelected} />

        <div className="vote-buttons">
          {(Object.keys(voteMeta) as VoteLevel[]).map((level) => (
            <button
              key={level}
              disabled={busy || !selected}
              className={`vote-button ${myVote === level ? "active" : ""}`}
              onClick={() => vote(level)}
            >
              <span className="vote-icon">{voteMeta[level].icon}</span>
              <span>{voteMeta[level].label}</span>
            </button>
          ))}
        </div>

        {votes.length ? (
          <div className="people-votes">
            {(Object.keys(voteMeta) as VoteLevel[]).map((level) =>
              groupedVotes[level].map((v: any) => (
                <span key={`${level}-${v.member_id}`} className={`person-chip ${level}`} title={v.members?.name || ""}>
                  {voteMeta[level].icon} {v.members?.name || "?"}
                </span>
              ))
            )}
          </div>
        ) : <div className="subtle">Nog niemand heeft gestemd.</div>}

        {decisionMakers.length ? (
          <div className="decision-makers-box">
            <div className="decision-makers-title">
              <strong>Hoofd-beslissers</strong>
              <span>{decisionMakerVotes.length}/{decisionMakers.length}</span>
            </div>
            <div className="people-votes">
              {decisionMakers.map((m) => {
                const v = votes.find((vote: any) => vote.member_id === m.id);
                return (
                  <span key={m.id} className="person-chip decision">
                    {v ? "✅" : "⏳"} {m.name}{v ? ` ${voteMeta[v.level as VoteLevel]?.icon || ""}` : ""}
                  </span>
                );
              })}
            </div>
          </div>
        ) : null}
      </section>

      <section className="card stack destination-section">
        <div>
          <strong>Bestemming</strong>
          <div className="subtle" style={{ marginTop: 3 }}>Kies wat er uiteindelijk met dit voorwerp gebeurt.</div>
        </div>

        <div className="destination-grid">
          {destinations.map((destination) => {
            const active = destination.value === "undecided" ? !item.destination : item.destination === destination.value;
            return (
              <button
                key={destination.value}
                type="button"
                disabled={busy}
                className={`destination-chip ${active ? "active" : ""}`}
                onClick={() => chooseDestination(destination.value)}
              >
                {destination.label}
              </button>
            );
          })}
        </div>

        {item.destination === "family" ? (
          <div className="family-assignment">
            <strong>Voor wie?</strong>
            <div className="family-chip-grid">
              {members.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  disabled={busy}
                  className={`family-chip ${item.assigned_member_id === m.id ? "active" : ""}`}
                  onClick={() => patch({ assigned_member_id: m.id, status: "decided" })}
                >
                  {m.name}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </section>

      <section className="card stack physical-section">
        <div>
          <strong>Fysieke status</strong>
          <div className="subtle" style={{ marginTop: 3 }}>Dit staat los van de gekozen bestemming.</div>
        </div>
        <button
          className={`physical-toggle ${item.status === "removed" ? "removed" : "present"}`}
          disabled={busy}
          onClick={toggleRemoved}
        >
          {item.status === "removed" ? "✅ Meegenomen / verwijderd" : "📦 Nog in de woning"}
        </button>
      </section>

      <details className="card management-details">
        <summary>Details & beheer</summary>
        <div className="management-content stack">
          <div className="subtle">
            Kamer: <strong>{item.rooms?.name || "Onbekend"}</strong>
            {item.rooms?.floor ? ` · ${item.rooms.floor}` : ""}
          </div>
          {item.created_at ? <div className="subtle">Toegevoegd: {new Date(item.created_at).toLocaleDateString("nl-BE")}</div> : null}

          <label className="btn" style={{ textAlign: "center" }}>
            📷 Nog een foto toevoegen
            <input hidden type="file" accept="image/*" capture="environment" onChange={(e) => addPhoto(e.target.files?.[0] || null)} />
          </label>

          <button className="btn danger" disabled={busy} onClick={remove}>🗑️ Item verwijderen</button>
        </div>
      </details>

      <div className="workbench-pager">
        {previous ? <Link className="pager-side" href={`/item/${previous.id}`}>← Vorige</Link> : <span />}
        <button className="save-next" disabled={busy} onClick={saveAndNext}>
          {next ? "Opslaan & volgende →" : "Opslaan & terug →"}
        </button>
      </div>

      {viewerOpen && photos[activePhoto] ? (
        <div className="photo-viewer" role="dialog" aria-modal="true" onClick={() => setViewerOpen(false)}>
          <button className="viewer-close" onClick={() => setViewerOpen(false)} aria-label="Sluiten">×</button>
          <img src={photos[activePhoto].url} alt={item.title} onClick={(e) => e.stopPropagation()} />
          {photos.length > 1 ? (
            <div className="viewer-controls" onClick={(e) => e.stopPropagation()}>
              <button onClick={() => movePhoto(-1)}>←</button>
              <span>{activePhoto + 1} / {photos.length}</span>
              <button onClick={() => movePhoto(1)}>→</button>
            </div>
          ) : null}
        </div>
      ) : null}

      <Nav />
    </main>
  );
}
