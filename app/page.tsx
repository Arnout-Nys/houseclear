"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Nav } from "@/components/Nav";
import { MemberPicker, useMember } from "@/components/MemberPicker";
import type { Room } from "@/lib/types";

const tiles = [
  { key: "conflicts", label: "conflicts", filter: "conflicts" },
  { key: "undecided", label: "undecided", filter: "undecided" },
  { key: "sell", label: "to sell", filter: "sell" },
  { key: "clearance", label: "clearance", filter: "clearance" },
  { key: "donate", label: "donate", filter: "donate" },
  { key: "unclaimed", label: "unclaimed", filter: "unclaimed" },
  { key: "allocated", label: "family", filter: "family" },
  { key: "removed", label: "removed", filter: "removed" },
];

export default function Home() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [stats, setStats] = useState<any>(null);

  const {
    members,
    selected,
    setSelected
  } = useMember();

  useEffect(() => {
    api<Room[]>("/api/rooms")
      .then(setRooms)
      .catch(() => {});

    api("/api/dashboard")
      .then(setStats)
      .catch(() => {});
  }, []);

  return (
    <main className="shell stack">
      <div className="topbar">
        <div>
          <div className="brand">
            HouseClear
          </div>

          <div className="subtle">
            Parents’ house
          </div>
        </div>

        {stats && (
          <div className="count">
            {stats.total}
          </div>
        )}
      </div>

      <MemberPicker
        members={members}
        selected={selected}
        setSelected={setSelected}
      />

      {stats && (
        <section className="stats">
          {tiles.map((tile) => (
            <Link
              key={tile.key}
              href={`/items?filter=${tile.filter}`}
              className="card stat"
              style={{
                textDecoration: "none",
                color: "inherit"
              }}
            >
              <strong>
                {stats[tile.key] ?? 0}
              </strong>

              <span className="subtle">
                {tile.label}
              </span>
            </Link>
          ))}
        </section>
      )}

      <h2 className="section-title">
        Rooms
      </h2>

      <section className="stack">
        {rooms.map((room) => (
          <Link
            className="card room"
            href={`/room/${room.id}`}
            key={room.id}
          >
            <div>
              <strong>
                {room.name}
              </strong>

              <div className="subtle">
                {room.floor || "House"}
              </div>
            </div>

            <span className="count">
              {room.item_count || 0}
            </span>
          </Link>
        ))}
      </section>

      <Nav />
    </main>
  );
}
