import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import NeoPage from "../components/NeoPage";
import NeoFooter from "../components/NeoFooter";
import SiteHeader from "../components/SiteHeader";
import { useAuth } from "../context/AuthContext";
import { API_URL } from "../config";

const moduleData = [
  {
    title: "Module 1: Master Multiple Account Creation & Management",
    description:
      "Learn the secrets to creating and managing multiple Reddit accounts like a pro—without raising any red flags. From proxies to multi-browser setups, this module shows you how to build niche-specific personas and effortlessly grow karma across multiple subreddits for maximum reach and profitability.",
    cta: true,
  },
  {
    title: "Module 2: Get Massive Traffic from Reddit",
    description:
      "Unlock the power of Reddit to drive massive traffic to your blog, YouTube, or TikTok channels. Learn how to craft engaging posts and comments that direct readers to your content, track performance with analytics, and optimize for even better results.",
  },
  {
    title: "Module 3: Create TikTok, YouTube, & Instagram Channels with Reddit Posts",
    description:
      "Turn Reddit's trending content into engaging TikTok videos, YouTube shorts, and Instagram reels. Learn how to automate content collection, repurpose posts into captivating videos, and grow your audience across short-form and long-form platforms.",
    cta: true,
  },
  {
    title: "Module 4: Start a Blog with Reddit Content",
    description:
      "Transform Reddit discussions into a powerful blog that drives traffic and builds authority. Discover how to find trending topics, create in-depth articles, and optimize for SEO using Reddit-based insights to establish another profitable income stream.",
  },
  {
    title: "Module 5: Selling PDFs: Setup, Ads & Organic Sales",
    description:
      "Create and sell niche-specific PDFs that people can't resist. Learn how to set up platforms like Gumroad, promote your PDFs organically on Reddit, and run low-cost ads to generate a steady stream of income with ease.",
    cta: true,
  },
  {
    title: "Module 6: Selling Affiliate Products",
    description:
      "Discover how to sell affiliate products effectively on Reddit by targeting the right niches and posting authentically. Learn to navigate Reddit's rules to recommend products seamlessly and drive consistent clicks and commissions.",
  },
  {
    title: "Module 7: Paid Community Memberships",
    description:
      "Turn Reddit's hot topics into exclusive, paid communities. Learn how to create memberships or Patreon subscriptions based on niche interests and market them effectively to attract loyal members who are eager to join.",
    cta: true,
  },
  {
    title: "Module 8: Cold DMs: Drippi Automation & Manual Outreach",
    description:
      "Master the art of cold DMs with automation tools like Drippi and proven manual techniques. Learn how to craft personalized messages, time your outreach perfectly, and connect with potential clients or partners for high-converting results without being spammy.",
  },
  {
    title: "Module 9: Subreddit Creation & Growth",
    description:
      "Build and grow your own thriving subreddit community from scratch. Learn how to post engaging content, foster active discussions, and turn your subreddit into a powerful hub for promoting your products, services, or content while establishing authority in your niche.",
  },
];

