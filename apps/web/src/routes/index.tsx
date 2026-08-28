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
        content: "Official public website of Sierra Leone Grammar School.",
      },
      { property: "og:title", content: "Sierra Leone Grammar School" },
      { property: "og:type", content: "website" },
      { property: "og:url", content: absolutePublicUrl("/") },
    ],
    links: [{ rel: "canonical", href: absolutePublicUrl("/") }],
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
            A modern public gateway for school information, news and events.
            Official school-specific welcome content is awaiting CMS
            publication.
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
      <section className="contact-callout">
        <div>
          <p className="eyebrow">Contact and location</p>
          <h2>Find official school contact information</h2>
          <p>
            Contact details will appear once approved and published by the
            school.
          </p>
        </div>
        <Link className="primary-action" to="/contact">
          Contact SLGS
        </Link>
      </section>
    </>
  );
}
