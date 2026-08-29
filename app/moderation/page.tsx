import type { Metadata } from "next";
import LegalLayout from "@/components/LegalLayout";

export const metadata: Metadata = {
  title: "Listing & Content Moderation Policy",
  description:
    "How AstroBid reviews and moderates the product listings that founders submit when bidding for a launch date.",
  alternates: { canonical: "/moderation" },
};

export default function ModerationPolicy() {
  return (
    <LegalLayout title="Listing & Content Moderation Policy" updated="29 August 2026">
      <p>
        AstroBid (<a href="https://astrobid.lol">astrobid.lol</a>) sells promotional calendar
        placements. A paid bid reserves a single calendar date; the highest bid 24 hours before that
        date wins a &ldquo;launch spotlight&rdquo; on the calendar and a public launch page. This
        policy explains what may be listed and how we review it.
      </p>

      <h2>1. What a listing is</h2>
      <p>
        A listing is the information a bidder submits about the product, service, or project they are
        promoting: a <strong>product name</strong>, a <strong>website URL</strong>, a{" "}
        <strong>category</strong>, a short <strong>tagline</strong>, and — for the winning listing —
        a longer <strong>description</strong> and <strong>logo</strong>. Every listing must be for a{" "}
        <strong>real, lawful product that the submitter owns or is authorised to promote</strong>.
        AstroBid does not sell, ship, or take custody of any listed product; we sell only the
        promotional placement.
      </p>

      <h2>2. Prohibited listings</h2>
      <p>We do not permit listings that promote, link to, or facilitate:</p>
      <ul>
        <li>
          Anything illegal under the laws of India, the European Union, the United Kingdom, or the
          United States, or that breaches the acceptable-use rules of our payment processors.
        </li>
        <li>Weapons, ammunition, explosives, or related accessories.</li>
        <li>
          Recreational or illegal drugs, controlled substances, or drug paraphernalia.
        </li>
        <li>
          Adult or sexually explicit content and services, including escort or companionship
          services.
        </li>
        <li>Gambling, betting, lotteries, or money games where the operator is not licensed.</li>
        <li>
          Hate speech, or content that harasses, threatens, or promotes violence or discrimination
          against a person or group.
        </li>
        <li>
          Malware, spyware, phishing, credential harvesting, engagement/follower farms, or
          hacking-, DDoS-, or spam-for-hire services.
        </li>
        <li>
          Counterfeit goods, pirated media or software, or anything that infringes another
          party&rsquo;s intellectual property, trademark, or publicity rights.
        </li>
        <li>
          Financial scams, Ponzi or pyramid schemes, &ldquo;get rich quick&rdquo; or
          guaranteed-return programs, unlicensed lending, or unregistered securities offerings.
        </li>
        <li>
          Token or coin offerings whose main purpose is speculative fundraising, &ldquo;pump&rdquo;
          promotion, or airdrop farming. Legitimate software and tools in the crypto space are
          allowed.
        </li>
        <li>
          Deceptive or miscategorised listings: bait-and-switch URLs, fabricated metrics, or
          impersonation of another product, company, or person.
        </li>
        <li>
          Any sexualisation of minors. Such content is removed immediately and reported to the
          relevant authorities.
        </li>
        <li>
          Third-party personal data, doxxing, or private-surveillance services.
        </li>
      </ul>

      <h2>3. How listings are reviewed</h2>
      <h3>a. At submission — automated</h3>
      <p>
        Before payment, every bid is validated: the URL must be a well-formed{" "}
        <code>http(s)</code> address, a category from our fixed list is required, free-text fields
        are length-limited, and the text is screened against a keyword blocklist covering the
        categories above. Submissions that fail are rejected before any charge is made.
      </p>
      <h3>b. After publication — human review</h3>
      <p>
        Paid listings appear on the day&rsquo;s bid leaderboard immediately, and the winning listing
        is featured as the calendar spotlight with a public launch page. Our team reviews live
        listings against this policy on an ongoing basis, normally within 24 hours of publication,
        and immediately when a listing is reported. We may hold, hide, or remove any listing at any
        time.
      </p>
      <h3>c. Reports</h3>
      <p>
        Anyone can report a listing by emailing{" "}
        <a href="mailto:pbdomains01@gmail.com">pbdomains01@gmail.com</a> with the launch date and
        product name. We aim to review reports within 2 business days, and faster for safety issues.
      </p>

      <h2>4. Enforcement</h2>
      <p>If a listing breaches this policy we may, at our discretion and without prior notice:</p>
      <ul>
        <li>remove it from the leaderboard, the calendar spotlight, and its launch page;</li>
        <li>
          cancel the associated bid; because AstroBid sells a time-sensitive promotional placement
          and not a physical good, <strong>bids are non-refundable</strong>, including where a
          listing is removed for a policy breach (see our{" "}
          <a href="/refunds">Refund &amp; Cancellation Policy</a>);
        </li>
        <li>block the associated email address and IP from placing future bids;</li>
        <li>report illegal content to the relevant authorities.</li>
      </ul>

      <h2>5. Intellectual-property complaints</h2>
      <p>
        If you believe a listing infringes your copyright or trademark, email{" "}
        <a href="mailto:pbdomains01@gmail.com">pbdomains01@gmail.com</a> with your contact
        details, identification of the protected work, the infringing listing (date, product name,
        and URL), and a good-faith statement that the use is unauthorised. We remove verified
        infringing listings promptly and notify the bidder.
      </p>

      <h2>6. Changes</h2>
      <p>
        We may update this policy; the current version always lives at{" "}
        <a href="https://astrobid.lol/moderation">astrobid.lol/moderation</a>.
      </p>

      <h2>7. Contact</h2>
      <p>
        Moderation, reports, takedowns, and billing:{" "}
        <a href="mailto:pbdomains01@gmail.com">pbdomains01@gmail.com</a>
      </p>
    </LegalLayout>
  );
}
