"use client";

import Link from "next/link";
import { useState } from "react";
import { api } from "@/lib/api";
import type {
  Item,
  Member,
  VoteLevel
} from "@/lib/types";

const destinationLabel: Record<string, string> = {
  family: "👪 Family",
  sell: "💰 Sell",
  donate: "🎁 Donate",
  clearance: "🚚 Clearance",
  recycle: "♻️ Recycle",
  trash: "🗑️ Trash"
};

export function ItemCard({
  item,
  members,
  selected,
  onChanged
}: {
  item: Item;
  members: Member[];
  selected: string;
  onChanged?: () => void | Promise<void>;
}) {
  const [busy, setBusy] = useState(false);

  const votes = item.votes || [];

  const counts = {
    want: votes.filter(
      (vote) => vote.level === "want"
    ).length,

    maybe: votes.filter(
      (vote) => vote.level === "maybe"
    ).length,

    no: votes.filter(
      (vote) => vote.level === "no"
    ).length
  };

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

  const wanters =
    votes
      .filter(
        (vote) =>
          vote.level === "want"
      )
      .map(
        (vote) =>
          vote.members?.name
      )
      .filter(Boolean);

  const myVote =
    votes.find(
      (vote) =>
        vote.member_id === selected
    )?.level;

  const photo =
    item.item_photos?.[0]?.url ||
    item.photo_url;

  async function vote(
    level: VoteLevel
  ) {
    if (!selected || busy) return;

    setBusy(true);

    try {
      await api("/api/votes", {
        method: "POST",

        headers: {
          "content-type":
            "application/json"
        },

        body: JSON.stringify({
          item_id: item.id,
          member_id: selected,
          level
        })
      });

      await onChanged?.();

    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="card"
      style={{
        display: "grid",
        gap: 10
      }}
    >
      <Link
        href={`/item/${item.id}`}
        style={{
          textDecoration: "none",
          color: "inherit",
          display: "grid",
          gridTemplateColumns:
            "72px 1fr",
          gap: 12,
          alignItems: "center"
        }}
      >
        {photo ? (
          <img
            className="thumb"
            src={photo}
            alt=""
          />
        ) : (
          <div className="thumb" />
        )}

        <div
          style={{
            minWidth: 0
          }}
        >
          <strong>
            {item.title}
          </strong>

          {item.rooms && (
            <div
              className="subtle"
              style={{
                marginTop: 3
              }}
            >
              {item.rooms.floor
                ? `${item.rooms.floor} — `
                : ""}

              {item.rooms.name}
            </div>
          )}

          <div
            className="badges"
            style={{
              marginTop: 7
            }}
          >
            <span className="badge">
              ❤️ {counts.want}
            </span>

            <span className="badge">
              🙂 {counts.maybe}
            </span>

            <span className="badge">
              🚫 {counts.no}
            </span>

            <span className="badge">
              👤 {decisionVoted}/
              {decisionMakers.length || 3}
            </span>

            {item.status ===
              "removed" && (
              <span className="badge">
                ✅ Removed
              </span>
            )}

            {item.destination && (
              <span className="badge">
                {
                  destinationLabel[
                    item.destination
                  ] ||
                  item.destination
                }
              </span>
            )}
          </div>

          {wanters.length > 1 && (
            <div
              className="badge conflict"
              style={{
                marginTop: 7
              }}
            >
              ⚠️ {wanters.join(", ")}
            </div>
          )}
        </div>
      </Link>

      <div
        className="grid2"
        style={{
          gridTemplateColumns:
            "repeat(3,1fr)"
        }}
      >
        <button
          className={`btn ${
            myVote === "want"
              ? "active"
              : ""
          }`}
          disabled={
            busy || !selected
          }
          onClick={() =>
            vote("want")
          }
        >
          ❤️
        </button>

        <button
          className={`btn ${
            myVote === "maybe"
              ? "active"
              : ""
          }`}
          disabled={
            busy || !selected
          }
          onClick={() =>
            vote("maybe")
          }
        >
          🙂
        </button>

        <button
          className={`btn ${
            myVote === "no"
              ? "active"
              : ""
          }`}
          disabled={
            busy || !selected
          }
          onClick={() =>
            vote("no")
          }
        >
          🚫
        </button>
      </div>
    </div>
  );
}
