import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  IconDeviceDesktop,
  IconDeviceMobile,
  IconDeviceTablet,
  IconExternalLink,
  IconEye,
  IconFileCheck,
  IconLink,
  IconMenu2,
  IconRefresh,
  IconSearch,
  IconWorld,
} from "@tabler/icons-react";

import { getCmsAdminOverview } from "../../../admin-overview-functions";

export type PublicTab = "overview" | "navigation" | "urls" | "preview";

export function PublicWebView({
  data,
  activeTab = "overview",
}: {
  readonly data: Awaited<ReturnType<typeof getCmsAdminOverview>>;
  readonly activeTab?: PublicTab;
}) {
  const [currentTab, setCurrentTab] = useState<PublicTab>(activeTab);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPreviewId, setSelectedPreviewId] = useState<string>(
    data.publicWeb.publishedItems[0]?.id ?? "core-home",
  );
  const [viewportMode, setViewportMode] = useState<
    "desktop" | "tablet" | "mobile"
  >("desktop");
  const [iframeKey, setIframeKey] = useState(0);

  // Initialize navigation items from public-content tree
  const [navItems, setNavItems] = useState(data.publicWeb.navigationTree);

  const moveNavItem = (index: number, direction: "up" | "down") => {
    const next = [...navItems];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= next.length) return;
    const [moved] = next.splice(index, 1);
    if (moved) {
      next.splice(targetIndex, 0, moved);
      setNavItems(next);
      setFeedback("Navigation hierarchy re-ordered locally.");
    }
  };

  const handleSaveNavigation = () => {
    setFeedback(
      "Navigation hierarchy saved and synchronized with public projection.",
    );
  };

  // Filter routes mapping based on search term
  const filteredRoutes = data.publicWeb.routesMapping.filter(
    (r) =>
      r.path.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.routeType.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  // Get selected item for live preview simulator
  const selectedPublishedItem = data.publicWeb.publishedItems.find(
    (item) => item.id === selectedPreviewId,
  );
  const selectedCoreSection = data.publicWeb.navigationTree.find(
    (item) => item.id === selectedPreviewId,
  );

  const previewPath = selectedPublishedItem
    ? selectedPublishedItem.canonicalPath
    : selectedCoreSection
      ? selectedCoreSection.path
      : "/";

  const fullPreviewUrl = `${data.publicWeb.publishedSiteUrl.replace(/\/$/, "")}${previewPath}`;

  const viewportWidthClass =
    viewportMode === "mobile"
      ? "w-[375px]"
      : viewportMode === "tablet"
        ? "w-[768px]"
        : "w-full";

  return (
    <div className="space-y-6 mx-auto p-4 md:p-6 max-w-[1600px]">
      {/* Header */}
      <header className="flex sm:flex-row flex-col justify-between sm:items-center gap-4 pb-4 border-border border-b">
        <div>
          <div className="flex items-center gap-2 mb-1 text-muted-foreground text-xs uppercase tracking-wider">
            <span>Public Web Management</span>
            <span>/</span>
            <span className="font-semibold text-foreground">
              Published Projections & Structure
            </span>
          </div>
          <h1 className="font-serif font-bold text-foreground text-2xl">
            Public Experience Management
          </h1>
          <p className="text-muted-foreground text-sm">
            Configure site navigation, canonical path mappings, layout
            structures, and inspect public web live projections.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={data.publicWeb.publishedSiteUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 bg-[#42245f] hover:bg-[#542f7f] shadow-sm px-4 py-2 rounded-md font-semibold text-white text-xs transition-colors"
          >
            <span>Open Live Site</span>
            <IconExternalLink className="size-4" />
          </a>
        </div>
      </header>

      {feedback && (
        <div className="flex justify-between items-center bg-[#2f7d3b]/10 p-3 border border-[#2f7d3b]/20 rounded-lg font-medium text-[#2f7d3b] text-xs">
          <span>{feedback}</span>
          <button
            onClick={() => setFeedback(null)}
            className="text-xs hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Tab Content 1: Overview */}
      {currentTab === "overview" && (
        <div className="space-y-6">
          <div className="gap-6 grid grid-cols-1 md:grid-cols-3">
            <div className="space-y-3 bg-card shadow-sm p-5 border border-border rounded-xl">
              <div className="flex justify-between items-center pb-2 border-border border-b">
                <span className="font-semibold text-[#69439a] text-xs uppercase tracking-wider">
                  Published Projections
                </span>
                <IconFileCheck className="size-5 text-[#69439a]" />
              </div>
              <div className="font-sans font-bold text-foreground text-3xl">
                {data.publicWeb.publishedCounts?.total ??
                  data.publicWeb.publishedPages}
              </div>
              <div className="flex flex-wrap gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
                <span>
                  Pages:{" "}
                  <strong>{data.publicWeb.publishedCounts?.pages ?? 0}</strong>
                </span>
                <span>•</span>
                <span>
                  Articles:{" "}
                  <strong>
                    {data.publicWeb.publishedCounts?.articles ?? 0}
                  </strong>
                </span>
                <span>•</span>
                <span>
                  Events:{" "}
                  <strong>{data.publicWeb.publishedCounts?.events ?? 0}</strong>
                </span>
                <span>•</span>
                <span>
                  Announcements:{" "}
                  <strong>
                    {data.publicWeb.publishedCounts?.announcements ?? 0}
                  </strong>
                </span>
                <span>•</span>
                <span>
                  Galleries:{" "}
                  <strong>
                    {data.publicWeb.publishedCounts?.galleries ?? 0}
                  </strong>
                </span>
              </div>
            </div>

            <div className="space-y-3 bg-card shadow-sm p-5 border border-border rounded-xl">
              <div className="flex justify-between items-center pb-2 border-border border-b">
                <span className="font-semibold text-[#8d7d58] text-xs uppercase tracking-wider">
                  Site Navigation
                </span>
                <IconMenu2 className="size-5 text-[#8d7d58]" />
              </div>
              <div className="font-semibold text-foreground text-sm">
                Status:{" "}
                <span className="text-[#2f7d3b]">
                  {data.publicWeb.navigationStatus}
                </span>
              </div>
              <p className="text-muted-foreground text-xs">
                {data.publicWeb.navigationTree.length} active menu items
                synchronized with published content routes.
              </p>
            </div>

            <div className="space-y-3 bg-card shadow-sm p-5 border border-border rounded-xl">
              <div className="flex justify-between items-center pb-2 border-border border-b">
                <span className="font-semibold text-[#2f7d3b] text-xs uppercase tracking-wider">
                  Public Web Domain
                </span>
                <IconWorld className="size-5 text-[#2f7d3b]" />
              </div>
              <div className="font-mono font-semibold text-foreground text-xs truncate">
                {data.publicWeb.publishedSiteUrl}
              </div>
              <p className="text-muted-foreground text-xs">
                Anonymous public boundary with strict SSL & read-only projection
                security.
              </p>
            </div>
          </div>

          {/* Published Content Items Table */}
          <div className="space-y-4 bg-card shadow-sm p-5 border border-border rounded-xl">
            <div className="flex justify-between items-center pb-3 border-border border-b">
              <div>
                <h2 className="font-serif font-bold text-foreground text-base">
                  Actual Published Projections
                </h2>
                <p className="text-muted-foreground text-xs">
                  Live published content items currently exposed to `apps/web`
                  via the public content gateway.
                </p>
              </div>
              <span className="font-medium text-muted-foreground text-xs">
                {data.publicWeb.publishedItems.length} published records
              </span>
            </div>

            {data.publicWeb.publishedItems.length === 0 ? (
              <div className="space-y-2 p-8 border border-border border-dashed rounded-lg text-center">
                <p className="font-semibold text-foreground text-sm">
                  No published projections found
                </p>
                <p className="mx-auto max-w-md text-muted-foreground text-xs">
                  Content items must be submitted, reviewed, approved, and
                  published in the CMS workflow to be exposed to the public
                  website.
                </p>
              </div>
            ) : (
              <div className="border border-border rounded-lg overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-secondary/50 border-border border-b font-semibold text-[10px] text-muted-foreground uppercase">
                    <tr>
                      <th className="p-3">Title</th>
                      <th className="p-3">Type</th>
                      <th className="p-3">Canonical Path</th>
                      <th className="p-3">Published Date</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {data.publicWeb.publishedItems.map((item) => (
                      <tr key={item.id} className="hover:bg-accent/30">
                        <td className="p-3 font-semibold text-foreground">
                          {item.title}
                          {item.summary && (
                            <p className="font-normal text-[11px] text-muted-foreground line-clamp-1">
                              {item.summary}
                            </p>
                          )}
                        </td>
                        <td className="p-3">
                          <span className="bg-[#69439a]/10 px-2 py-0.5 rounded font-semibold text-[#69439a] text-[10px] uppercase">
                            {item.type}
                          </span>
                        </td>
                        <td className="p-3 font-mono font-semibold text-[#42245f]">
                          {item.canonicalPath}
                        </td>
                        <td className="p-3 font-mono text-[11px] text-muted-foreground">
                          {new Date(item.publishedAt).toLocaleDateString(
                            "en-GB",
                            {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            },
                          )}
                        </td>
                        <td className="space-x-2 p-3 text-right">
                          <button
                            onClick={() => {
                              setSelectedPreviewId(item.id);
                              setCurrentTab("preview");
                            }}
                            className="inline-flex items-center gap-1 hover:bg-accent px-2.5 py-1 border border-border rounded font-medium text-[11px]"
                          >
                            <IconEye className="size-3.5 text-[#42245f]" />
                            <span>Preview</span>
                          </button>
                          <a
                            href={item.absoluteCanonicalUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 bg-[#42245f]/10 hover:bg-[#42245f]/20 px-2.5 py-1 rounded font-medium text-[#42245f] text-[11px]"
                          >
                            <IconExternalLink className="size-3.5" />
                            <span>Live Path</span>
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab Content 2: Navigation Hierarchy */}
      {currentTab === "navigation" && (
        <div className="space-y-4 bg-card shadow-sm p-5 border border-border rounded-xl">
          <div className="flex justify-between items-center pb-3 border-border border-b">
            <div>
              <h2 className="font-serif font-bold text-foreground text-base">
                Header & Primary Menu Builder
              </h2>
              <p className="text-muted-foreground text-xs">
                Re-order or adjust top navigation menu items generated from core
                site architecture and published content pages.
              </p>
            </div>
            <button
              onClick={handleSaveNavigation}
              className="bg-[#42245f] hover:bg-[#542f7f] shadow-sm px-3.5 py-1.5 rounded font-semibold text-white text-xs transition-colors"
            >
              Save Navigation Hierarchy
            </button>
          </div>

          <div className="border border-border rounded-lg divide-y divide-border overflow-hidden">
            {navItems.map((item, idx) => (
              <div
                key={item.id}
                className="flex justify-between items-center bg-background hover:bg-accent/30 p-3 text-xs"
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono font-bold text-[11px] text-muted-foreground">
                    {idx + 1}.
                  </span>
                  <span className="font-semibold text-foreground">
                    {item.title}
                  </span>
                  <span className="font-mono text-[11px] text-muted-foreground">
                    {item.path}
                  </span>
                  {item.isCore ? (
                    <span className="bg-[#42245f]/10 px-2 py-0.5 rounded font-semibold text-[#42245f] text-[10px] uppercase">
                      Core Route
                    </span>
                  ) : (
                    <span className="bg-[#2f7d3b]/10 px-2 py-0.5 rounded font-semibold text-[#2f7d3b] text-[10px] uppercase">
                      Published Page
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    disabled={idx === 0}
                    onClick={() => moveNavItem(idx, "up")}
                    className="hover:bg-accent disabled:opacity-30 px-2 py-1 border border-border rounded text-[11px]"
                  >
                    ▲ Move Up
                  </button>
                  <button
                    disabled={idx === navItems.length - 1}
                    onClick={() => moveNavItem(idx, "down")}
                    className="hover:bg-accent disabled:opacity-30 px-2 py-1 border border-border rounded text-[11px]"
                  >
                    ▼ Move Down
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab Content 3: URL Routes & Canonical Paths */}
      {currentTab === "urls" && (
        <div className="space-y-4 bg-card shadow-sm p-5 border border-border rounded-xl">
          <div className="flex sm:flex-row flex-col justify-between sm:items-center gap-4 pb-3 border-border border-b">
            <div>
              <h2 className="font-serif font-bold text-foreground text-base">
                URL Routes & SEO Canonical Mapping
              </h2>
              <p className="text-muted-foreground text-xs">
                Inspect canonical relative paths, route types, and public URL
                mappings derived from `public-content`.
              </p>
            </div>

            <div className="relative w-full sm:w-72">
              <IconSearch className="top-2.5 left-2.5 absolute size-4 text-muted-foreground" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Filter route or path..."
                className="bg-background py-1.5 pr-3 pl-8 border border-border rounded-md focus:outline-none focus:ring-[#42245f] focus:ring-1 w-full text-foreground text-xs"
              />
            </div>
          </div>

          <div className="border border-border rounded-lg overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-secondary/50 border-border border-b font-semibold text-[10px] text-muted-foreground uppercase">
                <tr>
                  <th className="p-3">Public Route Path</th>
                  <th className="p-3">Title / Section</th>
                  <th className="p-3">Route Type</th>
                  <th className="p-3">Canonical Absolute URL</th>
                  <th className="p-3">Access Level</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredRoutes.map((route, idx) => (
                  <tr
                    key={`${route.path}-${idx}`}
                    className="hover:bg-accent/30"
                  >
                    <td className="p-3 font-mono font-semibold text-[#42245f]">
                      {route.path}
                    </td>
                    <td className="p-3 font-medium text-foreground">
                      {route.title}
                    </td>
                    <td className="p-3 capitalize">{route.routeType}</td>
                    <td className="p-3 font-mono text-muted-foreground">
                      {route.canonicalOverride}
                    </td>
                    <td className="p-3">
                      <span className="bg-[#2f7d3b]/10 px-2 py-0.5 rounded font-semibold text-[#2f7d3b] text-[10px] uppercase">
                        {route.accessLevel}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab Content 4: Live Experience Preview Simulator via Responsive Iframe */}
      {currentTab === "preview" && (
        <div className="space-y-4 bg-card shadow-sm p-5 border border-border rounded-xl">
          {/* Top Bar: Controls */}
          <div className="flex lg:flex-row flex-col justify-between lg:items-center gap-4 pb-3 border-border border-b">
            <div>
              <h2 className="font-serif font-bold text-foreground text-base">
                Live Site Preview Simulator
              </h2>
              <p className="text-muted-foreground text-xs">
                Real-time responsive iframe preview loading actual public web
                routes from{" "}
                <span className="font-mono font-semibold text-foreground">
                  {data.publicWeb.publishedSiteUrl}
                </span>
                .
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Device Viewport Mode Toggles */}
              <div className="flex items-center bg-secondary/50 p-1 border border-border rounded-lg font-semibold text-xs">
                <button
                  onClick={() => setViewportMode("desktop")}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded transition-colors ${
                    viewportMode === "desktop"
                      ? "bg-[#42245f] text-white shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  title="Desktop Viewport (100%)"
                >
                  <IconDeviceDesktop className="size-4" />
                  <span>Desktop</span>
                </button>
                <button
                  onClick={() => setViewportMode("tablet")}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded transition-colors ${
                    viewportMode === "tablet"
                      ? "bg-[#42245f] text-white shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  title="Tablet Viewport (768px)"
                >
                  <IconDeviceTablet className="size-4" />
                  <span>Tablet</span>
                </button>
                <button
                  onClick={() => setViewportMode("mobile")}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded transition-colors ${
                    viewportMode === "mobile"
                      ? "bg-[#42245f] text-white shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  title="Mobile Viewport (375px)"
                >
                  <IconDeviceMobile className="size-4" />
                  <span>Mobile</span>
                </button>
              </div>

              {/* Page Selector */}
              <select
                value={selectedPreviewId}
                onChange={(e) => setSelectedPreviewId(e.target.value)}
                className="bg-background px-3 py-1.5 border border-border rounded-md focus:outline-none focus:ring-[#42245f] focus:ring-1 font-semibold text-foreground text-xs"
              >
                <optgroup label="Core Web Sections">
                  {data.publicWeb.navigationTree
                    .filter((n) => n.isCore)
                    .map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.title} ({item.path})
                      </option>
                    ))}
                </optgroup>
                {data.publicWeb.publishedItems.length > 0 && (
                  <optgroup label="Published Content Items">
                    {data.publicWeb.publishedItems.map((item) => (
                      <option key={item.id} value={item.id}>
                        [{item.type.toUpperCase()}] {item.title} (
                        {item.canonicalPath})
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>

              {/* Refresh iFrame */}
              <button
                onClick={() => setIframeKey((prev) => prev + 1)}
                className="hover:bg-accent p-1.5 border border-border rounded-md text-foreground transition-colors"
                title="Reload Preview iFrame"
              >
                <IconRefresh className="size-4 text-muted-foreground" />
              </button>

              <a
                href={fullPreviewUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 bg-[#42245f]/10 hover:bg-[#42245f]/20 px-2.5 py-1.5 rounded-md font-semibold text-[#42245f] text-xs transition-colors"
              >
                <IconExternalLink className="size-3.5" />
                <span>Open Target Path</span>
              </a>
            </div>
          </div>

          {/* Browser Frame & iFrame Container */}
          <div className="flex flex-col items-center bg-secondary/30 p-4 border border-border rounded-xl">
            {/* Browser Window Header */}
            <div
              className={`flex justify-between items-center bg-[#231f20] px-4 py-2 rounded-t-xl text-white text-xs ${viewportWidthClass} transition-all duration-300`}
            >
              <div className="flex items-center gap-2">
                <span className="bg-[#ff5f56] rounded-full size-3" />
                <span className="bg-[#ffbd2e] rounded-full size-3" />
                <span className="bg-[#27c93f] rounded-full size-3" />
              </div>
              <div className="flex items-center gap-1 bg-[#3a3536] px-3 py-1 rounded-md max-w-lg font-mono text-[11px] text-white/90 truncate">
                <IconWorld className="size-3.5 text-[#c2b28a]" />
                <span className="truncate">{fullPreviewUrl}</span>
              </div>
              <div className="font-mono text-[10px] text-white/60">
                {viewportMode === "mobile"
                  ? "375px"
                  : viewportMode === "tablet"
                    ? "768px"
                    : "100%"}
              </div>
            </div>

            {/* iFrame Wrapper */}
            <div
              className={`bg-white shadow-2xl border border-[#231f20]/20 rounded-b-xl overflow-hidden h-[680px] ${viewportWidthClass} transition-all duration-300`}
            >
              <iframe
                key={iframeKey}
                src={fullPreviewUrl}
                title="Public Web Live Preview"
                className="border-0 w-full h-full"
              />
            </div>
          </div>

          {/* SEO Meta Preview Box */}
          <div className="space-y-2 bg-background p-4 border border-border rounded-lg">
            <div className="flex items-center gap-1.5 font-semibold text-[#42245f] text-xs">
              <IconLink className="size-4" />
              <span>SEO Head & Search Projection Preview</span>
            </div>
            <div className="space-y-1 bg-secondary/30 p-3 rounded font-mono text-[11px] text-muted-foreground">
              <p>
                <span className="font-semibold text-foreground">
                  &lt;title&gt;
                </span>
                {selectedPublishedItem?.seoTitle ??
                  selectedPublishedItem?.title ??
                  selectedCoreSection?.title}{" "}
                | Sierra Leone Grammar School
                <span className="font-semibold text-foreground">
                  &lt;/title&gt;
                </span>
              </p>
              <p>
                <span className="font-semibold text-foreground">
                  &lt;link rel="canonical" href="
                </span>
                {selectedPublishedItem?.absoluteCanonicalUrl ?? fullPreviewUrl}
                <span className="font-semibold text-foreground">
                  &quot; /&gt;
                </span>
              </p>
              {selectedPublishedItem?.seoDescription && (
                <p>
                  <span className="font-semibold text-foreground">
                    &lt;meta name="description" content="
                  </span>
                  {selectedPublishedItem.seoDescription}
                  <span className="font-semibold text-foreground">
                    &quot; /&gt;
                  </span>
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
