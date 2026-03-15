import { useState, useEffect, useRef } from "react";
import { API_URL } from "../config";
import { Search, TrendingUp, Award, MessageSquare, FileText, Calendar, Zap, CheckCircle, AlertCircle, Info, Sparkles, Clock, ExternalLink, ThumbsUp, MessageCircle, Download, Share2, BarChart3 } from "lucide-react";
import gsap from "gsap";
import html2canvas from "html2canvas";
import RedditCharts from "./RedditCharts";

const RedditCalculator = () => {
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const resultRef = useRef(null);
  const [shareUrl, setShareUrl] = useState(null);

  // Get user's timezone offset
  const getUserTimezone = () => {
    return -new Date().getTimezoneOffset(); // Returns offset in minutes
  };

  // Sound effects
  const playSound = (type) => {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      if (type === 'success') {
        oscillator.frequency.value = 800;
        oscillator.type = 'sine';
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.3);
      }
    } catch (e) {
      // Sound not supported or blocked
    }
  };

  // Fetch avatar preview when username changes
  useEffect(() => {
    const fetchAvatarPreview = async () => {
      if (!username.trim() || username.trim().length < 3) {
        setAvatarPreview(null);
        return;
      }

      setPreviewLoading(true);
      try {
        // Use backend endpoint to avoid CORS issues
        const response = await fetch(`${API_URL}/api/reddit/avatar/${encodeURIComponent(username.trim().toLowerCase())}`);
        if (response.ok) {
          const data = await response.json();
          if (data?.avatar) {
            setAvatarPreview(data.avatar);
          } else {
            setAvatarPreview(null);
          }
        } else {
          setAvatarPreview(null);
        }
      } catch (err) {
        setAvatarPreview(null);
      } finally {
        setPreviewLoading(false);
      }
    };

    const debounceTimer = setTimeout(fetchAvatarPreview, 500);
    return () => clearTimeout(debounceTimer);
  }, [username]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const timezone = getUserTimezone();
      const response = await fetch(`${API_URL}/api/reddit/analyze/${encodeURIComponent(username.trim())}?timezone=${timezone}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to analyze user");
      }

      setResult(data);

      // Generate share URL
      const shareId = btoa(username.trim().toLowerCase()).replace(/[+/=]/g, '');
      setShareUrl(`${window.location.origin}/calculator?share=${shareId}`);

      // Play success sound
      playSound('success');

      // Animate result appearance with enhanced effects
      setTimeout(() => {
        gsap.fromTo(
          ".result-card",
          { opacity: 0, y: 50, scale: 0.95 },
          { 
            opacity: 1, 
            y: 0, 
            scale: 1,
            duration: 0.8, 
            stagger: 0.1, 
            ease: "power3.out",
            onComplete: () => {
              // Bounce effect on score
              gsap.to(".coolness-score", {
                scale: 1.1,
                duration: 0.3,
                yoyo: true,
                repeat: 1,
                ease: "power2.inOut"
              });
            }
          }
        );
      }, 100);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getRecommendationIcon = (type) => {
    switch (type) {
      case "success":
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case "warning":
        return <AlertCircle className="w-5 h-5 text-yellow-600" />;
      case "info":
      default:
        return <Info className="w-5 h-5 text-blue-600" />;
    }
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  // Export to PNG
  const handleExportPNG = async () => {
    if (!resultRef.current) return;
    
    try {
      const canvas = await html2canvas(resultRef.current, {
        backgroundColor: '#f5f5dc',
        scale: 2,
      });
      const url = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `reddit-analysis-${result.username}-${Date.now()}.png`;
      link.href = url;
      link.click();
      playSound('success');
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  // Copy share URL
  const handleShare = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      alert('Share URL copied to clipboard!');
      playSound('success');
    } catch (err) {
      console.error('Share failed:', err);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto">
      {/* Search Form */}
      <form onSubmit={handleSubmit} className="mb-12">
        <div className="card-neo p-8">
          <h2 className="text-4xl font-display font-bold text-neo-black mb-6 text-center">
            Reddit <span className="text-outline">Karma Calculator</span>
          </h2>
          <p className="text-center text-gray-700 mb-8 text-lg">
            Enter your Reddit username to discover how cool you are and get personalized recommendations
          </p>
          
          <div className="flex gap-4 max-w-2xl mx-auto items-center">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter Reddit username (without u/)"
                className="w-full pl-12 pr-4 py-4 text-lg border-4 border-neo-black bg-white focus:outline-none focus:ring-4 focus:ring-neo-main transition-all"
                disabled={loading}
              />
            </div>
            
            {/* Avatar Preview */}
            {(avatarPreview || previewLoading) && (
              <div className="flex-shrink-0 relative">
                {previewLoading ? (
                  <div className="w-16 h-16 border-4 border-neo-black bg-gray-200 animate-pulse rounded-full" />
                ) : avatarPreview ? (
                  <>
                    <img
                      src={avatarPreview}
                      alt="Avatar preview"
                      className="w-16 h-16 rounded-full border-4 border-neo-black object-cover"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        const fallback = e.target.nextElementSibling;
                        if (fallback) fallback.style.display = 'flex';
                      }}
                    />
                    <div 
                      className="w-16 h-16 rounded-full border-4 border-neo-black bg-neo-main/20 flex items-center justify-center hidden"
                    >
                      <span className="text-xl font-bold text-neo-black">
                        {username.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  </>
                ) : null}
              </div>
            )}
            
            <button
              type="submit"
              disabled={loading || !username.trim()}
              className="btn-neo-main px-8 py-4 text-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {loading ? "Analyzing..." : "Analyze"}
            </button>
          </div>
        </div>
      </form>

      {/* Error Message */}
      {error && (
        <div className="card-neo p-6 mb-8 border-4 border-red-500 bg-red-50">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-6 h-6 text-red-600" />
            <p className="text-red-800 font-bold">{error}</p>
          </div>
        </div>
      )}

      {/* Results */}
      {result && (
        <div ref={resultRef} className="space-y-8">
          {/* Export and Share Buttons */}
          <div className="flex gap-4 justify-end">
            <button
              onClick={handleExportPNG}
              className="btn-neo-main flex items-center gap-2"
            >
              <Download className="w-5 h-5" />
              Export PNG
            </button>
            {shareUrl && (
              <button
                onClick={handleShare}
                className="btn-neo-black flex items-center gap-2"
              >
                <Share2 className="w-5 h-5" />
                Share
              </button>
            )}
          </div>
          {/* Main Score Card */}
          <div className="result-card card-neo p-8 text-center">
            <div className="flex items-center justify-center gap-4 mb-6">
              {result.avatar ? (
                <img
                  src={result.avatar}
                  alt={result.username}
                  className="w-20 h-20 rounded-full border-4 border-neo-black object-cover"
                  onError={(e) => {
                    // Fallback if image fails to load
                    e.target.style.display = 'none';
                    const fallback = e.target.nextSibling;
                    if (fallback) fallback.style.display = 'flex';
                  }}
                />
              ) : null}
              <div 
                className={`w-20 h-20 rounded-full border-4 border-neo-black bg-neo-main/20 flex items-center justify-center ${result.avatar ? 'hidden' : 'flex'}`}
                style={{ display: result.avatar ? 'none' : 'flex' }}
              >
                <span className="text-3xl font-bold text-neo-black">
                  {result.username.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <h3 className="text-3xl font-display font-bold text-neo-black">
                  u/{result.username}
                </h3>
              </div>
            </div>

            <div className="mb-8">
              <div className="text-8xl font-heavy mb-4" style={{ color: result.levelColor }}>
                {result.levelEmoji}
              </div>
              <div className="text-4xl font-display font-bold mb-2" style={{ color: result.levelColor }}>
                {result.level}
              </div>
              <div className="text-6xl font-heavy text-neo-main mb-4 coolness-score">
                {result.coolnessScore}/100
              </div>
              <div className="w-full max-w-md mx-auto bg-gray-200 border-4 border-neo-black h-8 relative overflow-hidden">
                <div
                  className="h-full transition-all duration-1000 ease-out"
                  style={{
                    width: `${result.coolnessScore}%`,
                    backgroundColor: result.levelColor,
                  }}
                />
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="result-card card-neo p-6">
              <div className="flex items-center gap-3 mb-4">
                <TrendingUp className="w-8 h-8 text-neo-main" />
                <h4 className="text-xl font-bold text-neo-black">Total Karma</h4>
              </div>
              <div className="text-4xl font-heavy text-neo-main">
                {result.totalKarma.toLocaleString()}
              </div>
            </div>

            <div className="result-card card-neo p-6">
              <div className="flex items-center gap-3 mb-4">
                <FileText className="w-8 h-8 text-neo-main" />
                <h4 className="text-xl font-bold text-neo-black">Post Karma</h4>
              </div>
              <div className="text-4xl font-heavy text-neo-main">
                {result.postKarma.toLocaleString()}
              </div>
              <div className="text-sm text-gray-600 mt-2">
                {result.postKarmaRatio.toFixed(1)}% of total
              </div>
            </div>

            <div className="result-card card-neo p-6">
              <div className="flex items-center gap-3 mb-4">
                <MessageSquare className="w-8 h-8 text-neo-main" />
                <h4 className="text-xl font-bold text-neo-black">Comment Karma</h4>
              </div>
              <div className="text-4xl font-heavy text-neo-main">
                {result.commentKarma.toLocaleString()}
              </div>
              <div className="text-sm text-gray-600 mt-2">
                {result.commentKarmaRatio.toFixed(1)}% of total
              </div>
            </div>

            <div className="result-card card-neo p-6">
              <div className="flex items-center gap-3 mb-4">
                <Zap className="w-8 h-8 text-neo-main" />
                <h4 className="text-xl font-bold text-neo-black">Karma/Day</h4>
              </div>
              <div className="text-4xl font-heavy text-neo-main">
                {result.karmaPerDay.toFixed(1)}
              </div>
            </div>
          </div>

          {/* Additional Info */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="result-card card-neo p-6">
              <div className="flex items-center gap-3 mb-4">
                <Calendar className="w-8 h-8 text-neo-main" />
                <h4 className="text-xl font-bold text-neo-black">Account Age</h4>
              </div>
              <div className="text-2xl font-bold text-neo-black">
                {result.accountAgeFormatted}
              </div>
              <div className="text-sm text-gray-600 mt-2">
                {result.accountAge} days
              </div>
            </div>

            <div className="result-card card-neo p-6">
              <div className="flex items-center gap-3 mb-4">
                <Award className="w-8 h-8 text-neo-main" />
                <h4 className="text-xl font-bold text-neo-black">Status</h4>
              </div>
              <div className="space-y-2">
                {result.isGold && (
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-yellow-500" />
                    <span className="font-bold text-yellow-600">Reddit Gold</span>
                  </div>
                )}
                {result.isVerified && (
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-blue-500" />
                    <span className="font-bold text-blue-600">Verified</span>
                  </div>
                )}
                {result.hasVerifiedEmail && (
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span className="font-bold text-green-600">Email Verified</span>
                  </div>
                )}
                {!result.isGold && !result.isVerified && !result.hasVerifiedEmail && (
                  <span className="text-gray-600">Basic Status</span>
                )}
              </div>
            </div>
          </div>

          {/* Posting Time Analysis */}
          {result.postingTimeAnalysis && (
            <div className="result-card card-neo p-6">
              <h4 className="text-2xl font-display font-bold text-neo-black mb-6 flex items-center gap-2">
                <Clock className="w-6 h-6 text-neo-main" />
                Posting Time Analysis
              </h4>
              
              <div className="space-y-6">
                <div>
                  <p className="text-gray-700 mb-4">
                    <strong>Total Posts Analyzed:</strong> {result.postingTimeAnalysis.totalPosts}
                  </p>
                  
                  {result.postingTimeAnalysis.isPostingAtOptimalTime ? (
                    <div className="bg-green-50 border-4 border-green-500 p-4 mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        <span className="font-bold text-green-800">Good Posting Times!</span>
                      </div>
                      <p className="text-green-700">
                        {result.postingTimeAnalysis.recommendation}
                      </p>
                    </div>
                  ) : (
                    <div className="bg-yellow-50 border-4 border-yellow-500 p-4 mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertCircle className="w-5 h-5 text-yellow-600" />
                        <span className="font-bold text-yellow-800">Posting Time Optimization Needed</span>
                      </div>
                      <p className="text-yellow-700">
                        {result.postingTimeAnalysis.recommendation}
                      </p>
                    </div>
                  )}
                </div>

                {result.postingTimeAnalysis.mostActiveHours.length > 0 && (
                  <div>
                    <h5 className="font-bold text-neo-black mb-3">Your Most Active Posting Hours:</h5>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                      {result.postingTimeAnalysis.mostActiveHours.map((item, idx) => (
                        <div key={idx} className="bg-neo-main/10 border-2 border-neo-black p-3 text-center">
                          <div className="text-2xl font-bold text-neo-main">{item.hourFormatted}</div>
                          <div className="text-sm text-gray-600">{item.count} posts</div>
                          <div className="text-xs text-gray-500">{item.percentage}%</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {result.postingTimeAnalysis.bestPostingHours.length > 0 && (
                  <div>
                    <h5 className="font-bold text-neo-black mb-3">Your Best Performing Hours (by avg score):</h5>
                    <div className="grid grid-cols-3 gap-3">
                      {result.postingTimeAnalysis.bestPostingHours.map((item, idx) => (
                        <div key={idx} className="bg-neo-accent/20 border-2 border-neo-black p-3 text-center">
                          <div className="text-xl font-bold text-neo-main">{item.hourFormatted}</div>
                          <div className="text-sm text-gray-600">Avg: {item.avgScore} ⬆️</div>
                          <div className="text-xs text-gray-500">{item.count} posts</div>
                        </div>
                      ))}
                    </div>
                    <p className="text-sm text-gray-600 mt-3">
                      💡 <strong>Recommendation:</strong> Try posting more during these hours for better engagement!
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Charts Section */}
          {(result.karmaGrowthData || result.activityByDay) && (
            <div className="result-card card-neo p-6">
              <h4 className="text-2xl font-display font-bold text-neo-black mb-6 flex items-center gap-2">
                <BarChart3 className="w-6 h-6 text-neo-main" />
                Analytics & Visualizations
              </h4>
              <RedditCharts
                karmaGrowthData={result.karmaGrowthData}
                activityByDay={result.activityByDay}
                postKarma={result.postKarma}
                commentKarma={result.commentKarma}
                postingTimeAnalysis={result.postingTimeAnalysis}
              />
            </div>
          )}

          {/* Subreddit Analysis */}
          {result.subredditAnalysis && result.subredditAnalysis.topSubreddits.length > 0 && (
            <div className="result-card card-neo p-6">
              <h4 className="text-2xl font-display font-bold text-neo-black mb-6 flex items-center gap-2">
                <Award className="w-6 h-6 text-neo-main" />
                Top Subreddits Analysis
              </h4>
              <div className="space-y-4">
                <p className="text-gray-700 mb-4">
                  You're active in <strong>{result.subredditAnalysis.totalSubreddits}</strong> subreddits. Here are your top performers:
                </p>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {result.subredditAnalysis.topSubreddits.map((sub, idx) => (
                    <div key={idx} className="border-4 border-neo-black bg-white p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-neo-main">r/{sub.name}</span>
                        <span className="text-sm text-gray-600">#{idx + 1}</span>
                      </div>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Karma:</span>
                          <span className="font-bold">{sub.karma.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Posts:</span>
                          <span className="font-bold">{sub.posts}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Avg Score:</span>
                          <span className="font-bold">{sub.avgScore} ⬆️</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="bg-blue-50 border-4 border-blue-500 p-4 mt-4">
                  <p className="text-sm text-blue-800">
                    💡 <strong>Tip:</strong> Focus on subreddits where you get the highest average scores for better karma growth!
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Comments Analysis */}
          {result.commentsAnalysis && (
            <div className="result-card card-neo p-6">
              <h4 className="text-2xl font-display font-bold text-neo-black mb-6 flex items-center gap-2">
                <MessageSquare className="w-6 h-6 text-neo-main" />
                Comments Analysis
              </h4>
              <div className="space-y-6">
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="border-4 border-neo-black bg-white p-4 text-center">
                    <div className="text-3xl font-bold text-neo-main mb-2">
                      {result.commentsAnalysis.totalComments}
                    </div>
                    <div className="text-sm text-gray-600">Total Comments</div>
                  </div>
                  <div className="border-4 border-neo-black bg-white p-4 text-center">
                    <div className="text-3xl font-bold text-neo-main mb-2">
                      {result.commentsAnalysis.avgScore}
                    </div>
                    <div className="text-sm text-gray-600">Avg Score</div>
                  </div>
                  <div className="border-4 border-neo-black bg-white p-4 text-center">
                    <div className="text-3xl font-bold text-green-600 mb-2">
                      {result.commentsAnalysis.sentiment.positive}%
                    </div>
                    <div className="text-sm text-gray-600">Positive</div>
                  </div>
                </div>

                {/* Sentiment Chart */}
                <div>
                  <h5 className="font-bold text-neo-black mb-3">Comment Sentiment</h5>
                  <div className="flex gap-2 h-8">
                    <div
                      className="bg-green-500 border-2 border-neo-black flex items-center justify-center text-white font-bold text-sm"
                      style={{ width: `${result.commentsAnalysis.sentiment.positive}%` }}
                    >
                      {result.commentsAnalysis.sentiment.positive > 10 && `${result.commentsAnalysis.sentiment.positive}%`}
                    </div>
                    <div
                      className="bg-gray-400 border-2 border-neo-black flex items-center justify-center text-white font-bold text-sm"
                      style={{ width: `${result.commentsAnalysis.sentiment.neutral}%` }}
                    >
                      {result.commentsAnalysis.sentiment.neutral > 10 && `${result.commentsAnalysis.sentiment.neutral}%`}
                    </div>
                    <div
                      className="bg-red-500 border-2 border-neo-black flex items-center justify-center text-white font-bold text-sm"
                      style={{ width: `${result.commentsAnalysis.sentiment.negative}%` }}
                    >
                      {result.commentsAnalysis.sentiment.negative > 10 && `${result.commentsAnalysis.sentiment.negative}%`}
                    </div>
                  </div>
                  <div className="flex gap-4 mt-2 text-xs text-gray-600">
                    <span>🟢 Positive: {result.commentsAnalysis.sentiment.positive}%</span>
                    <span>⚪ Neutral: {result.commentsAnalysis.sentiment.neutral}%</span>
                    <span>🔴 Negative: {result.commentsAnalysis.sentiment.negative}%</span>
                  </div>
                </div>

                {/* Top Comments */}
                {result.commentsAnalysis.topComments.length > 0 && (
                  <div>
                    <h5 className="font-bold text-neo-black mb-3">Top Comments</h5>
                    <div className="space-y-3">
                      {result.commentsAnalysis.topComments.map((comment, idx) => (
                        <a
                          key={idx}
                          href={comment.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block border-4 border-neo-black bg-white p-4 hover:bg-neo-main/5 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <p className="text-sm text-gray-700 mb-2 line-clamp-2">
                                {comment.body}...
                              </p>
                              <div className="flex items-center gap-3 text-xs text-gray-600">
                                <span className="text-neo-main font-bold">r/{comment.subreddit}</span>
                                <span className="flex items-center gap-1">
                                  <ThumbsUp className="w-3 h-3" />
                                  {comment.score}
                                </span>
                              </div>
                            </div>
                            <ExternalLink className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Top Posts */}
          {result.topPosts && result.topPosts.length > 0 && (
            <div className="result-card card-neo p-6">
              <h4 className="text-2xl font-display font-bold text-neo-black mb-6 flex items-center gap-2">
                <Award className="w-6 h-6 text-neo-main" />
                Your Top Posts
              </h4>
              <div className="space-y-4">
                {result.topPosts.map((post, idx) => (
                  <a
                    key={idx}
                    href={post.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block border-4 border-neo-black bg-white p-4 hover:bg-neo-main/5 transition-colors"
                  >
                    <div className="flex gap-4">
                      {post.thumbnail && (
                        <img
                          src={post.thumbnail}
                          alt={post.title}
                          className="w-20 h-20 object-cover border-2 border-neo-black flex-shrink-0"
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                      )}
                      <div className="flex-1">
                        <h5 className="font-bold text-neo-black mb-2 line-clamp-2">{post.title}</h5>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <span className="flex items-center gap-1">
                            <ThumbsUp className="w-4 h-4" />
                            {post.score.toLocaleString()}
                          </span>
                          <span className="flex items-center gap-1">
                            <MessageCircle className="w-4 h-4" />
                            {post.numComments.toLocaleString()}
                          </span>
                          <span className="text-neo-main font-bold">r/{post.subreddit}</span>
                          <span className="text-gray-500">{formatDate(post.createdUtc)}</span>
                        </div>
                      </div>
                      <ExternalLink className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Strengths */}
          {result.strengths && result.strengths.length > 0 && (
            <div className="result-card card-neo p-6">
              <h4 className="text-2xl font-display font-bold text-neo-black mb-4 flex items-center gap-2">
                <Award className="w-6 h-6 text-neo-main" />
                Your Strengths
              </h4>
              <div className="flex flex-wrap gap-3">
                {result.strengths.map((strength, idx) => (
                  <span
                    key={idx}
                    className="bg-neo-main text-white font-bold py-2 px-4 border-2 border-neo-black"
                  >
                    {strength}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Recommendations */}
          {result.recommendations && result.recommendations.length > 0 && (
            <div className="result-card card-neo p-6">
              <h4 className="text-2xl font-display font-bold text-neo-black mb-6 flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-neo-main" />
                Personalized Recommendations
              </h4>
              <div className="space-y-4">
                {result.recommendations.map((rec, idx) => (
                  <div
                    key={idx}
                    className={`p-4 border-4 border-neo-black ${
                      rec.type === "success"
                        ? "bg-green-50"
                        : rec.type === "warning"
                        ? "bg-yellow-50"
                        : "bg-blue-50"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {getRecommendationIcon(rec.type)}
                      <div className="flex-1">
                        <h5 className="font-bold text-neo-black mb-1">{rec.title}</h5>
                        <p className="text-gray-700 mb-2">{rec.message}</p>
                        <p className="text-sm font-bold text-neo-main">💡 {rec.action}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RedditCalculator;
