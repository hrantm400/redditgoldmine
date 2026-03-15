import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Lock, PlayCircle } from "lucide-react";
import NeoPage from "../components/NeoPage";
import NeoFooter from "../components/NeoFooter";
import SiteHeader from "../components/SiteHeader";
import { useAuth } from "../context/AuthContext";
import { API_URL } from "../config";

// Helper: extract Wistia video ID from URL
const getWistiaVideoId = (url) => {
  if (!url) return null;
  const match = url.match(/medias\/([a-zA-Z0-9]+)/);
  return match ? match[1] : null;
};

// Helper: extract YouTube video ID from various URL formats
const getYouTubeVideoId = (url) => {
  if (!url) return null;

  // Short youtu.be link
  let match = url.match(/youtu\.be\/([a-zA-Z0-9_-]{6,})/);
  if (match) return match[1];

  // Regular youtube.com/watch?v=ID
  match = url.match(/[?&]v=([a-zA-Z0-9_-]{6,})/);
  if (match) return match[1];

  // Embed format youtube.com/embed/ID
  match = url.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{6,})/);
  if (match) return match[1];

  return null;
};

// Generic video embed: supports Wistia and YouTube URLs
const VideoEmbed = ({ url }) => {
  if (!url) {
    return (
      <div className="aspect-video bg-neo-black flex items-center justify-center">
        <p className="text-white font-heavy text-2xl">No video available</p>
      </div>
    );
  }

  const wistiaId = getWistiaVideoId(url);
  const youtubeId = getYouTubeVideoId(url);

  // Prefer Wistia if it matches, otherwise YouTube
  if (wistiaId) {
    return (
      <div className="aspect-video bg-neo-black">
        <iframe
          src={`https://fast.wistia.com/embed/iframe/${wistiaId}`}
          title="Wistia video player"
          allow="autoplay; fullscreen"
          allowFullScreen
          className="w-full h-full"
          style={{ border: "none" }}
        />
      </div>
    );
  }

  if (youtubeId) {
    return (
      <div className="aspect-video bg-neo-black">
        <iframe
          src={`https://www.youtube.com/embed/${youtubeId}`}
          title="YouTube video player"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          className="w-full h-full"
          style={{ border: "none" }}
        />
      </div>
    );
  }

  // Fallback: unknown URL format
  return (
    <div className="aspect-video bg-neo-black flex items-center justify-center">
      <p className="text-white font-heavy text-2xl">Video URL not supported</p>
    </div>
  );
};

