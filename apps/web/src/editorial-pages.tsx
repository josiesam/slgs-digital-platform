import {
  ContentDetail,
  ContentList,
  SectionHeader,
} from "./content-components";
import type {
  PublicContentItem,
  PublicContentKind,
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
  return (
    <div className="page-container">
      <SectionHeader
        eyebrow="Published content"
        title={title}
        introduction={introduction}
      />
      <ContentList items={items} kind={kind} />
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
) => ({
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
      content: item?.canonicalPath
        ? absolutePublicUrl(item.canonicalPath)
        : undefined,
    },
  ],
  links: [
    {
      rel: "canonical",
      href: item?.canonicalPath
        ? absolutePublicUrl(item.canonicalPath)
        : undefined,
    },
  ],
});
