import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

const navigation = [
  ["Home", "/"],
  ["About", "/about"],
  ["Admissions", "/admissions"],
  ["Academics", "/academics"],
  ["Life", "/life"],
  ["Parents", "/parents"],
  ["News", "/news"],
  ["Events", "/events"],
  ["Gallery", "/gallery"],
  ["Contact", "/contact"],
] as const;

function NavigationLinks() {
  return navigation.map(([label, to]) => (
    <Link
      key={to}
      to={to}
      activeProps={{ "aria-current": "page" }}
      activeOptions={{ exact: to === "/" }}
    >
      {label}
    </Link>
  ));
}

export function PublicLayout({ children }: { readonly children: ReactNode }) {
  return (
    <div className="site-shell">
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
      <header className="site-header">
        <div className="utility-bar">
          <span>Sierra Leone Grammar School</span>
          <span>Public information</span>
        </div>
        <div className="navigation-bar">
          <Link
            className="school-mark"
            to="/"
            aria-label="Sierra Leone Grammar School home"
          >
            <span aria-hidden="true">SLGS</span>
            <strong>Sierra Leone Grammar School</strong>
          </Link>
          <nav className="desktop-navigation" aria-label="Primary">
            <NavigationLinks />
          </nav>
          <details className="mobile-navigation">
            <summary>Menu</summary>
            <nav aria-label="Mobile primary">
              <NavigationLinks />
            </nav>
          </details>
        </div>
      </header>
      <main id="main-content">{children}</main>
      <footer className="site-footer">
        <div>
          <strong>Sierra Leone Grammar School</strong>
          <p>Official contact details are awaiting school approval.</p>
        </div>
        <nav aria-label="Footer">
          <Link to="/contact">Contact</Link>
          <Link to="/parents">Parent resources</Link>
        </nav>
      </footer>
    </div>
  );
}
