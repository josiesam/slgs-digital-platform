import { ContentDetail, EmptyState, SectionHeader } from "./content-components";
import type { PublicContentItem } from "@slgs/public-content";

export function InformationalPage({
  item,
  title,
  introduction,
}: {
  readonly item: PublicContentItem | null;
  readonly title: string;
  readonly introduction: string;
}) {
  return (
    <div className="page-container">
      {item ? (
        <ContentDetail item={item} />
      ) : (
        <>
          <SectionHeader
            eyebrow="School information"
            title={title}
            introduction={introduction}
          />
          <EmptyState>
            This page has not yet been configured in the CMS.
          </EmptyState>
        </>
      )}
    </div>
  );
}
