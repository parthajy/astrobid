import type { Metadata } from "next";
import LegalLayout from "@/components/LegalLayout";

export const metadata: Metadata = {
  title: "Refund & Cancellation Policy",
  description: "AstroBid's refund and cancellation terms.",
  alternates: { canonical: "/refunds" },
};

export default function Refunds() {
  return (
    <LegalLayout title="Refund & Cancellation Policy" updated="29 August 2026">
      <h2>Bids are non-refundable</h2>
      <p>
        AstroBid sells a <strong>time-sensitive promotional placement</strong> on a launch calendar,
        delivered digitally the moment your payment is confirmed (your listing goes live on that
        date&rsquo;s leaderboard immediately). Because the placement is consumed as soon as it is
        provided:
      </p>
      <ul>
        <li>All bids are final and <strong>non-refundable</strong>.</li>
        <li>
          Being <strong>outbid</strong> does not entitle you to a refund — this is the core mechanic
          of the platform and is stated at checkout.
        </li>
        <li>
          A listing <strong>removed for breaching</strong> our{" "}
          <a href="/moderation">Listing &amp; Content Moderation Policy</a> is not refunded.
        </li>
        <li>
          Choosing not to use a won launch page, or not adding launch details, does not entitle you
          to a refund.
        </li>
      </ul>

      <h2>Cancellation</h2>
      <p>
        A bid cannot be cancelled once payment is confirmed. You may stop bidding at any time by
        simply not placing further bids.
      </p>

      <h2>When we do refund</h2>
      <p>We will refund, to the original payment method, in these cases:</p>
      <ul>
        <li>a duplicate charge for the same bid;</li>
        <li>
          a technical fault on our side that prevented your paid listing from appearing at all;
        </li>
        <li>a charge you can show was not authorised by you.</li>
      </ul>
      <p>
        Email <a href="mailto:support@astrobid.lol">support@astrobid.lol</a> within 14 days of the
        charge with your receipt and the launch date. We respond within 3 business days; approved
        refunds are issued within 5&ndash;10 business days depending on your bank and our payment
        processor.
      </p>

      <h2>Chargebacks</h2>
      <p>
        If you have a billing problem, contact us first — we can usually resolve it faster than a
        chargeback. Fraudulent chargebacks may result in a ban from future bids.
      </p>
    </LegalLayout>
  );
}
