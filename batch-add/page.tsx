"use client";

import Link from "next/link";
import {
  Suspense,
  useMemo,
  useState
} from "react";

import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";

type UploadState =
  | "waiting"
  | "uploading"
  | "done"
  | "error";

type BatchPhoto = {
  id: string;
  file: File;
  preview: string;
  state: UploadState;
  error?: string;
};

async function compressImage(
  file: File,
  maxDimension = 1800,
  quality = 0.8
): Promise<File> {
  const imageUrl =
    URL.createObjectURL(file);

  try {
    const image =
      await new Promise<HTMLImageElement>(
        (resolve, reject) => {
          const img = new Image();

          img.onload = () =>
            resolve(img);

          img.onerror = () =>
            reject(
              new Error(
                "Could not read image"
              )
            );

          img.src = imageUrl;
        }
      );

    let width =
      image.naturalWidth;

    let height =
      image.naturalHeight;

    if (
      width > maxDimension ||
      height > maxDimension
    ) {
      const scale =
        Math.min(
          maxDimension / width,
          maxDimension / height
        );

      width =
        Math.round(
          width * scale
        );

      height =
        Math.round(
          height * scale
        );
    }

    const canvas =
      document.createElement(
        "canvas"
      );

    canvas.width = width;
    canvas.height = height;

    const ctx =
      canvas.getContext("2d");

    if (!ctx) {
      throw new Error(
        "Could not prepare image"
      );
    }

    ctx.drawImage(
      image,
      0,
      0,
      width,
      height
    );

    const blob =
      await new Promise<Blob>(
        (resolve, reject) => {
          canvas.toBlob(
            (result) => {
              if (result) {
                resolve(result);
              } else {
                reject(
                  new Error(
                    "Could not compress image"
                  )
                );
              }
            },
            "image/jpeg",
            quality
          );
        }
      );

    const baseName =
      file.name
        .replace(
          /\.[^.]+$/,
          ""
        )
        .replace(
          /[^a-zA-Z0-9-_]/g,
          "-"
        );

    return new File(
      [blob],
      `${baseName || "photo"}.jpg`,
      {
        type: "image/jpeg"
      }
    );

  } finally {
    URL.revokeObjectURL(
      imageUrl
    );
  }
}

