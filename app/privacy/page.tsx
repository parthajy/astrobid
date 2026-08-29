import type { Metadata } from "next";
import LegalLayout from "@/components/LegalLayout";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "What data AstroBid collects and how it is used.",
  alternates: { canonical: "/privacy" },
};

export default function Privacy() {
  return (
    <LegalLayout title="Privacy Policy" updated="29 August 2026">
      <p>
        AstroBid (<a href="https://astrobid.lol">astrobid.lol</a>) keeps data collection to the
        minimum needed to run a launch-calendar auction. There are no user accounts.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li>
          <strong>Listing details you submit:</strong> product name, URL, category, tagline, and (for
          a winning listing) description and logo URL. These are shown publicly on AstroBid.
        </li>
        <li>
          <strong>Your email address and name</strong> (name optional), provided at payment, used to
          send your receipt and your private launch-page link, and to contact you about your bid.
        </li>
        <li>
          <strong>Payment data:</strong> processed by our third-party payment processor. We do not
          receive or store your full card details; we store a transaction reference and the amount.
        </li>
        <li>
          <strong>Basic analytics:</strong> aggregate page views via Google Analytics. Standard
          server logs (IP, user agent) are retained short-term for security and abuse prevention.
        </li>
      </ul>

      <h2>How we use it</h2>
      <p>
        To display the calendar and leaderboards, take payment, deliver won launch pages, prevent
        abuse, and meet legal and payment-processor obligations. We do not sell personal data or use
        it for third-party advertising.
      </p>

      <h2>Who we share it with</h2>
      <ul>
        <li>Our payment processor (to take payment and handle disputes).</li>
        <li>Our hosting and database providers (to run the site).</li>
        <li>Google Analytics (aggregate usage).</li>
        <li>Authorities where required by law.</li>
      </ul>

      <h2>Retention</h2>
      <p>
        Listing and bid records are kept as long as the calendar entry is public and as needed for
        accounting and dispute resolution. You can ask us to remove your email address and any
        non-winning listing text by emailing{" "}
        <a href="mailto:pbdomains01@gmail.com">pbdomains01@gmail.com</a>. Records tied to a completed
        payment are retained where law requires.
      </p>

      <h2>Your rights</h2>
      <p>
        Depending on where you live, you may have rights to access, correct, or delete your personal
        data. Email <a href="mailto:pbdomains01@gmail.com">pbdomains01@gmail.com</a> and we will
        respond within 30 days.
      </p>

      <h2>Cookies</h2>
      <p>
        We use a small number of first-party cookies for basic functionality and Google Analytics
        cookies for aggregate measurement. You can block cookies in your browser without losing core
        functionality.
      </p>
    </LegalLayout>
  );
}
