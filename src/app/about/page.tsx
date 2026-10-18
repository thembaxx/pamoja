import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "@phosphor-icons/react/dist/ssr";
import { Brand } from "@/components/brand";
import { InstallButton, ThemeToggle } from "@/components/device-settings";
import { siteDescription, siteTitle, siteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: { absolute: siteTitle },
  description: siteDescription,
  alternates: { canonical: "/about" },
  openGraph: {
    url: "/about",
    type: "website",
    siteName: "Pamoja",
    title: siteTitle,
    description: siteDescription,
    images: [
      {
        url: "/brand/social-card.png",
        width: 1200,
        height: 630,
        alt: "Pamoja. A little each. A lot together.",
      },
    ],
  },
  robots: { index: true, follow: true },
};

export default function About() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Pamoja",
    url: `${siteUrl}/about`,
    description: siteDescription,
    applicationCategory: "ShoppingApplication",
    operatingSystem: "Web",
    browserRequirements:
      "Requires JavaScript. Installation requires HTTPS and a supported browser.",
    image: `${siteUrl}/brand/social-card.png`,
    isAccessibleForFree: true,
  };
  return (
    <div className="about-world">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
        }}
      />
      <header className="about-header">
        <Brand />
        <nav aria-label="About page navigation">
          <ThemeToggle />
          <Link href="/">
            Open workspace <ArrowUpRight size={16} aria-hidden="true" />
          </Link>
        </nav>
      </header>
      <main id="main-content" className="about-main">
        <section className="about-hero">
          <div>
            <p className="eyebrow">EVERYDAY ESSENTIALS. SHARED POSSIBILITIES.</p>
            <h1>
              A little each.
              <br />
              <em>A lot together.</em>
            </h1>
            <p>
              Good things go further when we buy together. Pamoja brings your community’s demand
              into one place, turning everyday essentials into shared savings.
            </p>
            <div className="about-actions">
              <Link href="/" className="button button-primary">
                Explore the demo <ArrowUpRight size={16} aria-hidden="true" />
              </Link>
              <InstallButton />
            </div>
            <p className="about-demo-note">
              A working demonstration. Sample USD prices. No real payments.
            </p>
          </div>
          <div className="about-art">
            <img
              src="/icons/app-512.png"
              width={512}
              height={512}
              alt="Pamoja’s three mint ribbons, joined around a shared centre"
              fetchPriority="high"
            />
            <span>TOGETHER, FOR LESS.</span>
          </div>
        </section>
        <section className="about-how" aria-labelledby="how-it-works">
          <div className="about-section-heading">
            <p className="eyebrow">FROM A FEW NEIGHBOURS TO SOMETHING BIGGER</p>
            <h2 id="how-it-works">More people. More possibility.</h2>
          </div>
          <div className="about-steps">
            {[
              [
                "01",
                "Pool the everyday.",
                "A community leader opens a buying pool. Members choose their quantity and join the demand for essentials like maize meal, rice, oil and soap.",
              ],
              [
                "02",
                "Unlock a better price.",
                "Funded memberships unlock wholesale price tiers. When the final price falls, earlier members receive a simulated rebate for the difference.",
              ],
              [
                "03",
                "Bring it home, together.",
                "Suppliers fulfil funded orders. The leader verifies delivery, and each member collects with a signed, time-limited QR pickup pass.",
              ],
            ].map(([number, title, description]) => (
              <article key={number}>
                <span>{number}</span>
                <h3>{title}</h3>
                <p>{description}</p>
              </article>
            ))}
          </div>
        </section>
        <section className="about-roles">
          <div>
            <h2>
              One community.
              <br />A place for everyone.
            </h2>
            <p>
              Leaders organise pools and collections. Members join and track their pickup pass.
              Suppliers confirm stock, arrange delivery and see the fee breakdown.
            </p>
            <p>
              Members pay no added fee in this demo. Suppliers pay a 2.5% service fee from their
              invoice.
            </p>
          </div>
          <nav aria-label="Explore demo roles">
            <Link href="/">
              Try the leader workspace <ArrowUpRight size={16} aria-hidden="true" />
            </Link>
            <Link href="/join/maize">
              Try the member journey <ArrowUpRight size={16} aria-hidden="true" />
            </Link>
            <Link href="/supplier">
              Try the supplier console <ArrowUpRight size={16} aria-hidden="true" />
            </Link>
          </nav>
        </section>
        <aside className="about-boundaries">
          <h2>Made to explore.</h2>
          <p>
            Pamoja is a runnable community buying demo. Payments, escrow, rebates and payouts are
            simulated; no real money is held or transferred. Invite links share a sample workspace.
            Production identity, payment processing and regulatory arrangements are outside this
            demo.
          </p>
          <p>
            Install it on supported devices for a dedicated app window. An offline launch screen and
            scan queuing help with interrupted connections; payment, pass verification and releasing
            goods require a server connection.
          </p>
        </aside>
      </main>
      <footer className="about-footer">
        <span>Pamoja · Together, for less.</span>
        <nav aria-label="Project information">
          <a href="https://github.com/thembaxx/pamoja">Source & documentation</a>
          <a href="/llms.txt">llms.txt</a>
        </nav>
      </footer>
    </div>
  );
}
