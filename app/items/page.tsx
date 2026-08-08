"use client";

import Link from "next/link";
import {
  Suspense,
  useEffect,
  useMemo,
  useState
} from "react";

import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { Nav } from "@/components/Nav";
import { ItemCard } from "@/components/ItemCard";
import { useMember } from "@/components/MemberPicker";

import type { Item } from "@/lib/types";

const labels: Record<string, string> = {
  needs_review: "Needs review",
  ready: "Ready to decide",
  conflicts: "Conflicts",
  unclaimed: "Unclaimed",
  family: "Family",
  sell: "To sell",
  clearance: "Clearance",
  removed: "Removed",
  my_work: "My work",
  all: "All items"
};

function ItemsContent() {
  const sp = useSearchParams();

  const filter =
    sp.get("filter") || "all";

  const [items, setItems] =
    useState<Item[]>([]);

  const [loading, setLoading] =
    useState(true);

  const {
    members,
    selected
  } = useMember();

  async function load() {
    setLoading(true);

    try {
      setItems(
        await api<Item[]>(
          "/api/items"
        )
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load().catch(() => {});
  }, []);

  const filtered = useMemo(() => {
    const decisionMakers =
      members.filter(
        (member) =>
          member.is_decision_maker
      );

    const decisionIds =
      new Set(
        decisionMakers.map(
          (member) => member.id
        )
      );

    const selectedMember =
      members.find(
        (member) =>
          member.id === selected
      );

    return items.filter((item) => {
      const votes =
        item.votes || [];

      const wants =
        votes.filter(
          (vote) =>
            vote.level === "want"
        );

      const decisionVoted =
        new Set(
          votes
            .filter(
              (vote) =>
                decisionIds.has(
                  vote.member_id
                )
            )
            .map(
              (vote) =>
                vote.member_id
            )
        ).size;

      const unresolved =
        !item.destination ||
        item.destination ===
          "undecided";

      const myVote =
        votes.find(
          (vote) =>
            vote.member_id ===
            selected
        )?.level;

      const assignedToMe =
        item.assigned_member_id ===
        selected;

      switch (filter) {

        case "needs_review":
          return (
            unresolved &&
            decisionVoted <
              decisionMakers.length
          );

        case "ready":
          return (
            unresolved &&
            decisionMakers.length > 0 &&
            decisionVoted ===
              decisionMakers.length
          );

        case "conflicts":
          return wants.length > 1;

        case "unclaimed":
          return wants.length === 0;

        case "family":
          return (
            item.destination ===
            "family"
          );

        case "sell":
          return (
            item.destination ===
            "sell"
          );

        case "clearance":
          return (
            item.destination ===
            "clearance"
          );

        case "removed":
          return (
            item.status ===
            "removed"
          );

        case "my_work":

          if (!selected) {
            return false;
          }

          if (
            selectedMember
              ?.is_decision_maker
          ) {
            return (
              !myVote ||
              (
                myVote === "want" &&
                wants.length > 1
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

        default:
          return true;
      }
    });

  }, [
    items,
    filter,
    members,
    selected
  ]);

  if (loading) {
    return (
      <main className="shell">
        Loading…
      </main>
    );
  }

  return (
    <main className="shell stack">

      <div className="topbar">

        <div>

          <Link
            className="subtle"
            href="/"
          >
            ← Dashboard
          </Link>

          <h1 className="title">
            {labels[filter] ||
              "Items"}
          </h1>

          <div className="subtle">
            {filtered.length} items
          </div>

        </div>

      </div>

      {filtered.length === 0 ? (

        <div className="card empty">
          No items in this category.
        </div>

      ) : (

        <section className="stack">

          {filtered.map((item) => (

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

export default function ItemsPage() {
  return (
    <Suspense
      fallback={
        <main className="shell">
          <p className="subtle">
            Loading…
          </p>
        </main>
      }
    >
      <ItemsContent />
    </Suspense>
  );
}
