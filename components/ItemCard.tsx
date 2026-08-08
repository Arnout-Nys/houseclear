"use client";

import Link from "next/link";
import {
  useMemo,
  useState
} from "react";

import { api } from "@/lib/api";

import type {
  Item,
  Member,
  VoteLevel
} from "@/lib/types";

const destinationLabel:
Record<string, string> = {
  family: "👪 Family",
  sell: "💰 Sell",
  donate: "🎁 Donate",
  clearance: "🚚 Clearance",
  recycle: "♻️ Recycle",
  trash: "🗑️ Trash"
};

type PopoverType =
  | "want"
  | "maybe"
  | "no"
  | "decision"
  | null;

export function ItemCard({
  item,
  members,
  selected,
  onChanged
}: {
  item: Item;
  members: Member[];
  selected: string;
  onChanged?: () =>
    void | Promise<void>;
}) {
  const [busy, setBusy] =
    useState(false);

  const [
    openPopover,
    setOpenPopover
  ] =
    useState<PopoverType>(null);

  const votes =
    item.votes || [];

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

  const grouped = useMemo(() => {
    const result = {
      want: [] as string[],
      maybe: [] as string[],
      no: [] as string[]
    };

    for (const vote of votes) {
      const name =
        vote.members?.name;

      if (!name) continue;

      if (
        vote.level === "want"
      ) {
        result.want.push(name);
      }

      if (
        vote.level === "maybe"
      ) {
        result.maybe.push(name);
      }

      if (
        vote.level === "no"
      ) {
        result.no.push(name);
      }
    }

    return result;
  }, [votes]);

  const decisionStatus =
    useMemo(() => {
      return decisionMakers.map(
        (member) => {
          const vote =
            votes.find(
              (v) =>
                v.member_id ===
                member.id
            );

          return {
            name: member.name,
            voted: Boolean(vote),
            level:
              vote?.level || null
          };
        }
      );
    }, [
      decisionMakers,
      votes
    ]);

  const decisionVoted =
    decisionStatus.filter(
      (x) => x.voted
    ).length;

  const wanters =
    grouped.want;

  const myVote =
    votes.find(
      (vote) =>
        vote.member_id ===
        selected
    )?.level;

  const photo =
    item.item_photos?.[0]?.url ||
    item.photo_url;

  async function vote(
    level: VoteLevel
  ) {
    if (!selected || busy) {
      return;
    }

    setBusy(true);

    try {
      await api(
        "/api/votes",
        {
          method: "POST",

          headers: {
            "content-type":
              "application/json"
          },

          body:
            JSON.stringify({
              item_id:
                item.id,

              member_id:
                selected,

              level
            })
        }
      );

      await onChanged?.();

    } finally {
      setBusy(false);
    }
  }

  function togglePopover(
    type: PopoverType
  ) {
    setOpenPopover(
      openPopover === type
        ? null
        : type
    );
  }

  const counterStyle = {
    cursor: "pointer",
    userSelect:
      "none" as const,
    position:
      "relative" as const
  };

  const popoverStyle = {
    position:
      "absolute" as const,

    zIndex: 30,

    top: "calc(100% + 6px)",
    left: 0,

    minWidth: 170,
    maxWidth: 240,

    padding: 10,

    background:
      "var(--card, white)",

    border:
      "1px solid rgba(0,0,0,.12)",

    borderRadius: 10,

    boxShadow:
      "0 8px 25px rgba(0,0,0,.18)",

    fontSize: 14,

    lineHeight: 1.45
  };

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
          textDecoration:
            "none",

          color:
            "inherit",

          display:
            "grid",

          gridTemplateColumns:
            "72px 1fr",

          gap: 12,

          alignItems:
            "center"
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
              marginTop: 7,
              position:
                "relative"
            }}
          >

            <span
              className="badge"
              style={
                counterStyle
              }
              title={
                grouped.want.length
                  ? grouped.want.join(
                      ", "
                    )
                  : "Nobody"
              }
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();

                togglePopover(
                  "want"
                );
              }}
            >
              ❤️ {
                grouped.want.length
              }

              {openPopover ===
                "want" && (
                <div
                  style={
                    popoverStyle
                  }
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                >
                  <strong>
                    ❤️ Want
                  </strong>

                  <div
                    style={{
                      marginTop: 6
                    }}
                  >
                    {grouped.want
                      .length ? (
                      grouped.want.map(
                        (name) => (
                          <div
                            key={
                              name
                            }
                          >
                            {name}
                          </div>
                        )
                      )
                    ) : (
                      <div className="subtle">
                        Nobody
                      </div>
                    )}
                  </div>
                </div>
              )}
            </span>

            <span
              className="badge"
              style={
                counterStyle
              }
              title={
                grouped.maybe.length
                  ? grouped.maybe.join(
                      ", "
                    )
                  : "Nobody"
              }
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();

                togglePopover(
                  "maybe"
                );
              }}
            >
              🙂 {
                grouped.maybe.length
              }

              {openPopover ===
                "maybe" && (
                <div
                  style={
                    popoverStyle
                  }
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                >
                  <strong>
                    🙂 Maybe
                  </strong>

                  <div
                    style={{
                      marginTop: 6
                    }}
                  >
                    {grouped.maybe
                      .length ? (
                      grouped.maybe.map(
                        (name) => (
                          <div
                            key={
                              name
                            }
                          >
                            {name}
                          </div>
                        )
                      )
                    ) : (
                      <div className="subtle">
                        Nobody
                      </div>
                    )}
                  </div>
                </div>
              )}
            </span>

            <span
              className="badge"
              style={
                counterStyle
              }
              title={
                grouped.no.length
                  ? grouped.no.join(
                      ", "
                    )
                  : "Nobody"
              }
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();

                togglePopover(
                  "no"
                );
              }}
            >
              🚫 {
                grouped.no.length
              }

              {openPopover ===
                "no" && (
                <div
                  style={
                    popoverStyle
                  }
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                >
                  <strong>
                    🚫 No interest
                  </strong>

                  <div
                    style={{
                      marginTop: 6
                    }}
                  >
                    {grouped.no
                      .length ? (
                      grouped.no.map(
                        (name) => (
                          <div
                            key={
                              name
                            }
                          >
                            {name}
                          </div>
                        )
                      )
                    ) : (
                      <div className="subtle">
                        Nobody
                      </div>
                    )}
                  </div>
                </div>
              )}
            </span>

            <span
              className="badge"
              style={
                counterStyle
              }
              title={
                decisionStatus
                  .map(
                    (x) =>
                      `${
                        x.voted
                          ? "✓"
                          : "Waiting:"
                      } ${
                        x.name
                      }`
                  )
                  .join("\n")
              }
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();

                togglePopover(
                  "decision"
                );
              }}
            >
              👤 {
                decisionVoted
              }/
              {
                decisionMakers.length ||
                3
              }

              {openPopover ===
                "decision" && (
                <div
                  style={
                    popoverStyle
                  }
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                >
                  <strong>
                    Decision makers
                  </strong>

                  <div
                    style={{
                      marginTop: 6
                    }}
                  >
                    {decisionStatus.map(
                      (person) => (
                        <div
                          key={
                            person.name
                          }
                        >
                          {person.voted
                            ? "✅"
                            : "⏳"}{" "}
                          {
                            person.name
                          }

                          {person.level ===
                            "want" &&
                            " — ❤️"}

                          {person.level ===
                            "maybe" &&
                            " — 🙂"}

                          {person.level ===
                            "no" &&
                            " — 🚫"}
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}
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
              ⚠️ {
                wanters.join(
                  ", "
                )
              }
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
            busy ||
            !selected
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
            busy ||
            !selected
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
            busy ||
            !selected
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