const WatchCoursePage = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentModuleIndex, setCurrentModuleIndex] = useState(0);
  const [viewedModules, setViewedModules] = useState(new Set());

  // Load viewed modules from localStorage
  useEffect(() => {
    if (courseId && user?.uid) {
      try {
        const key = `viewed_modules_${courseId}_${user.uid}`;
        const saved = localStorage.getItem(key);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            setViewedModules(new Set(parsed));
          }
        }
      } catch (e) {
        console.error("Error loading viewed modules:", e);
      }
    }
  }, [courseId, user?.uid]);

  // Save viewed modules to localStorage
  useEffect(() => {
    if (courseId && user?.uid && viewedModules.size > 0) {
      try {
        const key = `viewed_modules_${courseId}_${user.uid}`;
        localStorage.setItem(key, JSON.stringify(Array.from(viewedModules)));
      } catch (e) {
        console.error("Error saving viewed modules:", e);
      }
    }
  }, [viewedModules, courseId, user?.uid]);

  // Load course data
  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      navigate("/login");
      return;
    }

    if (!courseId) {
      setLoading(false);
      setError("No course ID provided");
      return;
    }

    let cancelled = false;

    const loadCourse = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const res = await fetch(`${API_URL}/api/courses/${courseId}`, {
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (cancelled) return;

        if (res.ok) {
          const courseData = await res.json();
          setCourse(courseData);
        } else {
          setError(`Failed to load course: ${res.status} ${res.statusText}`);
        }
      } catch (err) {
        if (cancelled) return;
        
        if (err.name === 'AbortError') {
          setError("Request timeout - backend may not be running");
        } else {
          setError(`Error: ${err.message}`);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadCourse();

    return () => {
      cancelled = true;
    };
  }, [courseId, user, authLoading, navigate]);

  // Mark current module as viewed
  useEffect(() => {
    if (course?.modules && course.modules.length > 0 && currentModuleIndex >= 0) {
      const currentMod = course.modules[currentModuleIndex];
      if (currentMod) {
        const moduleId = currentMod.id !== undefined ? currentMod.id : currentModuleIndex;
        setViewedModules((prev) => {
          const newSet = new Set(prev);
          newSet.add(moduleId);
          return newSet;
        });
      }
    }
  }, [course, currentModuleIndex]);

  // Loading states
  if (authLoading) {
    return (
      <NeoPage>
        <SiteHeader />
        <main className="w-full py-24 flex justify-center text-lg font-heavy">
          Checking authentication...
        </main>
        <NeoFooter />
      </NeoPage>
    );
  }

  if (loading) {
    return (
      <NeoPage>
        <SiteHeader />
        <main className="w-full py-24 flex flex-col items-center gap-4 text-center">
          <p className="text-lg font-heavy">Loading course...</p>
          <p className="text-sm text-gray-600">
            If this takes too long, make sure the backend server is running on port 4000
          </p>
        </main>
        <NeoFooter />
      </NeoPage>
    );
  }

  if (error || !course) {
    return (
      <NeoPage>
        <SiteHeader />
        <main className="w-full py-24 flex flex-col items-center gap-4 text-center">
          <p className="text-2xl font-display">Course not found</p>
          {error && <p className="text-gray-600">{error}</p>}
          {!error && <p className="text-gray-600">The course may not exist or the backend server may not be running.</p>}
          <div className="flex gap-4 mt-4">
            <a href="/my-courses" className="btn-neo-main">
              Back to My Courses
            </a>
            <button
              onClick={() => window.location.reload()}
              className="btn-neo-black"
            >
              Retry
            </button>
          </div>
        </main>
        <NeoFooter />
      </NeoPage>
    );
  }

  const modules = course.modules || [];
  const currentModule = modules[currentModuleIndex] || null;

  const markModuleAsViewed = (index) => {
    if (modules[index]) {
      const module = modules[index];
      const moduleId = module.id !== undefined ? module.id : index;
      setViewedModules((prev) => {
        const newSet = new Set(prev);
        newSet.add(moduleId);
        return newSet;
      });
    }
  };

  const handleModuleClick = (index) => {
    if (index >= 0 && index < modules.length) {
      setCurrentModuleIndex(index);
      markModuleAsViewed(index);
    }
  };

  const handlePrevious = () => {
    if (currentModuleIndex > 0) {
      const newIndex = currentModuleIndex - 1;
      setCurrentModuleIndex(newIndex);
      markModuleAsViewed(newIndex);
    }
  };

  const handleNext = () => {
    if (currentModuleIndex < modules.length - 1) {
      const newIndex = currentModuleIndex + 1;
      setCurrentModuleIndex(newIndex);
      markModuleAsViewed(newIndex);
    }
  };

  return (
    <NeoPage>
      <SiteHeader />

      <main className="w-full py-12 md:py-24 px-6">
        <div className="container mx-auto">
          <h1 className="text-5xl md:text-7xl font-display font-extrabold text-neo-black mb-12 g-fade-in">
            Now Watching: <span className="text-outline">{course.title || "Course"}</span>
          </h1>

          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 g-fade-in">
              <div className="card-neo p-0">
                <h2 className="text-3xl font-display font-bold text-neo-black p-6 border-b-4 border-neo-black">
                  Course Lessons
                </h2>
                <nav className="flex flex-col">
                  {modules.length === 0 ? (
                    <div className="p-6 text-center text-gray-600">
                      No modules available yet
                    </div>
                  ) : (
                    modules.map((module, index) => {
                      const isActive = index === currentModuleIndex;
                      const moduleId = module.id !== undefined ? module.id : index;
                      const isViewed = viewedModules.has(moduleId);
                      const Icon = (isActive || isViewed) ? PlayCircle : Lock;
                      
                      return (
                        <button
                          key={`module-${index}-${moduleId}`}
                          onClick={() => handleModuleClick(index)}
                          className={`lesson-item ${isActive ? "active" : ""} text-left`}
                        >
                          <span className="flex items-center gap-3">
                            <Icon className="w-6 h-6 flex-shrink-0" />
                            {module.title || `Module ${index + 1}`}
                          </span>
                        </button>
                      );
                    })
                  )}
                </nav>
              </div>
            </div>

            <div className="lg:col-span-2 space-y-8">
              {currentModule ? (
                <>
                  <div className="card-neo p-0 overflow-hidden g-fade-in">
                    <VideoEmbed url={currentModule.wistiaUrl} />
                  </div>

                  <div className="card-neo g-fade-in">
                    <h2 className="text-4xl font-display font-bold text-neo-black mb-4">
                      {currentModule.title || "Module"}
                    </h2>
                    {currentModule.description && (
                      <p className="text-lg text-gray-700">{currentModule.description}</p>
                    )}
                  </div>
                </>
              ) : (
                <div className="card-neo g-fade-in text-center py-12">
                  <p className="text-2xl font-display font-bold text-neo-black mb-4">
                    No modules available
                  </p>
                  <p className="text-gray-600">
                    This course doesn't have any modules yet. Check back later!
                  </p>
                </div>
              )}

              <div className="flex justify-between g-fade-in">
                <button
                  className="btn-neo-black text-lg"
                  onClick={handlePrevious}
                  disabled={currentModuleIndex === 0}
                >
                  Previous
                </button>
                <button
                  className="btn-neo-main text-lg"
                  onClick={handleNext}
                  disabled={currentModuleIndex >= modules.length - 1}
                >
                  Next Lesson
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      <NeoFooter />
    </NeoPage>
  );
};

export default WatchCoursePage;
