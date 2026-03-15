import NeoPage from "../components/NeoPage";
import NeoFooter from "../components/NeoFooter";
import SiteHeader from "../components/SiteHeader";

const DisclaimerPage = () => (
  <NeoPage>
    <SiteHeader />

    <main className="w-full py-12 md:py-24 px-6">
      <div className="container mx-auto max-w-4xl">
        <h1 className="text-5xl md:text-7xl font-display font-extrabold text-neo-black mb-12 g-fade-in">
          <span className="text-outline">Disclaimer</span>
        </h1>

        <div className="card-neo g-fade-in">
          <div className="space-y-6">
            <p>Effective Date: 07.12.2024</p>
            <p>
              Reddit Goldmine, a brand of MERSEO LLC, provides educational courses designed to help users grow their presence on Reddit. By
              accessing or purchasing our courses, you acknowledge and agree to the following:
            </p>

            <h3 className="text-2xl font-display font-bold text-neo-black">No Guarantees:</h3>
            <p>
              The strategies and techniques taught in our courses are for educational purposes only. Success depends on individual effort,
              understanding of Reddit’s rules, and other external factors. We do not guarantee specific outcomes, such as achieving a certain amount
              of karma, traffic, or engagement on Reddit.
            </p>

            <h3 className="text-2xl font-display font-bold text-neo-black">Compliance with Reddit’s Rules:</h3>
            <p>
              It is your responsibility to comply with Reddit’s Terms of Service and community guidelines. We are not liable for any account
              suspensions, bans, or other actions taken by Reddit due to user activities.
            </p>

            <h3 className="text-2xl font-display font-bold text-neo-black">Independent Decision-Making:</h3>
            <p>
              The decisions you make based on the information in our courses are your own. MERSEO LLC and Reddit Goldmine are not responsible for any
              consequences resulting from those decisions.
            </p>

            <h3 className="text-2xl font-display font-bold text-neo-black">Third-Party Tools and Services:</h3>
            <p>
              Any tools or third-party services mentioned in our courses are suggested for convenience. We do not endorse or have any control over
              these tools or services.
            </p>

            <p>If you have questions about this disclaimer, contact us at:</p>
            <ul className="list-disc list-inside text-lg text-gray-700">
              <li>Email: info@redditgoldmine.com or hayk@redditgoldmine.com</li>
            </ul>
          </div>
        </div>
      </div>
    </main>

    <NeoFooter />
  </NeoPage>
);

export default DisclaimerPage;

