import { createFileRoute, Link } from "@tanstack/react-router";
import { ContentList, EmptyState, SectionHeader } from "../content-components";
import { getHomeContent } from "../public-content";
import { absolutePublicUrl } from "../public-origin";
export const Route = createFileRoute("/")({
  loader: () => getHomeContent(),
  head: () => ({
    meta: [
      { title: "Sierra Leone Grammar School" },
      {
        name: "description",
        content:
          "We offer a wonderful environment where students curiosity is awakened. Their journey is one of discovery; where talents and passions are nurtured and developed.",
      },
      { property: "og:title", content: "Sierra Leone Grammar School" },
      { property: "og:type", content: "website" },
      { property: "og:url", content: absolutePublicUrl("/") },
      { property: "og:image", content: "/web-app-manifest-192x192.png" },

      // Twitter Card
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Sierra Leone Grammar School" },
      {
        name: "twitter:description",
        content:
          "We offer a wonderful environment where students curiosity is awakened. Their journey is one of discovery; where talents and passions are nurtured and developed.",
      },
      { name: "twitter:image", content: "/web-app-manifest-192x192.png" },
    ],
    links: [
      { rel: "canonical", href: absolutePublicUrl("/") },
      { rel: "icon", href: "/favicon.ico" },
      {
        rel: "icon",
        type: "image/png",
        sizes: "16x16",
        href: "/favicon-16x16.png",
      },
      {
        rel: "icon",
        type: "image/png",
        sizes: "32x32",
        href: "/favicon-32x32.png",
      },
    ],
  }),
  component: HomePage,
});
function HomePage() {
  const content = Route.useLoaderData();
  return (
    <>
      <section className="home-hero">
        <div>
          <p className="eyebrow">Welcome to SLGS</p>
          <h1>Learning, character and community</h1>
          <p>
            The Sierra Leone Grammar School is a premier secondary school which
            seeks to promote responsible citizenship through the provision of
            quality education and sound moral values in a structured and
            stimulating environment thus enabling members of the school to
            maximize their potential for education, learning and excellent
            service.
          </p>
          <div className="hero-actions">
            <Link className="primary-action" to="/about">
              Discover the school
            </Link>
            <Link className="secondary-action" to="/admissions">
              Admissions information
            </Link>
          </div>
        </div>
        <div className="hero-emblem" aria-hidden="true">
          <span>SLGS</span>
          <small>Tradition • future learning</small>
        </div>
      </section>
      <section
        className="announcement-band"
        aria-labelledby="announcements-heading"
      >
        <div>
          <p className="eyebrow">Important updates</p>
          <h2 id="announcements-heading">Announcements</h2>
        </div>
        {content.announcements.length ? (
          <ul>
            {content.announcements.map((item) => (
              <li key={item.id}>
                <Link to="/announcements/$slug" params={{ slug: item.slug }}>
                  {item.title}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p>No published announcements at this time.</p>
        )}
      </section>
      <section className="home-section">
        <SectionHeader
          eyebrow="Latest stories"
          title="School news"
          introduction="Published updates from the SLGS community."
          level={2}
        />
        <ContentList items={content.news} kind="article" />
        <Link className="section-link" to="/news">
          View all news
        </Link>
      </section>
      <section className="home-section tinted">
        <SectionHeader
          eyebrow="Calendar"
          title="Upcoming events"
          introduction="Public school events and important dates."
          level={2}
        />
        <ContentList items={content.events} kind="event" />
        <Link className="section-link" to="/events">
          View all events
        </Link>
      </section>
      <section className="pathways">
        <article>
          <p className="eyebrow">Admissions</p>
          <h2>Plan your next step</h2>
          <p>
            Requirements, dates and application guidance will be published by
            the school.
          </p>
          <Link to="/admissions">Explore admissions</Link>
        </article>
        <article>
          <p className="eyebrow">Academics</p>
          <h2>Explore learning</h2>
          <p>
            Discover programmes, subjects and academic opportunities as official
            content becomes available.
          </p>
          <Link to="/academics">Explore academics</Link>
        </article>
        <article>
          <p className="eyebrow">School life</p>
          <h2>Beyond the classroom</h2>
          <p>Clubs, activities, STEM, ICT and community life.</p>
          <Link to="/life">Explore school life</Link>
        </article>
        <article>
          <p className="eyebrow">Alumni</p>
          <h2>Stay connected</h2>
          <p>Join our network of graduates and stay in touch.</p>
          <Link to="/alumni">Explore alumni</Link>
        </article>
      </section>
      <section className="home-section">
        <SectionHeader
          eyebrow="In pictures"
          title="Featured gallery"
          introduction="Published moments from school life."
          level={2}
        />
        {content.galleries.length ? (
          <ContentList items={content.galleries} kind="gallery" />
        ) : (
          <EmptyState>No published gallery is available yet.</EmptyState>
        )}
      </section>
    </>
  );
}
