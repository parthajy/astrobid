import type { Metadata } from "next";
import LegalLayout from "@/components/LegalLayout";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The terms that govern use of AstroBid.",
  alternates: { canonical: "/terms" },
};

export default function Terms() {
  return (
    <LegalLayout title="Terms of Service" updated="29 August 2026">
      <p>
        These terms govern your use of AstroBid (<a href="https://astrobid.lol">astrobid.lol</a>,
        &ldquo;AstroBid&rdquo;, &ldquo;we&rdquo;). By placing a bid you agree to them.
      </p>

      <h2>1. What AstroBid is</h2>
      <p>
        AstroBid is a promotional launch calendar. You place a monetary bid to be featured on a
        specific calendar date. The highest bid for a date, 24 hours before that date, wins a
        &ldquo;launch spotlight&rdquo; placement on the calendar and a public launch page for that
        day. All other bids remain visible on that date&rsquo;s public bid leaderboard. The
        &ldquo;cosmic alignment&rdquo; rating shown for each date is deterministic, novelty content
        for entertainment and is not advice.
      </p>

      <h2>2. What you are paying for</h2>
      <p>
        You are paying for a <strong>promotional placement</strong> — a listing on the leaderboard
        and, if you win, a featured spotlight and launch page. You are not paying for guaranteed
        traffic, sales, press, or any specific outcome. AstroBid does not sell, warehouse, fulfil,
        or guarantee any product that you list.
      </p>

      <h2>3. Bids and payment</h2>
      <ul>
        <li>Bids are placed in whole currency units and must exceed the current top bid.</li>
        <li>
          Payment is taken at the time you bid, through our third-party payment processor. You must
          provide a valid email address so we can send your receipt and, if you win, your launch-page
          link.
        </li>
        <li>
          <strong>Bids are final and non-refundable.</strong> Being outbid does not entitle you to a
          refund. See the <a href="/refunds">Refund &amp; Cancellation Policy</a>.
        </li>
        <li>
          A winning bid is locked 24 hours before the launch date. After that point the result does
          not change.
        </li>
      </ul>

      <h2>4. Your listing</h2>
      <p>
        You are responsible for everything you submit. You confirm that you own or are authorised to
        promote the product, that your listing is accurate, and that it complies with our{" "}
        <a href="/moderation">Listing &amp; Content Moderation Policy</a>. We may remove any listing
        and cancel the associated bid, without refund, for a breach of that policy.
      </p>

      <h2>5. No account</h2>
      <p>
        AstroBid has no login. Your email address, provided at payment, is the only identifier tied
        to your bid and to the private link used to edit a winning launch page. Keep that link
        private; anyone with it can edit your launch page.
      </p>

      <h2>6. Availability and changes</h2>
      <p>
        AstroBid is provided &ldquo;as is&rdquo;. We may change, suspend, or discontinue any part of
        the service. We are not liable for indirect or consequential losses, and our total liability
        for any claim is limited to the amount of the bid giving rise to the claim.
      </p>

      <h2>7. Governing law</h2>
      <p>These terms are governed by the laws of India. Contact: <a href="mailto:pbdomains01@gmail.com">pbdomains01@gmail.com</a>.</p>
    </LegalLayout>
  );
}
