import type { FormEvent } from "react";

export type EditableCmsContent = {
  readonly id: string;
  readonly type: "page" | "article" | "event" | "announcement" | "gallery";
  readonly title: string;
  readonly slug: string;
  readonly summary: string | null;
  readonly body: string;
  readonly seoTitle: string | null;
  readonly seoDescription: string | null;
  readonly canonicalPath: string | null;
  readonly featuredMediaId: string | null;
  readonly eventStartAt: string | null;
  readonly eventEndAt: string | null;
  readonly eventLocation: string | null;
  readonly eventOrganiser: string | null;
};

export type CmsMediaOption = {
  readonly id: string;
  readonly filename: string;
  readonly status: "pending" | "available" | "rejected" | "failed" | "archived";
};

const localDateTime = (value: string | null) =>
  value ? new Date(value).toISOString().slice(0, 16) : "";

export function DraftEditor({
  content,
  pending,
  onSave,
}: {
  readonly content: EditableCmsContent;
  readonly pending: boolean;
  readonly onSave: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form onSubmit={onSave}>
      <label htmlFor={`title-${content.id}`}>Title</label>
      <input
        id={`title-${content.id}`}
        name="title"
        defaultValue={content.title}
        maxLength={240}
        required
      />
      <label htmlFor={`slug-${content.id}`}>URL slug</label>
      <input
        id={`slug-${content.id}`}
        name="slug"
        defaultValue={content.slug}
        pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
        required
      />
      <label htmlFor={`summary-${content.id}`}>Summary</label>
      <textarea
        id={`summary-${content.id}`}
        name="summary"
        defaultValue={content.summary ?? ""}
        maxLength={600}
        rows={3}
      />
      <label htmlFor={`body-${content.id}`}>Content</label>
      <textarea
        id={`body-${content.id}`}
        name="body"
        defaultValue={content.body}
        rows={10}
      />
      <fieldset>
        <legend>Search and sharing</legend>
        <label htmlFor={`seo-title-${content.id}`}>SEO title</label>
        <input
          id={`seo-title-${content.id}`}
          name="seoTitle"
          defaultValue={content.seoTitle ?? ""}
          maxLength={70}
        />
        <label htmlFor={`seo-description-${content.id}`}>SEO description</label>
        <textarea
          id={`seo-description-${content.id}`}
          name="seoDescription"
          defaultValue={content.seoDescription ?? ""}
          maxLength={170}
          rows={2}
        />
        <label htmlFor={`canonical-path-${content.id}`}>Canonical path</label>
        <input
          id={`canonical-path-${content.id}`}
          name="canonicalPath"
          defaultValue={content.canonicalPath ?? ""}
          placeholder="/news/example"
        />
      </fieldset>
      {content.type === "event" ? (
        <fieldset>
          <legend>Event details</legend>
          <label htmlFor={`event-start-${content.id}`}>Starts</label>
          <input
            id={`event-start-${content.id}`}
            name="eventStartAt"
            type="datetime-local"
            defaultValue={localDateTime(content.eventStartAt)}
            required
          />
          <label htmlFor={`event-end-${content.id}`}>Ends</label>
          <input
            id={`event-end-${content.id}`}
            name="eventEndAt"
            type="datetime-local"
            defaultValue={localDateTime(content.eventEndAt)}
          />
          <label htmlFor={`event-location-${content.id}`}>Location</label>
          <input
            id={`event-location-${content.id}`}
            name="eventLocation"
            defaultValue={content.eventLocation ?? ""}
          />
          <label htmlFor={`event-organiser-${content.id}`}>Organiser</label>
          <input
            id={`event-organiser-${content.id}`}
            name="eventOrganiser"
            defaultValue={content.eventOrganiser ?? ""}
          />
        </fieldset>
      ) : null}
      <button disabled={pending} type="submit">
        Save revision
      </button>
    </form>
  );
}
