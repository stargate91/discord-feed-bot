import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function TermsPage() {
  return (
    <div className="policy-page">
      <div className="policy-container">
        <Link href="/" className="back-link">
          <ArrowLeft size={16} /> Back to Home
        </Link>
        
        <h1>Terms of Service</h1>
        <p className="last-updated">Last Updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>

        <section>
          <h2>1. Acceptance of Terms</h2>
          <p>
            By inviting NovaFeeds to your Discord server or logging into our web dashboard, you agree to comply with and be bound by these Terms of Service. If you do not agree to these terms, please do not use the bot.
          </p>
        </section>

        <section>
          <h2>2. Description of Service</h2>
          <p>
            NovaFeeds is a Discord bot that provides automated feed notifications (including Free Games, YouTube, Twitch, RSS, and Crypto updates) to Discord servers. We provide a web dashboard to configure these feeds.
          </p>
        </section>

        <section>
          <h2>3. User Responsibilities</h2>
          <p>
            You are responsible for the feeds you configure NovaFeeds to monitor. You agree not to use NovaFeeds to distribute illegal, offensive, or malicious content. We reserve the right to remove the bot from your server or ban your account if you violate Discord's Terms of Service or our guidelines.
          </p>
        </section>

        <section>
          <h2>4. Premium Subscriptions</h2>
          <p>
            NovaFeeds offers premium features through a subscription model. Payments are securely processed via Stripe. Subscriptions automatically renew unless canceled. You may cancel your subscription at any time through the dashboard. Refunds are subject to our refund policy and handled on a case-by-case basis.
          </p>
        </section>

        <section>
          <h2>5. Limitation of Liability</h2>
          <p>
            NovaFeeds is provided "as is" without any warranties. We do not guarantee 100% uptime or the complete accuracy of feed deliveries. In no event shall NovaFeeds or its developers be liable for any damages arising out of the use or inability to use the service.
          </p>
        </section>

        <section>
          <h2>6. Changes to Terms</h2>
          <p>
            We reserve the right to modify these Terms of Service at any time. Continued use of NovaFeeds after any such changes constitutes your consent to such changes.
          </p>
        </section>

        <section>
          <h2>7. Contact Us</h2>
          <p>
            If you have any questions about these Terms, please reach out to us on our <a href="https://discord.gg/PbvX3S7pXR" target="_blank" rel="noopener noreferrer">Support Server</a>.
          </p>
        </section>
      </div>
    </div>
  );
}
