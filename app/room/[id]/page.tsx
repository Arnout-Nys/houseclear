"use client";

import Link from "next/link";
import {
  use,
  useEffect,
  useState
} from "react";

import { api } from "@/lib/api";
import { Nav } from "@/components/Nav";
import { ItemCard } from "@/components/ItemCard";
import { useMember } from "@/components/MemberPicker";

import type {
  Item
} from "@/lib/types";

export default function RoomPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const [items, setItems] =
    useState<Item[]>([]);

  const {
    members,
    selected
  } = useMember();

  async function load() {
    setItems(
      await api<Item[]>(
        `/api/items?room_id=${id}`
      )
    );
  }

  useEffect(() => {
    load().catch(() => {});
  }, [id]);

  const room =
    items[0]?.rooms;

  return (
    <main className="shell stack">

      <div className="topbar">

        <div>

          <Link
            className="subtle"
            href="/"
          >
            ← All rooms
          </Link>

          <h1 className="title">
            {room?.name || "Room"}
          </h1>

          <div className="subtle">
            {items.length} items
          </div>

        </div>

        <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            justifyContent: "flex-end"
          }}
        >
          <Link
            className="btn"
            href={`/batch-add?room=${id}`}
          >
            📸 Batch add
          </Link>

          <Link
            className="btn primary"
            href={`/add?room=${id}`}
          >
            + Add
          </Link>
        </div>

      </div>

      {items.length === 0 ? (

        <div className="card empty">

          Nothing photographed here yet.

          <br />
          <br />

          <div
            style={{
              display: "flex",
              gap: 8,
              justifyContent: "center",
              flexWrap: "wrap"
            }}
          >
            <Link
              className="btn"
              href={`/batch-add?room=${id}`}
            >
              📸 Batch add
            </Link>

            <Link
              className="btn primary"
              href={`/add?room=${id}`}
            >
              + Add one item
            </Link>
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
            />

          ))}

        </section>

      )}

      <Nav />

    </main>
  );
}
