export type CmsContentState =
  "draft" | "submitted" | "in_review" | "rejected" | "approved" | "published";

export type PublicSiteContentType = "page" | "article" | "event" | "gallery";

export interface PublicSiteSection {
  readonly key:
    | "about"
    | "admissions"
    | "academics"
    | "life"
    | "parents"
    | "news"
    | "events"
    | "gallery"
    | "contact";
  readonly label: string;
  readonly path: string;
  readonly type: PublicSiteContentType;
  readonly fixedSlug?: string;
  readonly draftTitle?: string;
  readonly description: string;
}

export const PUBLIC_SITE_SECTIONS: readonly PublicSiteSection[] = [
  {
    key: "about",
    label: "About",
    path: "/about",
    type: "page",
    fixedSlug: "about",
    draftTitle: "About SLGS",
    description: "School overview, history, identity and leadership.",
  },
  {
    key: "admissions",
    label: "Admissions",
    path: "/admissions",
    type: "page",
    fixedSlug: "admissions",
    draftTitle: "Admissions",
    description: "Approved application guidance, requirements and dates.",
  },
  {
    key: "academics",
    label: "Academics",
    path: "/academics",
    type: "page",
    fixedSlug: "academics",
    draftTitle: "Academics",
    description: "Public programmes, departments and learning information.",
  },
  {
    key: "life",
    label: "School life",
    path: "/life",
    type: "page",
    fixedSlug: "life",
    draftTitle: "School life",
    description: "Clubs, activities, sport, STEM and school community life.",
  },
  {
    key: "parents",
    label: "Parents",
    path: "/parents",
    type: "page",
    fixedSlug: "parents",
    draftTitle: "Parents",
    description: "Approved public guidance and resources for parents.",
  },
  {
    key: "news",
    label: "News",
    path: "/news",
    type: "article",
    description: "Published school stories and announcements.",
  },
  {
    key: "events",
    label: "Events",
    path: "/events",
    type: "event",
    description: "Upcoming and recent public school events.",
  },
  {
    key: "gallery",
    label: "Gallery",
    path: "/gallery",
    type: "gallery",
    description: "Moderated collections of approved school media.",
  },
  {
    key: "contact",
    label: "Contact",
    path: "/contact",
    type: "page",
    fixedSlug: "contact",
    draftTitle: "Contact SLGS",
    description: "Approved address, telephone, email and enquiry guidance.",
  },
] as const;

export interface ReadinessContent {
  readonly id: string;
  readonly type: string;
  readonly slug: string;
  readonly state: CmsContentState;
}

export interface SectionReadiness {
  readonly section: PublicSiteSection;
  readonly status: "not_started" | "in_progress" | "published";
  readonly statusLabel: string;
  readonly matchingContent: readonly ReadinessContent[];
  readonly publishedCount: number;
}

export function assessPublicSiteReadiness(
  content: readonly ReadinessContent[],
): readonly SectionReadiness[] {
  return PUBLIC_SITE_SECTIONS.map((section) => {
    const matchingContent = content.filter((item) =>
      section.fixedSlug
        ? item.type === section.type && item.slug === section.fixedSlug
        : item.type === section.type,
    );
    const publishedCount = matchingContent.filter(
      (item) => item.state === "published",
    ).length;
    const status = publishedCount
      ? "published"
      : matchingContent.length
        ? "in_progress"
        : "not_started";
    const statusLabel =
      status === "published"
        ? section.fixedSlug
          ? "Published"
          : `${publishedCount} published`
        : status === "in_progress"
          ? section.fixedSlug
            ? matchingContent[0]!.state.replace("_", " ")
            : `${matchingContent.length} in workflow`
          : "Not configured";
    return {
      section,
      status,
      statusLabel,
      matchingContent,
      publishedCount,
    };
  });
}

export function PublicSiteReadiness({
  content,
  creatableTypes,
  onConfigure,
}: {
  readonly content: readonly ReadinessContent[];
  readonly creatableTypes: ReadonlySet<string>;
  readonly onConfigure: (section: PublicSiteSection) => void;
}) {
  const readiness = assessPublicSiteReadiness(content);
  const live = readiness.filter((item) => item.status === "published").length;

  return (
    <section aria-labelledby="public-site-readiness">
      <div className="cms-section-heading">
        <div>
          <p className="cms-kicker">Public website</p>
          <h2 id="public-site-readiness">Page configuration readiness</h2>
          <p>
            Track the nine primary public sections. Only approved, published
            content crosses the public read boundary.
          </p>
        </div>
        <span className="cms-count">{live} of 9 live</span>
      </div>
      <div className="cms-site-grid">
        {readiness.map(({ section, status, statusLabel, matchingContent }) => {
          const firstMatch = matchingContent[0];
          const canCreate = creatableTypes.has(section.type);
          return (
            <article className="cms-site-card" key={section.key}>
              <div className="cms-content-meta">
                <span>{section.path}</span>
                <span className={`cms-readiness cms-readiness--${status}`}>
                  {statusLabel}
                </span>
              </div>
              <h3>{section.label}</h3>
              <p>{section.description}</p>
              {firstMatch ? (
                <a className="cms-text-link" href={`#content-${firstMatch.id}`}>
                  View workflow item
                </a>
              ) : canCreate ? (
                <button
                  className="secondary"
                  onClick={() => onConfigure(section)}
                  type="button"
                >
                  {section.fixedSlug
                    ? "Configure page"
                    : `Create ${section.label.toLowerCase()} item`}
                </button>
              ) : (
                <small>Requires an assigned {section.type} author role.</small>
              )}
            </article>
          );
        })}
      </div>
      <p className="cms-site-note">
        “Live” means at least one authorized item is published. Official school
        facts must be supplied and approved by the school; this workspace does
        not generate them.
      </p>
    </section>
  );
}
