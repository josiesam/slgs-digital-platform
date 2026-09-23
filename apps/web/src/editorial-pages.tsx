import { useState, useMemo } from "react";
import {
  ContentDetail,
  ContentList,
  SectionHeader,
  SearchIcon,
} from "./content-components";
import {
  defaultCanonicalPath,
  type PublicContentItem,
  type PublicContentKind,
} from "@slgs/public-content";
import { absolutePublicUrl } from "./public-origin";

export function EditorialListing({
  items,
  kind,
  title,
  introduction,
}: {
  readonly items: readonly PublicContentItem[];
  readonly kind: PublicContentKind;
  readonly title: string;
  readonly introduction: string;
}) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items;
    const q = searchQuery.toLowerCase().trim();
    return items.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        (item.summary && item.summary.toLowerCase().includes(q)) ||
        (item.event?.location && item.event.location.toLowerCase().includes(q)),
    );
  }, [items, searchQuery]);

  const categoryLabel =
    kind === "article"
      ? "stories"
      : kind === "event"
        ? "events"
        : kind === "gallery"
          ? "galleries"
          : "announcements";

  return (
    <div className="page-container space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-[var(--slgs-border)]">
        <SectionHeader
          eyebrow="Published content"
          title={title}
          introduction={introduction}
        />

        {items.length > 0 && (
          <div className="w-full md:w-72 shrink-0">
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-[var(--slgs-muted)] pointer-events-none">
                <SearchIcon className="w-4 h-4" />
              </span>
              <input
                type="text"
                placeholder={`Search ${categoryLabel}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-[var(--slgs-border)] bg-white text-[var(--slgs-ink)] placeholder-[var(--slgs-muted)] focus:outline-none focus:border-[var(--slgs-purple)] focus:ring-1 focus:ring-[var(--slgs-purple)] transition-all"
              />
            </div>
          </div>
        )}
      </div>

      {items.length > 0 && searchQuery && (
        <div className="text-xs text-[var(--slgs-muted)] font-medium">
          Showing {filteredItems.length} of {items.length} {categoryLabel}
        </div>
      )}

      <ContentList items={filteredItems} kind={kind} />
    </div>
  );
}

export function EditorialDetail({
  item,
}: {
  readonly item: PublicContentItem;
}) {
  return (
    <div className="page-container">
      <ContentDetail item={item} />
    </div>
  );
}

export const detailHead = (
  item: PublicContentItem | undefined,
  fallback: string,
) => {
  const canonicalPath = item
    ? (item.canonicalPath ?? defaultCanonicalPath(item.kind, item.slug))
    : undefined;
  return {
    meta: [
      {
        title: `${item?.seoTitle ?? item?.title ?? fallback} | Sierra Leone Grammar School`,
      },
      {
        name: "description",
        content:
          item?.seoDescription ??
          item?.summary ??
          `Published ${fallback.toLowerCase()} from Sierra Leone Grammar School.`,
      },
      {
        property: "og:title",
        content: item?.seoTitle ?? item?.title ?? fallback,
      },
      {
        property: "og:description",
        content:
          item?.seoDescription ??
          item?.summary ??
          "Published by Sierra Leone Grammar School.",
      },
      {
        property: "og:type",
        content: item?.kind === "article" ? "article" : "website",
      },
      {
        property: "og:url",
        content: canonicalPath ? absolutePublicUrl(canonicalPath) : undefined,
      },
    ],
    links: [
      {
        rel: "canonical",
        href: canonicalPath ? absolutePublicUrl(canonicalPath) : undefined,
      },
    ],
  };
};
