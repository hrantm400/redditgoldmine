import { useState, useEffect } from "react";
import { X, Gift } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import { API_URL } from "../config";

const PROMO_COURSE_ID = "promo-bundle";
const PROMO_LINK = "https://destream.net/t/RedditGoldMine/NvYJvfgK"; // Replace when ready

const PromoModal = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [showEmailWarning, setShowEmailWarning] = useState(false);
  const [paymentInitiated, setPaymentInitiated] = useState(false);
  const [accessRequested, setAccessRequested] = useState(false);
  const [requestingAccess, setRequestingAccess] = useState(false);
  const [requestMessage, setRequestMessage] = useState("");
  
  const { user, getIdToken } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  useEffect(() => {
    // Restore payment flags if user is logged in
    if (user?.email) {
      try {
        const emailKey = user.email.toLowerCase();
        setPaymentInitiated(localStorage.getItem(`promo_payment_initiated_${emailKey}`) === "true");
        setAccessRequested(localStorage.getItem(`promo_access_requested_${emailKey}`) === "true");
      } catch (e) {
        // ignore
      }
    }
  }, [user]);

  useEffect(() => {
    // Listen for custom event from PromoBanner
    const handleOpenPromo = () => setIsOpen(true);
    window.addEventListener("open-promo-modal", handleOpenPromo);
    return () => window.removeEventListener("open-promo-modal", handleOpenPromo);
  }, []);

  useEffect(() => {
    // Scheduling Logic: First visit, 1hr, 3hr, 12hr
    const schedule = [
      0, // Right away (few secs delay)
      60 * 60 * 1000, // 1 hour
      3 * 60 * 60 * 1000, // 3 hours
      12 * 60 * 60 * 1000 // 12 hours
    ];

    try {
      let currentStage = parseInt(localStorage.getItem("promo_stage") || "0", 10);
      let nextShowTime = parseInt(localStorage.getItem("promo_next_show") || "0", 10);
      
      const now = Date.now();

      if (currentStage >= schedule.length) {
        // Reset the cycle — start over from stage 0
        localStorage.setItem("promo_stage", "0");
        localStorage.removeItem("promo_next_show");
        currentStage = 0;
        nextShowTime = 0;
      }

      if (currentStage === 0) {
        // First visit
        const timer = setTimeout(() => {
          setIsOpen(true);
          localStorage.setItem("promo_stage", "1");
          localStorage.setItem("promo_next_show", (Date.now() + schedule[1]).toString());
        }, 3000);
        return () => clearTimeout(timer);
      } else {
        // Subsequent visits
        if (now >= nextShowTime) {
          // Time to show!
          const timer = setTimeout(() => {
            setIsOpen(true);
            const nextStage = currentStage + 1;
            localStorage.setItem("promo_stage", nextStage.toString());
            if (nextStage < schedule.length) {
              const delay = schedule[nextStage] - schedule[currentStage]; // Or just from now
              // Wait, the schedule is absolute delays from the PREVIOUS stage. 
              // To be simple, set the next show time to now + whatever the next schedule gap is.
              // Actually schedule is [0, 1h, 3h, 12h]. So stage 1 means wait 1h. stage 2 means wait 3h from now? Or 3h total?
              // Let's do delays from NOW. 
              const nextDelay = schedule[nextStage];
              localStorage.setItem("promo_next_show", (Date.now() + nextDelay).toString());
            }
          }, 1000);
          return () => clearTimeout(timer);
        } else {
          // Set a timeout to show it while they are on the page if the time arrives
          const timeUntilNext = nextShowTime - now;
          if (timeUntilNext < 24 * 60 * 60 * 1000) { // Only set timeout if it's within a reasonable timeframe
            const timer = setTimeout(() => {
               setIsOpen(true);
               const nextStage = currentStage + 1;
               localStorage.setItem("promo_stage", nextStage.toString());
               if (nextStage < schedule.length) {
                 localStorage.setItem("promo_next_show", (Date.now() + schedule[nextStage]).toString());
               }
            }, timeUntilNext);
            return () => clearTimeout(timer);
          }
        }
      }
    } catch (e) {
      // ignore localstorage errors
    }
  }, []);

  const handleBuyClick = (e) => {
    e.preventDefault();
    if (!user) {
      setIsOpen(false);
      navigate(`/login?redirect=${encodeURIComponent(location.pathname)}`);
      return;
    }
    setShowEmailWarning(true);
  };

  const handleGoToPayment = () => {
    setShowEmailWarning(false);
    try {
      const emailKey = user?.email?.toLowerCase();
      if (emailKey) {
        localStorage.setItem(`promo_payment_initiated_${emailKey}`, "true");
        setPaymentInitiated(true);
      }
    } catch (e) {
      // ignore
    }
    window.open(PROMO_LINK, "_blank", "noopener,noreferrer");
  };

  const handleRequestAccess = async () => {
    if (!user || requestingAccess) return;

    try {
      setRequestingAccess(true);
      setRequestMessage("");

      const token = await getIdToken();
      if (!token) {
        setRequestMessage("Authentication error. Please log out and log in again.");
        return;
      }

      const res = await fetch(`${API_URL}/api/payments/request-access`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ courseId: PROMO_COURSE_ID }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setAccessRequested(true);
        try {
          if (user?.email) {
            localStorage.setItem(`promo_access_requested_${user.email.toLowerCase()}`, "true");
          }
        } catch (e) {}
        setRequestMessage("Your request has been sent! We will activate your bundle access shortly.");
      } else {
        setRequestMessage(data?.message || "Something went wrong. Please contact live chat.");
      }
    } catch (error) {
      console.error("Error requesting access:", error);
      setRequestMessage("Network error. Please try again later.");
    } finally {
      setRequestingAccess(false);
    }
  };

  if (!isOpen && !showEmailWarning) return null;

  return (
    <>
      {/* Main Promo Modal */}
      {isOpen && !showEmailWarning && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-[100] px-4 backdrop-blur-sm p-4 sm:p-6 md:p-8 overflow-y-auto">
          <div 
            className="card-neo max-w-2xl w-full border-4 border-neo-black shadow-[12px_12px_0_0_#111] bg-white p-0 relative animate-[fadeInUp_0.4s_ease-out] flex flex-col my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-3 right-3 sm:top-4 sm:right-4 bg-white border-2 border-black hover:bg-gray-100 p-1 sm:p-2 z-10 transition-transform hover:scale-110 shadow-neo-sm"
            >
              <X className="w-5 h-5 sm:w-6 sm:h-6 text-black" />
            </button>

            <div className="bg-neo-main p-6 sm:p-8 flex flex-col items-center justify-center border-b-4 border-black relative overflow-hidden">
                <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "repeating-linear-gradient(45deg, #000 0, #000 2px, transparent 2px, transparent 10px)" }}></div>
                <Gift className="w-16 h-16 sm:w-20 sm:h-20 text-white mb-2 sm:mb-4 animate-bounce relative z-10" />
                <h2 className="text-3xl sm:text-5xl font-display font-extrabold text-black text-center relative z-10 bg-white px-4 py-2 border-4 border-black shadow-[4px_4px_0_0_#111] transform -rotate-2">
                  SPECIAL BUNDLE!
                </h2>
            </div>

            <div className="p-6 sm:p-10 bg-neo-bg">
              <div className="text-center mb-6 sm:mb-8">
                <h3 className="text-xl sm:text-2xl font-bold text-black mb-2 sm:mb-4">
                  Get <span className="font-heavy text-neo-main text-outline">BOTH</span> Premium Courses
                </h3>
                
                <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 my-6 text-xl sm:text-2xl font-heavy font-display">
                  <span className="text-gray-500 line-through decoration-black decoration-4 opacity-75">$247 + $27</span>
                  <span className="hidden sm:inline">➡️</span>
                  <span className="text-4xl sm:text-6xl text-neo-main drop-shadow-[2px_2px_0_#111] animate-pulse">ONLY $150</span>
                </div>

                <p className="text-base sm:text-lg text-gray-700 leading-relaxed px-2 sm:px-0">
                  Bundle <strong>Reddit Domination</strong> & <strong>Quora Gems</strong> together today and save <span className="font-bold underline">$124</span>. 
                  This is the ultimate traffic-driving toolkit!
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:gap-4 mt-6 sm:mt-8">
                {!paymentInitiated || accessRequested ? (
                  <button
                    onClick={handleBuyClick}
                    className="btn-neo bg-black text-white hover:bg-neo-main hover:text-black border-4 border-black text-lg sm:text-2xl py-3 sm:py-5 text-center transition-all shadow-[6px_6px_0_0_#fde047] hover:shadow-[2px_2px_0_0_#fde047] hover:translate-x-1 hover:translate-y-1 w-full"
                  >
                    YES, I WANT THE BUNDLE! 🔥
                  </button>
                ) : (
                  <div className="space-y-3">
                    <button
                      onClick={handleGoToPayment}
                      className="btn-neo bg-black text-white hover:bg-neo-main hover:text-black border-4 border-black text-lg py-3 text-center transition-all w-full"
                    >
                      Continue to Payment
                    </button>
                    <button
                      onClick={handleRequestAccess}
                      disabled={requestingAccess}
                      className="btn-neo bg-neo-main text-black border-4 border-black text-lg py-3 text-center transition-all w-full animate-pulse"
                    >
                      {requestingAccess ? "Sending request..." : "I already paid – request access"}
                    </button>
                    {requestMessage && (
                      <p className="text-sm font-bold text-center text-neo-black mt-2">{requestMessage}</p>
                    )}
                  </div>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-500 hover:text-black font-bold text-sm underline decoration-2 underline-offset-4 mt-2"
                >
                  No thanks, I'll pay full price later
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Email Warning Modal before Payment */}
      {showEmailWarning && (
        <div
          className="fixed inset-0 bg-black/75 flex items-center justify-center z-[110] px-4 backdrop-blur-sm p-4 sm:p-6 md:p-8 overflow-y-auto"
          onClick={() => setShowEmailWarning(false)}
        >
          <div 
            className="card-neo max-w-4xl w-full border-4 border-neo-main shadow-neo bg-white p-6 sm:p-12 animate-[fadeInUp_0.4s_ease-out] flex flex-col my-auto relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col md:flex-row items-center md:items-start gap-6 md:gap-10 mb-8">
              <img
                src="/images/payments/email-note.png"
                alt="Email note illustration"
                className="w-48 h-48 md:w-96 md:h-96 object-contain flex-shrink-0"
                onError={(e) => e.target.style.display = 'none'}
              />
              <div className="text-center md:text-left">
                <h2 className="text-3xl sm:text-4xl font-display font-extrabold text-neo-main mb-4 tracking-wide uppercase leading-tight">
                  Important before you pay
                </h2>
                <p className="text-gray-700 text-base sm:text-lg leading-relaxed">
                  On the deStream payment page, in the <span className="font-bold">“Nickname”</span> field,
                  you <span className="font-bold uppercase bg-yellow-200 px-1">must write your email</span> (the same email you used to sign up here).
                  Without this email we cannot match your payment and activate your bundle access.
                </p>
              </div>
            </div>
            <div className="mt-2 md:mt-6 flex flex-col sm:flex-row gap-4 w-full">
              <button
                type="button"
                className="btn-neo-main flex-1 text-base sm:text-lg py-3 sm:py-4"
                onClick={handleGoToPayment}
              >
                I understand – Go to payment
              </button>
              <button
                type="button"
                className="btn-neo-black flex-1 text-base sm:text-lg py-3 sm:py-4"
                onClick={() => setShowEmailWarning(false)}
              >
                Cancel
              </button>
            </div>
            <p className="mt-6 text-xs sm:text-sm text-gray-500 text-center max-w-2xl mx-auto">
              If you don't receive course access within <span className="font-bold">3 hours</span> after payment,
              please contact us via live chat.
            </p>
          </div>
        </div>
      )}
      
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}} />
    </>
  );
};

export default PromoModal;
