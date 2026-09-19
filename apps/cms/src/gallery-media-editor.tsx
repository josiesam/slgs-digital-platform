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
    <form className="cms-gallery-editor space-y-4 p-4 rounded-xl border border-border bg-card/70" onSubmit={submit}>
      <div className="border-b border-border pb-3">
        <h4 className="text-sm font-serif font-bold text-foreground flex items-center justify-between">
          <span>{contentType === "gallery" ? "Gallery Composition & Photo Order" : "Content Media Assets"}</span>
          <span className="text-xs font-mono font-normal text-muted-foreground">
            {mediaIds.length} {mediaIds.length === 1 ? "asset" : "assets"}
          </span>
        </h4>
        <p className="text-xs text-muted-foreground mt-1">
          The first media asset in the list serves as the featured cover image. Remaining assets retain ordered gallery sequence.
        </p>
      </div>

      <ol aria-label="Ordered gallery media" className="space-y-2">
        {mediaIds.map((id, index) => {
          const asset = available.find((item) => item.id === id);
          if (!asset) return null;
          return (
            <li
              key={id}
              className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-background shadow-sm hover:border-[#42245f]/30 transition-all text-xs"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground border">
                  #{index + 1}
                </span>
                <span className="font-medium text-foreground truncate" title={asset.filename}>
                  {asset.filename}
                </span>
                {index === 0 && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#42245f]/10 text-[#42245f] border border-[#42245f]/20">
                    ⭐ Featured Cover
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  disabled={pending || index === 0}
                  onClick={() => move(index, -1)}
                  type="button"
                  className="px-2 py-1 rounded border border-border bg-background hover:bg-accent text-[11px] font-medium disabled:opacity-40 transition-colors"
                  title="Move item up in gallery sequence"
                >
                  ↑ Up
                </button>
                <button
                  disabled={pending || index === mediaIds.length - 1}
                  onClick={() => move(index, 1)}
                  type="button"
                  className="px-2 py-1 rounded border border-border bg-background hover:bg-accent text-[11px] font-medium disabled:opacity-40 transition-colors"
                  title="Move item down in gallery sequence"
                >
                  ↓ Down
                </button>
                <button
                  disabled={pending}
                  onClick={() =>
                    setMediaIds((current) =>
                      current.filter((value) => value !== id),
                    )
                  }
                  type="button"
                  className="px-2 py-1 rounded border border-border bg-background hover:bg-destructive/10 text-destructive text-[11px] font-medium transition-colors"
                  title="Remove from gallery"
                >
                  ✕ Remove
                </button>
              </div>
            </li>
          );
        })}
      </ol>

      <div className="pt-3 border-t border-border space-y-2">
        <label htmlFor={`gallery-media-${contentId}`} className="block text-xs font-semibold text-foreground">
          Attach Additional Media Asset
        </label>
        <div className="flex items-center gap-2">
          <select
            id={`gallery-media-${contentId}`}
            value={candidate}
            onChange={(event) => setCandidate(event.currentTarget.value)}
            className="flex-1 p-2 border rounded-md bg-background text-xs"
          >
            <option value="">Select available image asset...</option>
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
            className="px-3 py-2 rounded-md bg-secondary hover:bg-secondary/80 text-secondary-foreground text-xs font-semibold disabled:opacity-50 transition-colors"
          >
            + Add to Gallery
          </button>
        </div>
      </div>

      <div className="pt-2 flex justify-end">
        <button
          disabled={pending}
          type="submit"
          className="px-4 py-2 rounded-md bg-[#42245f] hover:bg-[#542f7f] text-white text-xs font-semibold shadow-sm transition-colors"
        >
          {pending ? "Saving Composition..." : "Save Gallery Composition"}
        </button>
      </div>
    </form>
  );
}
