import { Link } from "@tanstack/react-router";
import type {
  PublicContentItem,
  PublicContentKind,
} from "@slgs/public-content";

export const formatDate = (value: string) =>
  new Intl.DateTimeFormat("en-SL", {
    dateStyle: "long",
    timeZone: "Africa/Freetown",
  }).format(new Date(value));

export function EmptyState({ children }: { readonly children: string }) {
  return (
    <div className="empty-state">
      <p>{children}</p>
    </div>
  );
}

export function ContentList({
  items,
  kind,
}: {
  readonly items: readonly PublicContentItem[];
  readonly kind: PublicContentKind;
}) {
  if (!items.length)
    return <EmptyState>No published content is available yet.</EmptyState>;
  const detailLink = (item: PublicContentItem, label: string) =>
    kind === "article" ? (
      <Link to="/news/$slug" params={{ slug: item.slug }}>
        {label}
      </Link>
    ) : kind === "event" ? (
      <Link to="/events/$slug" params={{ slug: item.slug }}>
        {label}
      </Link>
    ) : kind === "gallery" ? (
      <Link to="/gallery/$slug" params={{ slug: item.slug }}>
        {label}
      </Link>
    ) : (
      <Link to="/announcements/$slug" params={{ slug: item.slug }}>
        {label}
      </Link>
    );
  return (
    <div className="editorial-grid">
      {items.map((item) => (
        <article className="editorial-card" key={item.id}>
          <p className="eyebrow">
            {kind === "event" && item.event
              ? formatDate(item.event.startAt)
              : formatDate(item.publishedAt)}
          </p>
          <h2>{detailLink(item, item.title)}</h2>
          <p>{item.summary ?? "Summary not supplied."}</p>
          <span className="text-link">
            {detailLink(item, `Read ${kind === "article" ? "article" : kind}`)}
          </span>
        </article>
      ))}
    </div>
  );
}

export function ContentDetail({ item }: { readonly item: PublicContentItem }) {
  return (
    <article className="content-detail">
      <header>
        <p className="eyebrow">Published {formatDate(item.publishedAt)}</p>
        <h1>{item.title}</h1>
        {item.summary ? <p className="lead">{item.summary}</p> : null}
      </header>
      {item.event ? (
        <dl className="event-facts">
          <div>
            <dt>Date</dt>
            <dd>{formatDate(item.event.startAt)}</dd>
          </div>
          {item.event.location ? (
            <div>
              <dt>Location</dt>
              <dd>{item.event.location}</dd>
            </div>
          ) : null}
        </dl>
      ) : null}
      <div className="prose">
        {item.body.split(/\n{2,}/).map((paragraph, index) => (
          <p key={index}>{paragraph}</p>
        ))}
      </div>
      {item.kind === "gallery" && item.media.length === 0 ? (
        <EmptyState>
          Published gallery images will appear when the approved public media
          delivery boundary is configured.
        </EmptyState>
      ) : null}
    </article>
  );
}

export function SectionHeader({
  eyebrow,
  title,
  introduction,
  level = 1,
}: {
  readonly eyebrow: string;
  readonly title: string;
  readonly introduction: string;
  readonly level?: 1 | 2;
}) {
  return (
    <header className="section-hero">
      <p className="eyebrow">{eyebrow}</p>
      {level === 1 ? <h1>{title}</h1> : <h2>{title}</h2>}
      <p>{introduction}</p>
    </header>
  );
}
