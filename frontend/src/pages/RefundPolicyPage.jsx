import NeoPage from "../components/NeoPage";
import NeoFooter from "../components/NeoFooter";
import SiteHeader from "../components/SiteHeader";

const RefundPolicyPage = () => (
  <NeoPage>
    <SiteHeader />

    <main className="w-full py-12 md:py-24 px-6">
      <div className="container mx-auto max-w-4xl">
        <h1 className="text-5xl md:text-7xl font-display font-extrabold text-neo-black mb-12 g-fade-in">
          Refund <span className="text-outline">Policy</span>
        </h1>

        <div className="card-neo g-fade-in">
          <div className="legal-content space-y-6">
            <p>Effective Date: 07.12.2024</p>
            <p>
              At Reddit Goldmine, a brand of MERSEO LLC, we strive to provide high-quality educational materials and courses. Due to the digital
              nature of our products and the manual process involved, all sales are final, and we do not offer refunds under any circumstances.
            </p>

            <h2 className="text-3xl font-display font-bold text-neo-black">1. Refund Policy</h2>
            <h3 className="text-2xl font-display font-bold text-neo-black">1.1 30-Day Conditional Refund:</h3>
            <p>
              If you implement the strategies taught in our course exactly as shown and do not achieve the promised results within 30 days, you
              may request a refund. Refund requests must include evidence of your efforts (e.g., screenshots, posts, or metrics) to demonstrate
              that you followed the course instructions.
            </p>

            <h3 className="text-2xl font-display font-bold text-neo-black">1.2 All Other Sales Are Final:</h3>
            <p>
              For all other cases, once a purchase is completed, no refunds, cancellations, or chargebacks are allowed. By purchasing a course,
              you acknowledge and agree to this policy.
            </p>

            <h3 className="text-2xl font-display font-bold text-neo-black">1.3 Registration Process:</h3>
            <p>
              After completing your payment, we will send you a Heartbeat account for course registration. This process is managed manually and
              may take additional time depending on the volume of sales.
            </p>

            <h3 className="text-2xl font-display font-bold text-neo-black">1.4 Access Timeline:</h3>
            <p>
              While we strive to provide access as quickly as possible, delays may occur due to the manual nature of the registration process.
            </p>

            <h2 className="text-3xl font-display font-bold text-neo-black">2. Duplicate Payments</h2>
            <p>
              In the event of a duplicate payment for the same course, please contact us at info@redditgoldmine.com or hayk@redditgoldmine.com
              with proof of the transaction. We will review the case and, if verified, issue a refund for the duplicate charge.
            </p>

            <h2 className="text-3xl font-display font-bold text-neo-black">3. Technical Issues</h2>
            <p>If you experience issues with receiving your Heartbeat account or accessing your course, please contact us via:</p>
            <ul className="list-disc list-inside text-lg text-gray-700">
              <li>Email: info@redditgoldmine.com or hayk@redditgoldmine.com</li>
              <li>
                Telegram: <a href="https://t.me/+HnB3dnm_6rc1YzIy" className="text-neo-main font-bold underline">https://t.me/+HnB3dnm_6rc1YzIy</a>
              </li>
            </ul>
            <p>We are committed to resolving technical issues promptly to ensure access to your purchased content.</p>

            <h2 className="text-3xl font-display font-bold text-neo-black">4. Payment Processing</h2>
            <p>
              All payments are securely processed via credit card or cryptocurrency. Any disputes regarding payment will be governed by the
              respective payment provider’s policies.
            </p>

            <h2 className="text-3xl font-display font-bold text-neo-black">5. Contact Us</h2>
            <p>For any questions or concerns about this Refund Policy, please contact us:</p>
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

export default RefundPolicyPage;

