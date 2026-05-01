import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPage() {
  return (
    <div className="ui-policy-page ui-container">
      <div className="ui-policy-container">
        <Link href="/" className="ui-back-link">
          <ArrowLeft size={16} /> Back to Home
        </Link>
        
        <h1>Privacy Policy</h1>
        <p className="last-updated">Last Updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>

        <section>
          <h2>1. Information We Collect</h2>
          <p>
            When you use NovaFeeds and our dashboard, we collect the minimum amount of data necessary to provide our services. This includes:
          </p>
          <ul>
            <li><strong>Discord Profile Data:</strong> Your Discord ID, username, and avatar URL when you log in.</li>
            <li><strong>Server Data:</strong> IDs and names of servers where the bot is invited, and channel IDs you configure for feeds.</li>
            <li><strong>Feed Configurations:</strong> URLs and settings for the feeds you choose to monitor.</li>
          </ul>
        </section>

        <section>
          <h2>2. How We Use Your Data</h2>
          <p>
            We use the collected information solely for the operation and improvement of NovaFeeds. This includes:
          </p>
          <ul>
            <li>Delivering automated messages to your configured Discord channels.</li>
            <li>Authenticating your access to the web dashboard.</li>
            <li>Managing your premium subscriptions via our payment provider (Stripe).</li>
          </ul>
        </section>

        <section>
          <h2>3. Data Sharing and Third Parties</h2>
          <p>
            We do not sell, trade, or otherwise transfer your personal information to outside parties. Your data may be shared with trusted third parties who assist us in operating our services (e.g., Stripe for payments), provided they agree to keep this information confidential.
          </p>
        </section>

        <section>
          <h2>4. Data Retention and Deletion</h2>
          <p>
            Your data is stored securely in our database. If you remove NOVABOT from your server, your server's feed configurations will become inactive. You may request the complete deletion of your data by contacting us on our Support Server.
          </p>
        </section>

        <section>
          <h2>5. Cookies</h2>
          <p>
            Our web dashboard uses session cookies (via NextAuth) strictly for authentication purposes to keep you logged in. We do not use tracking or advertising cookies.
          </p>
        </section>

        <section>
          <h2>6. Contact Us</h2>
          <p>
            If you have any questions regarding this Privacy Policy, please contact us on our <a href="https://discord.gg/PbvX3S7pXR" target="_blank" rel="noopener noreferrer">Support Server</a>.
          </p>
        </section>
      </div>
    </div>
  );
}
