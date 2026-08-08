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

const labels: Record<string, string> = {
  conflicts: "Conflicts",
  undecided: "Undecided",
  sell: "To sell",
  clearance: "Clearance",
  donate: "Donate",
  unclaimed: "Unclaimed",
  family: "Family",
  removed: "Removed",
  all: "All items"
};

const destinationLabel:
Record<string, string> = {
  family: "👪 Family",
  sell: "💰 Sell",
  donate: "🎁 Donate",
  clearance: "🚚 Clearance",
  recycle: "♻️ Recycle",
  trash: "🗑️ Trash"
};

function ItemsContent() {
  const sp = useSearchParams();

  const filter =
    sp.get("filter") || "all";

  const [items, setItems] =
    useState<any[]>([]);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    setLoading(true);

    api<any[]>("/api/items")
      .then(setItems)
      .finally(() =>
        setLoading(false)
      );
  }, []);

  const filtered = useMemo(() => {
    return items.filter((item) => {

      const wants =
        (item.votes || [])
          .filter(
            (v: any) =>
              v.level === "want"
          )
          .length;

      switch (filter) {

        case "conflicts":
          return wants > 1;

        case "undecided":
          return (
            !item.destination ||
            item.destination ===
              "undecided"
          );

        case "sell":
        case "clearance":
        case "donate":
          return (
            item.destination === filter
          );

        case "unclaimed":
          return wants === 0;

        case "family":
          return (
            item.destination ===
            "family"
          );

        case "removed":
          return (
            item.status === "removed"
          );

        default:
          return true;
      }
    });

  }, [items, filter]);

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

          {filtered.map((item) => {

            const wanters =
              (item.votes || [])
                .filter(
                  (v: any) =>
                    v.level === "want"
                )
                .map(
                  (v: any) =>
                    v.members?.name
                )
                .filter(Boolean);

            const photo =
              item.item_photos?.[0]
                ?.url ||
              item.photo_url;

            return (

              <Link
                className="card item-row"
                href={`/item/${item.id}`}
                key={item.id}
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

                  <div
                    className="subtle"
                    style={{
                      marginTop: 4
                    }}
                  >
                    {item.rooms?.floor
                      ? `${item.rooms.floor} — `
                      : ""}

                    {item.rooms?.name ||
                      "Unknown room"}
                  </div>

                  <div
                    className="badges"
                    style={{
                      marginTop: 8
                    }}
                  >

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

                    {wanters.length > 0 && (
                      <span
                        className={
                          wanters.length > 1
                            ? "badge conflict"
                            : "badge"
                        }
                      >
                        {wanters.length > 1
                          ? "⚠️ "
                          : "❤️ "}

                        {wanters.join(", ")}
                      </span>
                    )}

                  </div>

                </div>

              </Link>
            );
          })}

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
