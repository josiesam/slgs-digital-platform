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
      <section className="home-section principal-welcome-section">
        <div className="items-start gap-8 grid grid-cols-1 lg:grid-cols-12">
          <div className="space-y-4 lg:col-span-8">
            <SectionHeader
              eyebrow="Leadership & Vision"
              title="Welcome to Sierra Leone Grammar School"
              introduction="A message from the Principal of the Sierra Leone Grammar School."
              level={2}
            />

            <div className="space-y-4 text-[var(--slgs-ink)] text-base leading-relaxed prose">
              <p>
                A very warm welcome to you as you peruse through our website. We
                hope that you will find it quite interesting and informative. We
                have endeavoured to make this website very attractive as well.
              </p>
              <p>
                I was a pupil of this school and later became a Teacher from
                1987-1993. I gained a lot at the time and I presume that helped
                me considerably. I became Principal of our great school in the
                2018/2019 school year after a two year transition programme.
              </p>
              <p>
                This school was founded by the Church Missionary Society (CMS)
                on 25th March 1845. It is the oldest school in Africa, south of
                the Sahara. It has a Christian ethos. We are situated on
                50-acres of land west of the capital Freetown.
              </p>
              <p>
                This is a single school with both Junior and Senior Schools. We
                offer a good and sound education that prepares boys for the
                future. We have prepared thousands of boys to become successful
                men while others have not been so successful. We will soon have
                a state of the art Science and Innovation Laboratory and also
                make a significant improvement to our Science Laboratories.
                Teachers in this school do their uttermost to bring out the best
                from the pupils. The parents are quite supportive of the great
                efforts of this school and this has a tremendous and positive
                impact on their children.
              </p>
              <p>
                There are four Alumni Associations in the USA, one in the UK and
                one locally. Their impact on the school is significant for which
                we are tremendously grateful. Our well-wishers are numerous and
                we are appreciative of their moral support.
              </p>
              <p>
                As you browse through our website, I do hope you will connect
                with us in some ways. My best regards go to you. I thank you!
              </p>

              <div className="mt-6 pt-4 border-[var(--slgs-border)] border-t">
                <p className="mb-2 font-serif font-bold text-[var(--slgs-purple-dark)] text-lg italic">
                  Floreat Regentonia! God bless our Grammar School!
                </p>
                <p className="font-bold text-[var(--slgs-purple-dark)] text-sm uppercase tracking-wide">
                  Rev. Canon Leonard Ken Davies
                </p>
                <p className="font-medium text-[var(--slgs-muted)] text-xs">
                  (M.A. Th. &amp; Min, M.A. Ed., Dip. Th. CELTA) — Principal
                </p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-4 shrink-0">
            <figure className="bg-white shadow-md p-3 border border-[var(--slgs-border)] rounded-2xl overflow-hidden">
              <div className="bg-slate-100 rounded-xl aspect-[3/4] overflow-hidden">
                <img
                  src="/principal.png"
                  alt="Rev. Canon Leonard Ken Davies, Principal of Sierra Leone Grammar School"
                  className="w-full h-full object-cover object-top"
                  loading="lazy"
                />
              </div>
              <figcaption className="p-3 text-center">
                <p className="font-serif font-bold text-[var(--slgs-purple-dark)] text-sm">
                  Rev. Canon Leonard Ken Davies
                </p>
                <p className="text-[var(--slgs-muted)] text-xs">
                  Principal, Sierra Leone Grammar School
                </p>
              </figcaption>
            </figure>
          </div>
        </div>
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
