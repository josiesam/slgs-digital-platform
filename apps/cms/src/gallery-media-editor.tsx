import { useState, type FormEvent } from "react";

import type { CmsMediaOption } from "./content-editor";

export function GalleryMediaEditor({
  contentId,
  contentType,
  initialMediaIds,
  media,
  pending,
  onSave,
}: {
  readonly contentId: string;
  readonly contentType?:
    "page" | "article" | "event" | "announcement" | "gallery";
  readonly initialMediaIds: readonly string[];
  readonly media: readonly CmsMediaOption[];
  readonly pending: boolean;
  readonly onSave: (mediaIds: readonly string[]) => void;
}) {
  const available = media.filter((item) => item.status === "available");
  const [mediaIds, setMediaIds] = useState<string[]>(
    initialMediaIds.filter((id) => available.some((item) => item.id === id)),
  );
  const [candidate, setCandidate] = useState("");
  const move = (index: number, offset: -1 | 1) => {
    const destination = index + offset;
    if (destination < 0 || destination >= mediaIds.length) return;
    const next = [...mediaIds];
    [next[index], next[destination]] = [next[destination]!, next[index]!];
    setMediaIds(next);
  };
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSave(mediaIds);
  };

  return (
    <form className="cms-gallery-editor" onSubmit={submit}>
      <h4>
        {contentType === "gallery" ? "Gallery composition" : "Content media"}
      </h4>
      <p>
        The first asset is used as featured media
        {contentType === "gallery"
          ? "; remaining assets retain gallery order"
          : ""}
        .
      </p>
      <ol aria-label="Ordered gallery media">
        {mediaIds.map((id, index) => {
          const asset = available.find((item) => item.id === id);
          if (!asset) return null;
          return (
            <li key={id}>
              <span>{asset.filename}</span>
              <button
                disabled={pending || index === 0}
                onClick={() => move(index, -1)}
                type="button"
              >
                Move up
              </button>
              <button
                disabled={pending || index === mediaIds.length - 1}
                onClick={() => move(index, 1)}
                type="button"
              >
                Move down
              </button>
              <button
                className="secondary"
                disabled={pending}
                onClick={() =>
                  setMediaIds((current) =>
                    current.filter((value) => value !== id),
                  )
                }
                type="button"
              >
                Remove
              </button>
            </li>
          );
        })}
      </ol>
      <label htmlFor={`gallery-media-${contentId}`}>Add available media</label>
      <select
        id={`gallery-media-${contentId}`}
        value={candidate}
        onChange={(event) => setCandidate(event.currentTarget.value)}
      >
        <option value="">Select media</option>
        {available
          .filter((item) => !mediaIds.includes(item.id))
          .map((item) => (
            <option key={item.id} value={item.id}>
              {item.filename}
            </option>
          ))}
      </select>
      <button
        disabled={pending || !candidate}
        onClick={() => {
          setMediaIds((current) => [...current, candidate]);
          setCandidate("");
        }}
        type="button"
      >
        Add media
      </button>
      <button disabled={pending} type="submit">
        Save gallery composition
      </button>
    </form>
  );
}