function BatchAddContent() {
  const searchParams =
    useSearchParams();

  const roomId =
    searchParams.get("room") ||
    "";

  const [
    photos,
    setPhotos
  ] =
    useState<BatchPhoto[]>([]);

  const [
    running,
    setRunning
  ] =
    useState(false);

  const completed =
    photos.filter(
      (photo) =>
        photo.state === "done"
    ).length;

  const failed =
    photos.filter(
      (photo) =>
        photo.state === "error"
    ).length;

  const waiting =
    photos.filter(
      (photo) =>
        photo.state ===
          "waiting" ||
        photo.state ===
          "error"
    ).length;

  const totalOriginalSize =
    useMemo(
      () =>
        photos.reduce(
          (
            total,
            photo
          ) =>
            total +
            photo.file.size,
          0
        ),
      [photos]
    );

  function selectFiles(
    files:
      FileList | null
  ) {
    if (!files) {
      return;
    }

    const incoming =
      Array.from(files)
        .filter(
          (file) =>
            file.type.startsWith(
              "image/"
            )
        )
        .map(
          (file) => ({
            id:
              crypto.randomUUID(),
            file,
            preview:
              URL.createObjectURL(
                file
              ),
            state:
              "waiting" as
                UploadState
          })
        );

    setPhotos(
      (current) => [
        ...current,
        ...incoming
      ]
    );
  }

  function removePhoto(
    id: string
  ) {
    setPhotos(
      (current) => {
        const found =
          current.find(
            (photo) =>
              photo.id === id
          );

        if (found) {
          URL.revokeObjectURL(
            found.preview
          );
        }

        return current.filter(
          (photo) =>
            photo.id !== id
        );
      }
    );
  }

  async function uploadOne(
    photo: BatchPhoto,
    index: number
  ) {
    setPhotos(
      (current) =>
        current.map(
          (p) =>
            p.id === photo.id
              ? {
                  ...p,
                  state:
                    "uploading",
                  error:
                    undefined
                }
              : p
        )
    );

    try {
      const compressed =
        await compressImage(
          photo.file
        );

      const form =
        new FormData();

      form.set(
        "file",
        compressed
      );

      const uploaded =
        await api<{
          url: string;
        }>(
          "/api/upload",
          {
            method: "POST",
            body: form
          }
        );

      await api(
        "/api/items",
        {
          method: "POST",

          headers: {
            "content-type":
              "application/json"
          },

          body:
            JSON.stringify({
              room_id:
                roomId,

              title:
                `Untitled item ${
                  index + 1
                }`,

              description:
                null,

              photo_url:
                uploaded.url
            })
        }
      );

      setPhotos(
        (current) =>
          current.map(
            (p) =>
              p.id === photo.id
                ? {
                    ...p,
                    state:
                      "done"
                  }
                : p
          )
      );

    } catch (error: any) {
      setPhotos(
        (current) =>
          current.map(
            (p) =>
              p.id === photo.id
                ? {
                    ...p,
                    state:
                      "error",
                    error:
                      error?.message ||
                      "Upload failed"
                  }
                : p
          )
      );
    }
  }

  async function startUpload() {
    if (
      !roomId ||
      running
    ) {
      return;
    }

    setRunning(true);

    try {
      const candidates =
        photos.filter(
          (photo) =>
            photo.state ===
              "waiting" ||
            photo.state ===
              "error"
        );

      for (
        let i = 0;
        i <
        candidates.length;
        i++
      ) {
        await uploadOne(
          candidates[i],
          i
        );
      }

    } finally {
      setRunning(false);
    }
  }

  if (!roomId) {
    return (
      <main className="shell stack">
        <h1 className="title">
          Batch add
        </h1>

        <div className="card">
          No room selected.
        </div>

        <Link
          className="btn"
          href="/"
        >
          ← Back to rooms
        </Link>
      </main>
    );
  }

  return (
    <main className="shell stack">

      <div className="topbar">

        <div>
          <Link
            className="subtle"
            href={`/room/${roomId}`}
          >
            ← Back to room
          </Link>

          <h1 className="title">
            Batch add
          </h1>

          <div className="subtle">
            One photo becomes
            one item
          </div>
        </div>

      </div>

      <label
        className="btn primary"
        style={{
          textAlign: "center"
        }}
      >
        📸 Select photos

        <input
          hidden
          type="file"
          accept="image/*"
          multiple
          onChange={(event) =>
            selectFiles(
              event.target.files
            )
          }
        />
      </label>

      {photos.length > 0 && (

        <section className="card stack">

          <strong>
            {photos.length} photos
          </strong>

          <div className="subtle">
            Original size:{" "}
            {(
              totalOriginalSize /
              1024 /
              1024
            ).toFixed(1)}{" "}
            MB
          </div>

          <div
            style={{
              display: "flex",
              gap: 8,
              flexWrap: "wrap"
            }}
          >
            <span className="badge">
              ✅ {completed}
            </span>

            <span className="badge">
              ⏳ {waiting}
            </span>

            {failed > 0 && (
              <span className="badge conflict">
                ⚠️ {failed}
              </span>
            )}
          </div>

          <div
            style={{
              height: 8,
              background:
                "rgba(0,0,0,.08)",
              borderRadius: 999,
              overflow: "hidden"
            }}
          >
            <div
              style={{
                width:
                  `${
                    photos.length
                      ? (
                          completed /
                          photos.length
                        ) *
                        100
                      : 0
                  }%`,

                height: "100%",

                background:
                  "currentColor",

                transition:
                  "width .2s"
              }}
            />
          </div>

          <div className="subtle">
            {completed} /{" "}
            {photos.length} uploaded
          </div>

        </section>
      )}

      {photos.length > 0 && (

        <section
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(3, 1fr)",
            gap: 8
          }}
        >

          {photos.map(
            (photo) => (

              <div
                key={photo.id}
                className="card"
                style={{
                  padding: 6,
                  position:
                    "relative"
                }}
              >

                <img
                  src={
                    photo.preview
                  }
                  alt=""
                  style={{
                    width: "100%",
                    aspectRatio:
                      "1 / 1",
                    objectFit:
                      "cover",
                    borderRadius: 8
                  }}
                />

                <div
                  style={{
                    position:
                      "absolute",
                    left: 10,
                    bottom: 10,

                    background:
                      "rgba(255,255,255,.92)",

                    borderRadius: 999,
                    padding:
                      "3px 7px",
                    fontSize: 12
                  }}
                >
                  {photo.state ===
                    "waiting" &&
                    "⏳"}

                  {photo.state ===
                    "uploading" &&
                    "⬆️"}

                  {photo.state ===
                    "done" &&
                    "✅"}

                  {photo.state ===
                    "error" &&
                    "⚠️"}
                </div>

                {!running &&
                  photo.state !==
                    "done" && (

                  <button
                    type="button"
                    onClick={() =>
                      removePhoto(
                        photo.id
                      )
                    }
                    style={{
                      position:
                        "absolute",
                      right: 10,
                      top: 10,

                      border: 0,
                      borderRadius:
                        999,

                      width: 28,
                      height: 28,

                      background:
                        "rgba(255,255,255,.92)"
                    }}
                  >
                    ×
                  </button>

                )}

              </div>

            )
          )}

        </section>
      )}

      {photos.length > 0 &&
        completed <
          photos.length && (

        <button
          className="btn primary"
          disabled={
            running ||
            !waiting
          }
          onClick={
            startUpload
          }
        >
          {running
            ? `Uploading… ${completed}/${photos.length}`
            : failed
              ? `Retry ${waiting} photos`
              : `Upload ${photos.length} items`}
        </button>

      )}

      {photos.length > 0 &&
        completed ===
          photos.length && (

        <section className="card stack">

          <strong>
            ✅ Upload complete
          </strong>

          <div className="subtle">
            {completed} new
            HouseClear items were
            created.
          </div>

          <Link
            className="btn primary"
            href={`/room/${roomId}`}
          >
            View room →
          </Link>

        </section>

      )}

    </main>
  );
}

export default function BatchAddPage() {
  return (
    <Suspense
      fallback={
        <main className="shell">
          Loading…
        </main>
      }
    >
      <BatchAddContent />
    </Suspense>
  );
}

