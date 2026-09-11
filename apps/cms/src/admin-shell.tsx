import type { ReactNode } from "react";

const navigation = [
  { label: "Dashboard", href: "/admin" },
  {
    label: "Content",
    items: [
      ["Pages", "/admin/content?type=page"],
      ["News", "/admin/content?type=article"],
      ["Events", "/admin/content?type=event"],
      ["Announcements", "/admin/content?type=announcement"],
      ["Gallery", "/admin/content?type=gallery"],
      ["Media Library", "/admin/content?view=media"],
    ],
  },
  {
    label: "Editorial",
    items: [
      ["Drafts", "/admin/content?state=draft"],
      ["Review Queue", "/admin/content?state=submitted"],
      ["Approval Queue", "/admin/content?state=in_review"],
      ["Published", "/admin/content?state=published"],
    ],
  },
  {
    label: "Public Web",
    items: [
      ["Navigation", "/admin/public-web"],
      ["Pages", "/admin/content?type=page&state=published"],
      ["Preview", "/admin/public-web#preview"],
      ["Published Site", "/admin/public-web#published-site"],
    ],
  },
  {
    label: "Access",
    items: [
      ["Users", "/admin/users"],
      ["Clubs", "/admin/content?view=clubs"],
      ["Roles & Permissions", "/admin/content?view=roles"],
    ],
  },
  {
    label: "System",
    items: [
      ["Audit Log", "/admin/content?view=audit"],
      ["System Status", "/admin/system-status"],
    ],
  },
] as const;

export function AdminShell({ children }: { readonly children: ReactNode }) {
  return (
    <div className="admin-shell">
      <a className="skip-link" href="#admin-main">
        Skip to administration workspace
      </a>
      <aside className="admin-sidebar" aria-label="CMS navigation">
        <div className="admin-brand">
          <span className="admin-crest" aria-hidden="true">
            SL
          </span>
          <div>
            <strong>SLGS CMS</strong>
            <span>Administration</span>
          </div>
        </div>
        <nav>
          {navigation.map((group) =>
            "href" in group ? (
              <a
                className="admin-nav-dashboard"
                href={group.href}
                key={group.label}
              >
                {group.label}
              </a>
            ) : (
              <section className="admin-nav-group" key={group.label}>
                <h2>{group.label}</h2>
                {group.items.map(([label, href]) => (
                  <a href={href} key={label}>
                    {label}
                  </a>
                ))}
              </section>
            ),
          )}
        </nav>
      </aside>
      <main id="admin-main" className="admin-main">
        {children}
      </main>
    </div>
  );
}