const DashboardPage = () => {
  const { user, getIdToken, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  // Access flags
  const [hasCourseAccess, setHasCourseAccess] = useState(false); // Reddit Domination
  const [hasFreeCourseAccess, setHasFreeCourseAccess] = useState(false); // Free course: The UPvote Effect
  const [checkingAccess, setCheckingAccess] = useState(false); // Start as false - will be set to true only if user is logged in
  const [courseData, setCourseData] = useState(null);
  const [showEmailWarning, setShowEmailWarning] = useState(false);
  const [requestingAccess, setRequestingAccess] = useState(false);
  const [requestMessage, setRequestMessage] = useState("");
  // Separate flags per course
  const [rdPaymentInitiated, setRdPaymentInitiated] = useState(false);
  const [rdAccessRequested, setRdAccessRequested] = useState(false);
  const [quoraPaymentInitiated, setQuoraPaymentInitiated] = useState(false);
  const [quoraAccessRequested, setQuoraAccessRequested] = useState(false);
  const [currentBuyUrl, setCurrentBuyUrl] = useState(
    "https://destream.net/t/RedditGoldMine/zLuJhEyD"
  );
  const [currentCourseId, setCurrentCourseId] = useState("reddit-domination");

  // Load course data (public endpoint - no auth required)
  useEffect(() => {
    const loadCourseData = async () => {
      try {
        const res = await fetch(`${API_URL}/api/courses/reddit-domination`);
        if (res.ok) {
          const course = await res.json();
          setCourseData(course);
        }
      } catch (error) {
        console.error("Error loading course data:", error);
      }
    };

    loadCourseData();
  }, []);

  // Restore per-user flags (payment started / access requested) for each course
  useEffect(() => {
    if (!user?.email) {
      setRdPaymentInitiated(false);
      setRdAccessRequested(false);
      setQuoraPaymentInitiated(false);
      setQuoraAccessRequested(false);
      return;
    }
    try {
      const emailKey = user.email.toLowerCase();
      const rdPayKey = `rd_payment_initiated_${emailKey}`;
      const rdAccessKey = `rd_access_requested_${emailKey}`;
      const quoraPayKey = `quora_payment_initiated_${emailKey}`;
      const quoraAccessKey = `quora_access_requested_${emailKey}`;

      setRdPaymentInitiated(localStorage.getItem(rdPayKey) === "true");
      setRdAccessRequested(localStorage.getItem(rdAccessKey) === "true");
      setQuoraPaymentInitiated(localStorage.getItem(quoraPayKey) === "true");
      setQuoraAccessRequested(localStorage.getItem(quoraAccessKey) === "true");
    } catch (e) {
      setRdPaymentInitiated(false);
      setRdAccessRequested(false);
      setQuoraPaymentInitiated(false);
      setQuoraAccessRequested(false);
    }
  }, [user?.email]);

  // Check if user has access to courses (only if logged in)
  useEffect(() => {
    const checkCourseAccess = async () => {
      if (!user) {
        // User is not logged in - no need to check access
        setHasCourseAccess(false);
        setHasFreeCourseAccess(false);
        setCheckingAccess(false);
        return;
      }

      // User is logged in - start checking access
      setCheckingAccess(true);
      
      try {
        const token = await getIdToken();
        if (!token) {
          setHasCourseAccess(false);
          setCheckingAccess(false);
          return;
        }

        const res = await fetch(`${API_URL}/api/user/courses`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
          const courses = await res.json();
          const hasRd = courses.some((course) => course.id === "reddit-domination");
          const hasFree = courses.some(
            (course) => course.id === "free-course-the-upvote-effect"
          );
          setHasCourseAccess(hasRd);
          setHasFreeCourseAccess(hasFree);
        } else {
          setHasCourseAccess(false);
          setHasFreeCourseAccess(false);
        }
      } catch (error) {
        console.error("Error checking course access:", error);
        setHasCourseAccess(false);
        setHasFreeCourseAccess(false);
      } finally {
        setCheckingAccess(false);
      }
    };

    checkCourseAccess();
  }, [user, getIdToken]);

  // Buy handler for Reddit Domination course
  const handleBuyClick = async (e) => {
    e.preventDefault();
    // If user is not logged in, redirect to login with return path
    if (!user) {
      navigate("/login?redirect=/dashboard");
      return;
    }
    // If course is free (price 0), grant access automatically without deStream
    if (courseData && Number(courseData.price) === 0) {
      try {
        const res = await fetch(`${API_URL}/api/payments/process`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userEmail: user.email,
            courseId: courseData.id || "reddit-domination",
            paymentId: `free-${courseData.id || "reddit-domination"}-${Date.now()}`,
            amount: 0,
          }),
        });

        const data = await res.json().catch(() => null);
        if (res.ok && data?.success) {
          setHasCourseAccess(true);
          setRequestMessage("");
          alert("You now have access to this free course! Check it in My Courses.");
        } else {
          alert(data?.message || "Failed to activate free course. Please contact support.");
        }
      } catch (error) {
        console.error("Error granting free course access:", error);
        alert("Network error while activating free course. Please try again later.");
      }
      return;
    }

    // If logged in and course is paid, show email warning modal
    setCurrentCourseId("reddit-domination");
    setCurrentBuyUrl("https://destream.net/t/RedditGoldMine/zLuJhEyD");
    setShowEmailWarning(true);
  };

  // Buy handler for Quora Gems course (always paid, separate deStream link)
  const handleQuoraBuyClick = (e) => {
    e.preventDefault();
    if (!user) {
      navigate("/login?redirect=/dashboard");
      return;
    }
    setCurrentCourseId("quora-gems");
    setCurrentBuyUrl("https://destream.net/t/RedditGoldMine/GMxEYSNR");
    setShowEmailWarning(true);
  };

  // Handler for grabbing free course (The UPvote Effect)
  const handleFreeCourseGrab = async (e) => {
    e.preventDefault();
    if (!user) {
      navigate("/login?redirect=/dashboard");
      return;
    }

    // If already has access, just send to My Courses
    if (hasFreeCourseAccess) {
      navigate("/my-courses");
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/payments/process`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userEmail: user.email,
          courseId: "free-course-the-upvote-effect",
          paymentId: `free-upvote-${Date.now()}`,
          amount: 0,
        }),
      });

      const data = await res.json().catch(() => null);
      if (res.ok && data?.success) {
        setHasFreeCourseAccess(true);
        alert(
          "You’ve successfully grabbed the free course! It is now available in your My Courses page."
        );
        navigate("/my-courses");
      } else {
        alert(
          data?.message ||
            "Failed to activate the free course. Please contact support via live chat."
        );
      }
    } catch (error) {
      console.error("Error granting free course access:", error);
      alert("Network error while activating free course. Please try again later.");
    }
  };

  const handleRequestAccess = async (courseId) => {
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
        body: JSON.stringify({ courseId }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        if (courseId === "reddit-domination") {
          setRdAccessRequested(true);
          try {
            if (user?.email) {
              const key = `rd_access_requested_${user.email.toLowerCase()}`;
              localStorage.setItem(key, "true");
            }
          } catch (e) {
            // ignore
          }
        } else if (courseId === "quora-gems") {
          setQuoraAccessRequested(true);
          try {
            if (user?.email) {
              const key = `quora_access_requested_${user.email.toLowerCase()}`;
              localStorage.setItem(key, "true");
            }
          } catch (e) {
            // ignore
          }
        }
        setRequestMessage(
          "Your request has been sent. We’ll review your payment and activate access as soon as possible."
        );
      } else {
        setRequestMessage(
          data?.message || "Something went wrong while sending your request. Please try again or contact us via live chat."
        );
      }
    } catch (error) {
      console.error("Error requesting access:", error);
      setRequestMessage("Network error while sending request. Please try again later.");
    } finally {
      setRequestingAccess(false);
    }
  };

  // Always render Dashboard - no authentication required
  return (
  <NeoPage>
    <SiteHeader />

    <main className="w-full py-12 md:py-24 px-6">
      {(!user || !hasCourseAccess) && (
        <a
          href="#buy-course-button"
          className="fixed right-8 top-1/2 -translate-y-1/2 z-50 hidden lg:flex flex-col items-center gap-2 cursor-pointer group hover:scale-110 transition-transform"
          onClick={(e) => {
            e.preventDefault();
            const element = document.getElementById("buy-course-button");
            if (element) {
              element.scrollIntoView({ behavior: "smooth", block: "center" });
            }
          }}
        >
          <div className="text-neo-black font-bold text-sm uppercase tracking-wider writing-vertical-rl rotate-180 group-hover:text-neo-main transition-colors">
            Buy
          </div>
          <div className="scroll-arrow-down">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-neo-main"
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </div>
        </a>
      )}
      <div className="container mx-auto">
        <h1 className="text-4xl sm:text-5xl md:text-7xl font-display font-extrabold text-neo-black mb-8 sm:mb-12 g-fade-in px-2 break-words">
          Your <span className="text-outline">Dashboard</span>
        </h1>

        <h2 className="text-2xl sm:text-3xl font-display font-bold text-neo-black mb-6 g-fade-in px-4">
          Your Enrolled Courses
        </h2>

        {/* Courses layout: paid courses on the left, free course on the right */}
        <div className="grid lg:grid-cols-[minmax(0,2.1fr)_minmax(0,1.1fr)] gap-10 items-start">
          {/* Left column: paid courses */}
          <div className="space-y-10">
            <div className="card-neo g-fade-in">
              <div className="grid md:grid-cols-3 gap-8">
                <div className="md:col-span-1 bg-neo-accent border-4 border-neo-black shadow-neo overflow-hidden p-0 flex items-center justify-center min-h-[260px]">
                  <img
                    src="/images/courses/reddit-domination-cover.webp"
                    alt="Reddit Domination Course Cover"
                    className="w-full h-full object-contain"
                    style={{ maxHeight: '100%', maxWidth: '100%' }}
                    onError={(e) => {
                      e.target.style.display = 'none';
                      const fallback = e.target.nextElementSibling;
                      if (fallback) fallback.style.display = 'flex';
                    }}
                  />
                </div>
                <div className="md:col-span-2">
                  <h3 className="text-3xl sm:text-4xl font-display font-extrabold text-neo-black mb-4">
                    Reddit Domination
                  </h3>
                  <p className="text-gray-700 text-lg mb-6">
                    Discover how top Redditors grow effortlessly! Learn insider strategies, smart subreddit picks, and The Redhack Method to gain 3,000+ karma in just 3 days.
                  </p>
                  <div className="flex items-end gap-4 mb-6">
                    <span className="text-5xl font-heavy text-neo-main">
                      ${courseData?.price || 247}
                    </span>
                    {courseData?.compareAt && (
                      <span className="text-3xl font-bold text-gray-500 line-through decoration-4">
                        ${courseData.compareAt}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col sm:flex-row gap-4 items-stretch">
                    <a href="#course-details" className="btn-neo-main text-lg">
                      View Full Course Details
                    </a>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <button
                        onClick={handleBuyClick}
                        className="btn-neo-black text-lg"
                        type="button"
                      >
                        Buy The Course
                      </button>
                      {rdPaymentInitiated && !rdAccessRequested &&
                        <button
                          type="button"
                          className="btn-neo-main text-sm px-4 py-3 sm:ml-2 animate-pulse"
                          onClick={() => handleRequestAccess("reddit-domination")}
                          disabled={requestingAccess}
                        >
                          {requestingAccess ? "Sending request..." : "I already paid – request access"}
                        </button>
                      }
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quora Gems course card */}
            <div className="card-neo g-fade-in">
              <div className="grid md:grid-cols-3 gap-8">
                <div className="md:col-span-1 bg-neo-accent border-4 border-neo-black shadow-neo overflow-hidden p-0 flex items-center justify-center min-h-[260px]">
                  <img
                    src="/images/courses/quora-gems-cover.webp"
                    alt="Quora Gems Course Cover"
                    className="w-full h-full object-contain"
                    style={{ maxHeight: "100%", maxWidth: "100%" }}
                    onError={(e) => {
                      e.target.style.display = "none";
                      const fallback = e.target.nextElementSibling;
                      if (fallback) fallback.style.display = "flex";
                    }}
                  />
                </div>
                <div className="md:col-span-2">
                  <h3 className="text-3xl sm:text-4xl font-display font-extrabold text-neo-black mb-4">
                    Quora Gems
                  </h3>
                  <p className="text-gray-700 text-lg mb-6">
                    Learn how to find and answer the most profitable Quora questions, turn your answers into evergreen traffic,
                    and funnel readers straight to your offers, channels, and landing pages.
                  </p>
                  <div className="flex items-end gap-4 mb-6">
                    <span className="text-5xl font-heavy text-neo-main">$27</span>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      onClick={handleQuoraBuyClick}
                      className="btn-neo-black text-lg"
                      type="button"
                    >
                      Buy The Course
                    </button>
                    {quoraPaymentInitiated && !quoraAccessRequested &&
                      <button
                        type="button"
                        className="btn-neo-main text-sm px-4 py-3 sm:ml-2 animate-pulse"
                        onClick={() => handleRequestAccess("quora-gems")}
                        disabled={requestingAccess}
                      >
                        {requestingAccess ? "Sending request..." : "I already paid – request access"}
                      </button>
                    }
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right column: free course */}
          <div className="card-neo g-fade-in">
            <div className="grid md:grid-cols-1 gap-6">
              <div className="bg-neo-accent border-4 border-neo-black shadow-neo overflow-hidden p-0 flex items-center justify-center min-h-[260px]">
                <img
                  src="/images/courses/upvote-effect-cover.webp"
                  alt="Free course The UPvote Effect Cover"
                  className="w-full h-full object-contain"
                  style={{ maxHeight: "100%", maxWidth: "100%" }}
                  onError={(e) => {
                    e.target.style.display = "none";
                  }}
                />
              </div>
              <div>
                <h3 className="text-3xl md:text-4xl font-display font-extrabold text-neo-black mb-3">
                  Free course The UPvote Effect
                </h3>
                <p className="text-gray-700 text-base md:text-lg mb-4 leading-relaxed">
                  A free mini-course that shows you how to create posts and comments that naturally
                  attract upvotes, without feeling spammy or salesy. Perfect as a warm-up before the
                  full <span className="font-semibold">Reddit Domination</span> system.
                </p>
                <div className="flex items-center gap-3 mb-5">
                  <span className="text-3xl md:text-4xl font-heavy text-neo-main font-display">
                    $0
                  </span>
                  <span className="text-xs md:text-sm uppercase tracking-[0.18em] font-heavy font-display text-neo-black bg-neo-accent px-4 py-1.5 border-2 border-neo-black shadow-neo">
                    FREE BONUS
                  </span>
                </div>
                <button
                  onClick={handleFreeCourseGrab}
                  className={`w-full text-lg px-8 py-3 border-4 border-neo-black shadow-neo font-display font-bold uppercase tracking-[0.18em] transition-transform ${
                    hasFreeCourseAccess
                      ? "bg-neo-black text-white opacity-75 cursor-not-allowed"
                      : "bg-neo-main text-neo-black hover:bg-neo-black hover:text-white hover:-translate-y-0.5 animate-pulse"
                  }`}
                  type="button"
                  disabled={hasFreeCourseAccess}
                >
                  {hasFreeCourseAccess ? "✓ Added to My Courses" : "Grab"}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="my-16 md:my-24 border-t-4 border-dashed border-neo-black g-fade-in" />

        <section id="course-details" className="container mx-auto max-w-4xl px-4 sm:px-0">
          <div className="text-center mb-16 g-fade-in">
            <h1 className="text-5xl sm:text-6xl md:text-8xl lg:text-9xl font-display font-extrabold text-neo-black mb-6 leading-tight sm:leading-none break-words px-2">
              Reddit <span className="text-outline text-neo-main block sm:inline">Empire</span> Builder
            </h1>
            <p className="text-lg sm:text-xl text-gray-700 max-w-3xl mx-auto">
              Ever wonder how savvy entrepreneurs turn Reddit into a cash machine? This course unveils the exact strategies for leveraging Reddit's massive audience to drive traffic, create content, and build multiple streams of income.
            </p>
          </div>


          <div className="space-y-6 sm:space-y-8">
            {moduleData.map((module) => (
              <div key={module.title} className="card-neo g-fade-in p-6 sm:p-8">
                <h2 className="text-2xl sm:text-3xl font-display font-bold text-neo-black mb-4">{module.title}</h2>
                <p className="text-gray-700 text-base sm:text-lg mb-6">{module.description}</p>
              </div>
            ))}
          </div>

          <div className="text-center mt-12 sm:mt-16 g-fade-in px-4">
            {user ? (
              // User is logged in - check access
              !checkingAccess && (
                <>
                  {hasCourseAccess ? (
                    <button
                      id="buy-course-button"
                      disabled
                      className="btn-neo-black text-xl sm:text-2xl py-4 sm:py-5 px-6 sm:px-10 inline-flex items-center gap-3 opacity-75 cursor-not-allowed w-full sm:w-auto justify-center"
                    >
                      ✓ Purchased
                    </button>
                  ) : (
                    <>
                      <button
                        id="buy-course-button"
                        onClick={handleBuyClick}
                        className="btn-neo-main text-xl sm:text-2xl py-4 sm:py-5 px-6 sm:px-10 inline-flex items-center gap-3 w-full sm:w-auto justify-center"
                      >
                        Buy The Course
                      </button>
                      <p className="mt-4 text-sm text-gray-600 max-w-md mx-auto">
                        Payments are processed via a secure deStream checkout page. You will be redirected to complete your purchase.
                      </p>
                      {rdPaymentInitiated && !rdAccessRequested && (
                        <div className="mt-6 space-y-2">
                          <button
                            type="button"
                            className="btn-neo-black text-sm px-6 py-3"
                            onClick={() => handleRequestAccess("reddit-domination")}
                            disabled={requestingAccess}
                          >
                            {requestingAccess ? "Sending request..." : "I already paid – request access"}
                          </button>
                          {requestMessage && (
                            <p className="text-xs text-gray-700 max-w-md mx-auto">
                              {requestMessage}
                            </p>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </>
              )
            ) : (
              // User is not logged in - show login button
              <>
                <button
                  id="buy-course-button"
                  onClick={handleBuyClick}
                  className="btn-neo-main text-2xl py-5 px-10 inline-flex items-center gap-3"
                >
                  Buy The Course
                </button>
                <p className="mt-4 text-sm text-gray-600 max-w-md mx-auto">
                  After logging in you will be redirected back here to complete your purchase on a secure deStream checkout page.
                </p>
              </>
            )}
          </div>
        </section>
      </div>
    </main>

    <NeoFooter />

    {/* Email requirement warning modal before redirecting to deStream */}
    {showEmailWarning && (
      <div
        className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            setShowEmailWarning(false);
          }
        }}
      >
        <div className="card-neo max-w-4xl w-full border-4 border-neo-main shadow-neo bg-white p-12">
          <div className="flex items-start gap-10 mb-8">
            <img
              src="/images/payments/email-note.png"
              alt="Email note illustration"
              className="w-96 h-96 object-contain flex-shrink-0"
            />
            <div>
              <h2 className="text-4xl font-display font-extrabold text-neo-main mb-4 tracking-wide uppercase">
                Important before you pay
              </h2>
              <p className="text-gray-700 text-base leading-relaxed">
                On the deStream payment page, in the <span className="font-bold">“Nickname”</span> field,
                you <span className="font-bold uppercase">must write your email</span> (the same email you used to sign up here).
                Without this email we cannot match your payment and activate your course access.
              </p>
            </div>
          </div>
          <div className="mt-6 flex flex-col sm:flex-row gap-4">
            <button
              type="button"
              className="btn-neo-main flex-1"
              onClick={() => {
                setShowEmailWarning(false);
                try {
                  const emailKey = user?.email?.toLowerCase();
                  if (emailKey) {
                    if (currentCourseId === "reddit-domination") {
                      localStorage.setItem(`rd_payment_initiated_${emailKey}`, "true");
                    } else if (currentCourseId === "quora-gems") {
                      localStorage.setItem(`quora_payment_initiated_${emailKey}`, "true");
                    }
                  }
                } catch (e) {
                  // ignore storage errors
                }
                if (currentCourseId === "reddit-domination") {
                  setRdPaymentInitiated(true);
                } else if (currentCourseId === "quora-gems") {
                  setQuoraPaymentInitiated(true);
                }
                const destUrl =
                  currentBuyUrl || "https://destream.net/t/RedditGoldMine/zLuJhEyD";
                // Открываем оплату в новой вкладке по явному клику пользователя
                window.open(destUrl, "_blank", "noopener,noreferrer");
              }}
            >
              I understand – Go to payment
            </button>
            <button
              type="button"
              className="btn-neo-black flex-1"
              onClick={() => setShowEmailWarning(false)}
            >
              Cancel
            </button>
          </div>
          <p className="mt-4 text-xs text-gray-600 text-center max-w-xl mx-auto">
            If you don&apos;t receive course access within <span className="font-bold">3 hours</span> after payment,
            please contact us via the live chat in the bottom right corner. Sometimes high workload can delay manual activation,
            but this happens only occasionally.
          </p>
        </div>
      </div>
    )}
  </NeoPage>
  );
};

export default DashboardPage;

