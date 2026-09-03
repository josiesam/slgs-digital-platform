import { IconClock, IconMail, IconMapPin } from "@tabler/icons-react";
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
          <a href="mailto:info@slgs.edu.sl">Email: info@slgs.edu.sl</a>
          <a href="tel:+23276490656">Have any question? +232 76 490656</a>
        </div>
        <div className="navigation-bar">
          <Link
            className="school-mark"
            to="/"
            aria-label="Sierra Leone Grammar School home"
          >
            <img
              src="/web-app-manifest-512x512.png"
              width={50}
              height={50}
              alt="SLGS Logo"
            />
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
        <div className="site-footer__contact ">
          <div className="flex flex-col md:flex-row justify-between gap-4 md:gap-0 pb-4">
            <div className="flex flex-col gap-1 items-center justify-center">
              <IconMapPin stroke={2} />
              <p className="text-center">
                Sierra Leone Grammar School
                <br />
                Freetown, Sierra Leone
              </p>
            </div>
            <div className="flex flex-col gap-1 items-center justify-center">
              <IconClock stroke={2} />
              <p className="text-center">
                <strong>School Day</strong>
                <br />
                Mon - Fri: 08:10AM to 15:15PM
              </p>
            </div>
            <div className="flex flex-col gap-1 items-center justify-center">
              <IconMail stroke={2} />
              <p className="text-center">
                <strong>Email</strong>
                <br />
                info@slgs.edu.sl
              </p>
            </div>
          </div>
          <div className="site-footer__contact-callout">
            <div>
              <h2>International Alumni Groups</h2>
            </div>
            <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4  list-disc px-5 ">
              <li className="underline underline-offset-4">
                <a
                  href="http://www.regentonians.org"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-slgs-white/50"
                >
                  UK Group
                </a>
              </li>

              <li className="underline underline-offset-4">
                <a
                  href="https://slgsaana-westcoast.org"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-slgs-white/50"
                >
                  US Group - West Coast
                </a>
              </li>

              <li className="underline underline-offset-4">
                <a
                  href="https://slgsaanase.org"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-slgs-white/50"
                >
                  US Group - South Coast
                </a>
              </li>

              <li className="underline underline-offset-4">
                <a
                  href="http://slgsaanadc.org"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-slgs-white/50"
                >
                  US Group - Washington DC
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="pt-4 ">
          <p>{`© ${new Date().getFullYear()} Sierra Leone Grammar School. All rights reserved.`}</p>
        </div>
      </footer>
    </div>
  );
}
