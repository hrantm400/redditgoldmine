import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import NeoPage from "../components/NeoPage";
import NeoFooter from "../components/NeoFooter";
import SiteHeader from "../components/SiteHeader";
import { useAuth } from "../context/AuthContext";
import { API_URL } from "../config";
import TopicCard from "../components/forum/TopicCard";
import ForumFilters from "../components/forum/ForumFilters";
import ForumSearch from "../components/forum/ForumSearch";
import { Plus, MessageSquare } from "lucide-react";
import gsap from "gsap";
import { useForumTopics } from "../hooks/useForumTopics";

const ForumPage = () => {
  const { user, getIdToken } = useAuth();
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [userLikes, setUserLikes] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [sortBy, setSortBy] = useState("newest");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState(null); // For search results (not real-time)

  // Use real-time listener for topics (when not searching)
  const { topics: realtimeTopics, loading: topicsLoading, error: topicsError } = useForumTopics(
    searchQuery ? null : selectedCategory, // Don't filter by category when searching
    searchQuery ? "newest" : sortBy,
    20
  );

  // Determine which topics to show (search results or real-time)
  const topics = searchQuery ? (searchResults || []) : realtimeTopics;
  const loading = searchQuery ? false : topicsLoading;

  // Load categories only once (they don't change often)
  useEffect(() => {
    loadCategories();
  }, []);

  // Load user likes when topics change (only for real-time topics, not search)
  useEffect(() => {
    if (!searchQuery && realtimeTopics.length > 0 && user) {
      loadUserLikes();
    }
  }, [realtimeTopics, user, searchQuery]);

  useEffect(() => {
    // Animate topic cards on load
    if (topics.length > 0) {
      gsap.fromTo(
        ".topic-card",
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 0.6, stagger: 0.1, ease: "power3.out" }
      );
    }
  }, [topics]);

  const loadCategories = async () => {
    // Check cache first (categories don't change often)
    const cacheKey = 'forum_categories_cache';
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        const { data, timestamp } = JSON.parse(cached);
        // Cache for 5 minutes
        if (Date.now() - timestamp < 5 * 60 * 1000) {
          setCategories(data);
          return;
        }
      } catch (e) {
        // Invalid cache, continue to fetch
      }
    }

    try {
      const response = await fetch(`${API_URL}/api/forum/categories`);
      if (response.ok) {
        const data = await response.json();
        setCategories(data);
        // Cache for 5 minutes
        localStorage.setItem(cacheKey, JSON.stringify({
          data,
          timestamp: Date.now()
        }));
      }
    } catch (error) {
      console.error("Error loading categories:", error);
    }
  };

  // Load user likes for topics (used with real-time listeners)
  const loadUserLikes = async () => {
    if (!user || realtimeTopics.length === 0) return;
    
    try {
      const token = await getIdToken();
      if (!token) return;

      const topicIds = realtimeTopics.map((t) => t.id);
      if (topicIds.length === 0) return;

      const response = await fetch(`${API_URL}/api/forum/likes/batch`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          targetType: "topic",
          targetIds: topicIds,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setUserLikes(data.likedIds || []);
      }
    } catch (error) {
      console.error("Error loading user likes:", error);
    }
  };

  // Debounce search to avoid too many requests
  const [searchTimeout, setSearchTimeout] = useState(null);

  const handleSearch = async (query) => {
    setSearchQuery(query);
    
    // Clear previous timeout
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    if (!query || query.trim().length < 2) {
      setSearchResults(null); // Clear search results, show real-time topics
      return;
    }

    // Debounce search by 500ms
    const timeout = setTimeout(async () => {
      try {
        const params = new URLSearchParams({
          q: query,
          sortBy: sortBy,
        });
        if (selectedCategory) {
          params.append("categoryId", selectedCategory);
        }

        const response = await fetch(`${API_URL}/api/forum/search?${params}`);
        if (response.ok) {
          const data = await response.json();
          setSearchResults(data.results || []);
        }
      } catch (error) {
        console.error("Error searching:", error);
      }
    }, 500);

    setSearchTimeout(timeout);
  };

  const handleCreateTopic = () => {
    if (!user) {
      navigate("/login");
      return;
    }
    navigate("/forum/create");
  };

  return (
    <NeoPage>
      <SiteHeader />
      <main className="min-h-screen bg-neo-bg py-8">
        <div className="container mx-auto px-6">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-5xl md:text-6xl font-display font-extrabold text-neo-black">
              Community <span className="text-outline text-neo-main">Forum</span>
            </h1>
            <button
              onClick={handleCreateTopic}
              className="btn-neo-main flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              New Topic
            </button>
          </div>

          <div className="grid lg:grid-cols-4 gap-6">
            {/* Sidebar */}
            <div className="lg:col-span-1">
              <div className="card-neo p-6 mb-6">
                <h3 className="text-xl font-display font-bold text-neo-black mb-4">
                  Categories
                </h3>
                <div className="space-y-2">
                  <button
                    onClick={() => setSelectedCategory(null)}
                    className={`w-full text-left p-2 rounded border-2 transition-all ${
                      !selectedCategory
                        ? "bg-neo-main text-white border-neo-black"
                        : "bg-white border-neo-black hover:bg-neo-main/10"
                    }`}
                  >
                    All Topics
                  </button>
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`w-full text-left p-2 rounded border-2 transition-all ${
                        selectedCategory === cat.id
                          ? "bg-neo-main text-white border-neo-black"
                          : "bg-white border-neo-black hover:bg-neo-main/10"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span>{cat.icon} {cat.name}</span>
                        <span className="text-sm opacity-75">{cat.topicCount || 0}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="lg:col-span-3">
              {/* Search */}
              <ForumSearch onSearch={handleSearch} />

              {/* Filters */}
              <ForumFilters
                sortBy={sortBy}
                onSortChange={setSortBy}
                selectedCategory={selectedCategory}
              />

              {/* Topics List */}
              {loading ? (
                <div className="card-neo p-12 text-center">
                  <div className="text-lg">Loading topics...</div>
                </div>
              ) : topics.length === 0 ? (
                <div className="card-neo p-12 text-center">
                  <MessageSquare className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-xl font-bold text-neo-black mb-2">No topics found</p>
                  <p className="text-gray-600 mb-4">
                    {searchQuery
                      ? "Try a different search query"
                      : "Be the first to start a discussion!"}
                  </p>
                  {!searchQuery && user && (
                    <button onClick={handleCreateTopic} className="btn-neo-main">
                      Create First Topic
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {topics.map((topic) => (
                    <TopicCard
                      key={topic.id}
                      topic={topic}
                      userLiked={userLikes.includes(topic.id)}
                      onLike={loadUserLikes}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      <NeoFooter />
    </NeoPage>
  );
};

export default ForumPage;

