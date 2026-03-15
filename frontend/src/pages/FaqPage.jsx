import { useState } from "react";
import NeoPage from "../components/NeoPage";
import NeoFooter from "../components/NeoFooter";
import SiteHeader from "../components/SiteHeader";

const faqItems = [
  {
    question: "How long does it take to receive my course access?",
    answer:
      "Once your payment is confirmed, we manually send you a Heartbeat account for registration. This process may take some time, especially during high sales periods. Please allow up to 48 hours before contacting us.",
  },
  {
    question: "What should I do if I haven’t received my access after 48 hours?",
    answer:
      "If you haven’t received your Heartbeat registration email within 48 hours, please check your spam/junk folder. If it’s not there, contact us at info@redditgoldmine.com or via Telegram: https://t.me/+HnB3dnm_6rc1YzIy.",
  },
  {
    question: "Can I share my course access with others?",
    answer:
      "No. Each purchase provides access for a single user only. Sharing login credentials is a violation of our Terms of Service and may result in account suspension without refund.",
  },
  {
    question: "Is there an expiration date for my course access?",
    answer: "Your access to the course materials is ongoing and does not expire unless otherwise stated.",
  },
  {
    question: "Can I get a refund if I’m unhappy with the course?",
    answer:
      "You may qualify for a refund if you follow the course strategies exactly as shown and don’t achieve the promised results within 30 days. Please refer to our Refund Policy for full details.",
  },
  {
    question: "How can I get support?",
    answer:
      "Email us at info@redditgoldmine.com or hayk@redditgoldmine.com, or reach out via Telegram: https://t.me/+HnB3dnm_6rc1YzIy.",
  },
];

const FaqPage = () => {
  const [openQuestion, setOpenQuestion] = useState(null);

  return (
    <NeoPage>
    <SiteHeader />

      <main className="w-full py-12 md:py-24 px-6">
        <div className="container mx-auto max-w-4xl">
          <h1 className="text-5xl md:text-7xl font-display font-extrabold text-neo-black mb-12 g-fade-in">
            F.A.Q.
          </h1>

          <div className="card-neo p-0 g-fade-in">
            {faqItems.map((item) => {
              const isOpen = openQuestion === item.question;
              return (
                <div key={item.question} className={`faq-item ${isOpen ? "open" : ""}`}>
                  <button
                    type="button"
                    className="faq-question"
                    onClick={() => setOpenQuestion(isOpen ? null : item.question)}
                  >
                    <span>{item.question}</span>
                    <span className="faq-icon">{isOpen ? "−" : "+"}</span>
                  </button>
                  <div className="faq-answer">
                    <p>{item.answer}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>

      <NeoFooter />
    </NeoPage>
  );
};

export default FaqPage;

