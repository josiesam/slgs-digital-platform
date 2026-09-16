import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  IconArrowRight,
  IconCheck,
  IconExternalLink,
  IconEye,
  IconFileCheck,
  IconLink,
  IconListDetails,
  IconMenu2,
  IconNetwork,
  IconRefresh,
  IconRoute,
  IconShieldCheck,
  IconWorld,
} from "@tabler/icons-react";

import { getCmsAdminOverview } from "../../../../admin-overview-functions";

export const Route = createFileRoute(
  "/_authenticated/dashboard/_public/public/",
)({
  loader: () => getCmsAdminOverview(),
  component: PublicWebPage,
});

export function PublicWebPage() {
  const data = Route.useLoaderData();
  return <PublicWebView data={data} activeTab="overview" />;
}

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

  // Mock initial navigation tree
  const [navItems, setNavItems] = useState([
    { id: "1", title: "Home", path: "/", target: "internal" },
    { id: "2", title: "About SLGS", path: "/about", target: "internal" },
    { id: "3", title: "Academics & Curriculum", path: "/academics", target: "internal" },
    { id: "4", title: "Admissions", path: "/admissions", target: "internal" },
    { id: "5", title: "School News", path: "/news", target: "internal" },
    { id: "6", title: "Events & Sports", path: "/events", target: "internal" },
    { id: "7", title: "Contact Us", path: "/contact", target: "internal" },
  ]);

  const moveNavItem = (index: number, direction: "up" | "down") => {
    const next = [...navItems];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= next.length) return;
    const [moved] = next.splice(index, 1);
    if (moved) {
      next.splice(targetIndex, 0, moved);
      setNavItems(next);
      setFeedback("Navigation order updated.");
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider mb-1">
            <span>Public Web Management</span>
            <span>/</span>
            <span className="text-foreground font-semibold">Published Projections & Structure</span>
          </div>
          <h1 className="text-2xl font-serif font-bold text-foreground">Public Experience Management</h1>
          <p className="text-sm text-muted-foreground">
            Configure site navigation, URL mappings, layout structures, and inspect public web live projections.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={data.publicWeb.publishedSiteUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-semibold text-white bg-[#42245f] hover:bg-[#542f7f] transition-colors shadow-sm"
          >
            <span>Open Live Site</span>
            <IconExternalLink className="size-4" />
          </a>
        </div>
      </header>

      {feedback && (
        <div className="p-3 rounded-lg bg-[#2f7d3b]/10 border border-[#2f7d3b]/20 text-[#2f7d3b] text-xs font-medium flex justify-between items-center">
          <span>{feedback}</span>
          <button onClick={() => setFeedback(null)} className="text-xs hover:underline">Dismiss</button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-border space-x-4 text-xs font-semibold">
        <button
          onClick={() => setCurrentTab("overview")}
          className={`pb-2 transition-colors border-b-2 ${
            currentTab === "overview"
              ? "border-[#42245f] text-[#42245f]"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Projections & Web Status
        </button>
        <button
          onClick={() => setCurrentTab("navigation")}
          className={`pb-2 transition-colors border-b-2 ${
            currentTab === "navigation"
              ? "border-[#42245f] text-[#42245f]"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Navigation Hierarchy
        </button>
        <button
          onClick={() => setCurrentTab("urls")}
          className={`pb-2 transition-colors border-b-2 ${
            currentTab === "urls"
              ? "border-[#42245f] text-[#42245f]"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          URL Routes & Canonical Paths
        </button>
        <button
          onClick={() => setCurrentTab("preview")}
          className={`pb-2 transition-colors border-b-2 ${
            currentTab === "preview"
              ? "border-[#42245f] text-[#42245f]"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Live Experience Preview
        </button>
      </div>

      {/* Tab Content 1: Overview */}
      {currentTab === "overview" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-5 rounded-xl border border-border bg-card shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#69439a]">
                Published Projections
              </span>
              <IconFileCheck className="size-5 text-[#69439a]" />
            </div>
            <div className="text-3xl font-bold font-sans text-foreground">
              {data.publicWeb.publishedPages}
            </div>
            <p className="text-xs text-muted-foreground">
              Published pages exposed to the public frontend application (`apps/web`).
            </p>
          </div>

          <div className="p-5 rounded-xl border border-border bg-card shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#8d7d58]">
                Site Navigation
              </span>
              <IconMenu2 className="size-5 text-[#8d7d58]" />
            </div>
            <div className="text-sm font-semibold text-foreground">
              Status: <span className="text-[#2f7d3b]">{data.publicWeb.navigationStatus}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Primary site menu structure is synchronized with published content routes.
            </p>
          </div>

          <div className="p-5 rounded-xl border border-border bg-card shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#2f7d3b]">
                Public Web Domain
              </span>
              <IconWorld className="size-5 text-[#2f7d3b]" />
            </div>
            <div className="text-xs font-mono font-semibold text-foreground truncate">
              {data.publicWeb.publishedSiteUrl}
            </div>
            <p className="text-xs text-muted-foreground">
              Anonymous public boundary with strict SSL & read-only projection security.
            </p>
          </div>
        </div>
      )}

      {/* Tab Content 2: Navigation Hierarchy */}
      {currentTab === "navigation" && (
        <div className="p-5 rounded-xl border border-border bg-card shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div>
              <h2 className="text-base font-serif font-bold text-foreground">Header & Primary Menu Builder</h2>
              <p className="text-xs text-muted-foreground">
                Re-order or adjust the top header navigation menu rendered on the public website.
              </p>
            </div>
            <button
              onClick={() => setFeedback("Navigation hierarchy saved to public projection.")}
              className="px-3 py-1.5 rounded bg-[#42245f] text-white text-xs font-semibold hover:bg-[#542f7f]"
            >
              Save Navigation
            </button>
          </div>

          <div className="divide-y divide-border border border-border rounded-lg overflow-hidden">
            {navItems.map((item, idx) => (
              <div key={item.id} className="flex items-center justify-between p-3 bg-background hover:bg-accent/30 text-xs">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-muted-foreground font-bold text-[11px]">{idx + 1}.</span>
                  <span className="font-semibold text-foreground">{item.title}</span>
                  <span className="font-mono text-muted-foreground text-[11px]">{item.path}</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    disabled={idx === 0}
                    onClick={() => moveNavItem(idx, "up")}
                    className="px-2 py-1 rounded border border-border hover:bg-accent text-[11px] disabled:opacity-30"
                  >
                    ▲ Move Up
                  </button>
                  <button
                    disabled={idx === navItems.length - 1}
                    onClick={() => moveNavItem(idx, "down")}
                    className="px-2 py-1 rounded border border-border hover:bg-accent text-[11px] disabled:opacity-30"
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
        <div className="p-5 rounded-xl border border-border bg-card shadow-sm space-y-4">
          <div className="border-b border-border pb-3">
            <h2 className="text-base font-serif font-bold text-foreground">URL Routes & SEO Canonical Mapping</h2>
            <p className="text-xs text-muted-foreground">
              Inspect and configure canonical path overrides and public route projections.
            </p>
          </div>

          <div className="overflow-x-auto border border-border rounded-lg">
            <table className="w-full text-left text-xs">
              <thead className="bg-secondary/50 border-b border-border text-muted-foreground font-semibold uppercase text-[10px]">
                <tr>
                  <th className="p-3">Public Route Path</th>
                  <th className="p-3">Route Type</th>
                  <th className="p-3">Canonical Overrides</th>
                  <th className="p-3">Access Level</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {navItems.map((item) => (
                  <tr key={item.id} className="hover:bg-accent/30">
                    <td className="p-3 font-mono font-semibold text-[#42245f]">{item.path}</td>
                    <td className="p-3 capitalize">{item.title} Section</td>
                    <td className="p-3 font-mono text-muted-foreground">
                      https://slgs.edu.sl{item.path}
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded bg-[#2f7d3b]/10 text-[#2f7d3b] text-[10px] font-semibold uppercase">
                        Public Anonymous
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab Content 4: Live Experience Preview */}
      {currentTab === "preview" && (
        <div className="p-5 rounded-xl border border-border bg-card shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div>
              <h2 className="text-base font-serif font-bold text-foreground">Live Experience Preview Simulator</h2>
              <p className="text-xs text-muted-foreground">
                Simulated public website layout with institutional header, hero section, and house color branding.
              </p>
            </div>
            <span className="px-2.5 py-1 rounded bg-[#2f7d3b]/10 text-[#2f7d3b] border border-[#2f7d3b]/20 text-xs font-semibold">
              Live Projection
            </span>
          </div>

          <div className="p-6 rounded-xl border border-[#c2b28a]/40 bg-gradient-to-br from-white to-[#faf9f6] space-y-6 shadow-inner">
            {/* Header Mock */}
            <div className="flex items-center justify-between pb-4 border-b border-[#c2b28a]/20">
              <div className="flex items-center gap-3">
                <span className="size-8 rounded-lg bg-[#42245f] text-[#c2b28a] flex items-center justify-center font-serif font-bold text-sm">
                  SL
                </span>
                <div>
                  <h3 className="font-serif font-bold text-sm text-[#231f20]">Sierra Leone Grammar School</h3>
                  <p className="text-[10px] text-[#58595b] uppercase tracking-wider">Regent, Freetown · Est. 1845</p>
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs font-medium text-[#231f20]">
                {navItems.slice(0, 5).map((m) => (
                  <span key={m.id} className="hover:text-[#42245f] cursor-pointer">
                    {m.title}
                  </span>
                ))}
              </div>
            </div>

            {/* Hero Mock */}
            <div className="p-8 rounded-xl bg-[#42245f] text-white space-y-3 relative overflow-hidden">
              <div className="absolute right-0 top-0 w-48 h-48 bg-[#c2b28a]/10 rounded-full blur-2xl" />
              <span className="text-[10px] uppercase tracking-widest px-2.5 py-1 rounded bg-[#c2b28a] text-[#42245f] font-bold">
                A non-palmam qui meruit ferat
              </span>
              <h2 className="text-2xl font-serif font-bold">Welcoming Excellence & Tradition</h2>
              <p className="text-xs text-white/80 max-w-xl">
                Providing standard secondary education with academic rigor, sporting house heritage, and moral excellence.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
