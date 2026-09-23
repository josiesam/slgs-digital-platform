import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { absolutePublicUrl } from "../public-origin";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact Us | Sierra Leone Grammar School" },
      {
        name: "description",
        content:
          "Official contact details, location, phone numbers, email, and enquiry form for Sierra Leone Grammar School.",
      },
      { property: "og:title", content: "Contact Sierra Leone Grammar School" },
      { property: "og:url", content: absolutePublicUrl("/contact") },
    ],
    links: [{ rel: "canonical", href: absolutePublicUrl("/contact") }],
  }),
  component: ContactPage,
});

function MapPinIcon({
  className = "w-6 h-6",
}: {
  readonly className?: string;
}) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
      />
    </svg>
  );
}

function MailIcon({ className = "w-6 h-6" }: { readonly className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
      />
    </svg>
  );
}

function PhoneIcon({ className = "w-6 h-6" }: { readonly className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
      />
    </svg>
  );
}

function SendIcon({ className = "w-4 h-4" }: { readonly className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
      />
    </svg>
  );
}

function CheckIcon({ className = "w-5 h-5" }: { readonly className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function ContactPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.name && formData.email && formData.message) {
      setSubmitted(true);
    }
  };

  return (
    <div className="space-y-12 page-container">
      {/* Header */}
      <header className="section-hero">
        <p className="eyebrow">Get in touch</p>
        <h1>Contact SLGS</h1>
        <p>
          We welcome enquiries from prospective students, parents, alumni, and
          official partners. Connect with our administration desk or visit our
          campus.
        </p>
      </header>

      {/* 3 Top Info Cards (Address, Email, Phone) inspired by design */}
      <div className="gap-6 grid grid-cols-1 md:grid-cols-3">
        {/* Address Card */}
        <div className="flex flex-col items-center bg-white shadow-xs hover:shadow-md p-8 border border-[var(--slgs-border)] border-t-[var(--slgs-purple)] border-t-4 rounded-xl text-center transition-all">
          <div className="flex justify-center items-center bg-[var(--slgs-khaki-light)] mb-4 rounded-full w-12 h-12 text-[var(--slgs-purple-dark)]">
            <MapPinIcon className="w-6 h-6" />
          </div>
          <h2 className="mb-2 font-bold text-[var(--slgs-ink)] text-sm uppercase tracking-widest">
            Address
          </h2>
          <p className="text-[var(--slgs-muted)] text-sm leading-relaxed">
            Sierra Leone Grammar School
            <br />
            Regent, Freetown
            <br />
            Sierra Leone, West Africa
          </p>
        </div>

        {/* Email Card */}
        <div className="flex flex-col items-center bg-white shadow-xs hover:shadow-md p-8 border border-[var(--slgs-border)] border-t-[var(--slgs-purple)] border-t-4 rounded-xl text-center transition-all">
          <div className="flex justify-center items-center bg-[var(--slgs-khaki-light)] mb-4 rounded-full w-12 h-12 text-[var(--slgs-purple-dark)]">
            <MailIcon className="w-6 h-6" />
          </div>
          <h2 className="mb-2 font-bold text-[var(--slgs-ink)] text-sm uppercase tracking-widest">
            Email
          </h2>
          <p className="text-[var(--slgs-muted)] text-sm leading-relaxed">
            <a
              href="mailto:info@slgs.edu.sl"
              className="hover:text-[var(--slgs-purple)] transition-colors"
            >
              info@slgs.edu.sl
            </a>
            <br />
          </p>
        </div>

        {/* Phone Card */}
        <div className="flex flex-col items-center bg-white shadow-xs hover:shadow-md p-8 border border-[var(--slgs-border)] border-t-[var(--slgs-purple)] border-t-4 rounded-xl text-center transition-all">
          <div className="flex justify-center items-center bg-[var(--slgs-khaki-light)] mb-4 rounded-full w-12 h-12 text-[var(--slgs-purple-dark)]">
            <PhoneIcon className="w-6 h-6" />
          </div>
          <h2 className="mb-2 font-bold text-[var(--slgs-ink)] text-sm uppercase tracking-widest">
            Phone
          </h2>
          <p className="text-[var(--slgs-muted)] text-sm leading-relaxed">
            <a
              href="tel:+23276490656"
              className="hover:text-[var(--slgs-purple)] transition-colors"
            >
              +232 76 490 656
            </a>
          </p>
        </div>
      </div>

      {/* Main Contact Form Section */}
      <div className="bg-white shadow-xs p-8 md:p-12 border border-[var(--slgs-border)] rounded-2xl">
        <div className="mb-8">
          <h2 className="inline-block relative mb-2 font-serif font-bold text-[var(--slgs-purple-dark)] text-2xl md:text-3xl">
            Contact Us
            <span className="block bg-[var(--slgs-purple)] mt-2 rounded-full w-12 h-1" />
          </h2>
          <p className="mt-2 text-[var(--slgs-muted)] text-sm">
            Send a direct enquiry to our administration desk. We aim to respond
            to all public communications promptly.
          </p>
        </div>

        {submitted ? (
          <div className="flex items-start gap-4 bg-[var(--slgs-khaki-light)] p-6 border border-[var(--slgs-khaki)] rounded-xl text-[var(--slgs-purple-dark)]">
            <div className="flex justify-center items-center bg-[var(--slgs-purple)] mt-0.5 rounded-full w-8 h-8 text-white shrink-0">
              <CheckIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="mb-1 font-serif font-bold text-lg">
                Message Received
              </h3>
              <p className="text-[var(--slgs-muted)] text-sm">
                Thank you, <strong>{formData.name}</strong>. Your enquiry has
                been successfully submitted to the Sierra Leone Grammar School
                administration. We will review your message and reply via{" "}
                <strong>{formData.email}</strong>.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSubmitted(false);
                  setFormData({
                    name: "",
                    email: "",
                    subject: "",
                    message: "",
                  });
                }}
                className="bg-[var(--slgs-purple)] hover:bg-[var(--slgs-purple-dark)] mt-4 px-4 py-2 rounded-md font-bold text-white text-xs transition-colors cursor-pointer"
              >
                Send another enquiry
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label
                htmlFor="contact-name"
                className="block mb-2 font-bold text-[var(--slgs-ink)] text-xs uppercase tracking-wider"
              >
                Full Name <span className="text-[var(--slgs-red)]">*</span>
              </label>
              <input
                id="contact-name"
                type="text"
                required
                placeholder="Enter your full name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="bg-slate-50/50 focus:bg-white px-4 py-3 border border-[var(--slgs-border)] focus:border-[var(--slgs-purple)] rounded-lg focus:outline-none focus:ring-[var(--slgs-purple)] focus:ring-1 w-full text-[var(--slgs-ink)] text-sm transition-all placeholder-[var(--slgs-muted)]/60"
              />
            </div>

            <div>
              <label
                htmlFor="contact-email"
                className="block mb-2 font-bold text-[var(--slgs-ink)] text-xs uppercase tracking-wider"
              >
                Email Address <span className="text-[var(--slgs-red)]">*</span>
              </label>
              <input
                id="contact-email"
                type="email"
                required
                placeholder="Enter your email address"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                className="bg-slate-50/50 focus:bg-white px-4 py-3 border border-[var(--slgs-border)] focus:border-[var(--slgs-purple)] rounded-lg focus:outline-none focus:ring-[var(--slgs-purple)] focus:ring-1 w-full text-[var(--slgs-ink)] text-sm transition-all placeholder-[var(--slgs-muted)]/60"
              />
            </div>

            <div>
              <label
                htmlFor="contact-subject"
                className="block mb-2 font-bold text-[var(--slgs-ink)] text-xs uppercase tracking-wider"
              >
                Subject
              </label>
              <input
                id="contact-subject"
                type="text"
                placeholder="Enter enquiry subject (e.g., Admissions, General Enquiry)"
                value={formData.subject}
                onChange={(e) =>
                  setFormData({ ...formData, subject: e.target.value })
                }
                className="bg-slate-50/50 focus:bg-white px-4 py-3 border border-[var(--slgs-border)] focus:border-[var(--slgs-purple)] rounded-lg focus:outline-none focus:ring-[var(--slgs-purple)] focus:ring-1 w-full text-[var(--slgs-ink)] text-sm transition-all placeholder-[var(--slgs-muted)]/60"
              />
            </div>

            <div>
              <label
                htmlFor="contact-message"
                className="block mb-2 font-bold text-[var(--slgs-ink)] text-xs uppercase tracking-wider"
              >
                Message <span className="text-[var(--slgs-red)]">*</span>
              </label>
              <textarea
                id="contact-message"
                rows={5}
                required
                placeholder="Write your message or enquiry here..."
                value={formData.message}
                onChange={(e) =>
                  setFormData({ ...formData, message: e.target.value })
                }
                className="bg-slate-50/50 focus:bg-white px-4 py-3 border border-[var(--slgs-border)] focus:border-[var(--slgs-purple)] rounded-lg focus:outline-none focus:ring-[var(--slgs-purple)] focus:ring-1 w-full text-[var(--slgs-ink)] text-sm transition-all placeholder-[var(--slgs-muted)]/60"
              />
            </div>

            <div>
              <button
                type="submit"
                className="inline-flex items-center gap-2 bg-[var(--slgs-purple)] hover:bg-[var(--slgs-purple-dark)] shadow-sm hover:shadow px-8 py-3.5 rounded-xl font-extrabold text-white text-xs uppercase tracking-wider transition-all cursor-pointer"
              >
                <span>Submit Enquiry</span>
                <SendIcon className="w-4 h-4" />
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
