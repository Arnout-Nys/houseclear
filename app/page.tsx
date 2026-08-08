"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useState
} from "react";

import { api } from "@/lib/api";
import { Nav } from "@/components/Nav";
import {
  MemberPicker,
  useMember
} from "@/components/MemberPicker";

import type {
  Item,
  Room
} from "@/lib/types";

const tiles = [
  {
    key: "needs_review",
    label: "needs review",
    filter: "needs_review"
  },
  {
    key: "ready",
    label: "ready to decide",
    filter: "ready"
  },
  {
    key: "conflicts",
    label: "conflicts",
    filter: "conflicts"
  },
  {
    key: "unclaimed",
    label: "unclaimed",
    filter: "unclaimed"
  },
  {
    key: "allocated",
    label: "family",
    filter: "family"
  },
  {
    key: "sell",
    label: "to sell",
    filter: "sell"
  },
  {
    key: "clearance",
    label: "clearance",
    filter: "clearance"
  },
  {
    key: "removed",
    label: "removed",
    filter: "removed"
  }
];

export default function Home() {
  const [rooms, setRooms] =
    useState<Room[]>([]);

  const [stats, setStats] =
    useState<any>(null);

  const [items, setItems] =
    useState<Item[]>([]);

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

    api<Item[]>("/api/items")
      .then(setItems)
      .catch(() => {});
  }, []);

  const myWork = useMemo(() => {
    const me =
      members.find(
        (member) =>
          member.id === selected
      );

    if (!me) {
      return 0;
    }

    return items.filter((item) => {
      const votes =
        item.votes || [];

      const myVote =
        votes.find(
          (vote) =>
            vote.member_id ===
            selected
        )?.level;

      const wants =
        votes.filter(
          (vote) =>
            vote.level === "want"
        ).length;

      const assignedToMe =
        item.assigned_member_id ===
        selected;

      if (
        me.is_decision_maker
      ) {
        return (
          !myVote ||
          (
            myVote === "want" &&
            wants > 1
          ) ||
          (
            assignedToMe &&
            item.status !==
              "removed"
          )
        );
      }

      return (
        myVote === "want" ||
        myVote === "maybe" ||
        (
          assignedToMe &&
          item.status !==
            "removed"
        )
      );
    }).length;

  }, [
    items,
    members,
    selected
  ]);

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

      <Link
        href="/items?filter=my_work"
        className="card"
        style={{
          textDecoration: "none",
          color: "inherit",
          display: "flex",
          justifyContent:
            "space-between",
          alignItems: "center"
        }}
      >

        <div>

          <strong>
            My work
          </strong>

          <div className="subtle">
            Items that need your attention
          </div>

        </div>

        <span className="count">
          {myWork}
        </span>

      </Link>

      {stats && (
        <section className="stats">

          {tiles.map((tile) => (

            <Link
              key={tile.key}
              href={
                `/items?filter=${tile.filter}`
              }
              className="card stat"
              style={{
                textDecoration: "none",
                color: "inherit"
              }}
            >

              <strong>
                {
                  stats[
                    tile.key
                  ] ?? 0
                }
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
