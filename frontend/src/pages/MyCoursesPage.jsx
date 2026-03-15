import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import NeoPage from "../components/NeoPage";
import CourseCard from "../components/CourseCard";
import NeoFooter from "../components/NeoFooter";
import SiteHeader from "../components/SiteHeader";
import { useAuth } from "../context/AuthContext";
import { API_URL } from "../config";

const MyCoursesPage = () => {
  const { user, loading: authLoading, getIdToken } = useAuth();
  const navigate = useNavigate();
  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      navigate("/login");
      return;
    }

    const loadCourses = async () => {
      try {
        const token = await getIdToken();
        if (!token) {
          setLoading(false);
          return;
        }

        const res = await fetch(`${API_URL}/api/user/courses`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
          const coursesData = await res.json();
          
          // Calculate progress for each course based on viewed modules
          const coursesWithProgress = await Promise.all(
            coursesData.map(async (course) => {
              try {
                // Load full course details to get modules
                const fullCourseRes = await fetch(`${API_URL}/api/courses/${course.id}`);
                if (fullCourseRes.ok) {
                  const fullCourse = await fullCourseRes.json();
                  const totalModules = fullCourse.modules?.length || 0;
                  
                  if (totalModules === 0) {
                    return { ...course, progress: 0 };
                  }
                  
                  // Get viewed modules from localStorage
                  const key = `viewed_modules_${course.id}_${user.uid}`;
                  const saved = localStorage.getItem(key);
                  let viewedModules = new Set();
                  if (saved) {
                    try {
                      const parsed = JSON.parse(saved);
                      if (Array.isArray(parsed)) {
                        viewedModules = new Set(parsed);
                      }
                    } catch (e) {
                      console.error("Error parsing viewed modules:", e);
                    }
                  }
                  
                  // Calculate progress: viewed modules / total modules
                  const progress = viewedModules.size / totalModules;
                  
                  return { ...course, progress };
                }
                return course;
              } catch (error) {
                console.error(`Error loading full course details for ${course.id}:`, error);
                return course;
              }
            })
          );
          
          setEnrolledCourses(coursesWithProgress);
        } else {
          console.error("Failed to load courses");
        }
      } catch (error) {
        console.error("Error loading courses:", error);
      } finally {
        setLoading(false);
      }
    };

    loadCourses();
  }, [user, authLoading, getIdToken, navigate]);

  if (authLoading || loading) {
    return (
      <NeoPage>
        <SiteHeader />
        <main className="w-full py-24 flex justify-center text-lg font-heavy">Loading...</main>
        <NeoFooter />
      </NeoPage>
    );
  }

  return (
    <NeoPage>
      <SiteHeader />

      <main className="w-full py-12 md:py-24 px-6">
        <div className="container mx-auto space-y-12">
          <div className="space-y-4 text-center">
            <p className="text-xs font-heavy uppercase tracking-[0.4em] text-neo-main">Learning hub</p>
            <h1 className="text-5xl md:text-7xl font-display font-extrabold text-neo-black">
              Your personal <span className="text-outline">course vault</span>
            </h1>
            <p className="text-xl text-gray-700 max-w-3xl mx-auto">
              Pick up right where you left off. Each track below shows your progress, the next recommended module, and a fast link back into the player.
            </p>
          </div>

          {enrolledCourses.length === 0 ? (
            <div className="card-neo text-center py-12">
              <p className="text-2xl font-display font-bold text-neo-black mb-4">You don't have access to any courses yet</p>
              <p className="text-gray-600 mb-6">Contact the administrator to get access.</p>
              <a href="/" className="btn-neo-main">
                Return to Home
              </a>
            </div>
          ) : (
            <div className="space-y-6">
              {enrolledCourses.map((course) => (
                <CourseCard key={course.id} course={course} />
              ))}
            </div>
          )}
      </div>
    </main>

    <NeoFooter />
  </NeoPage>
  );
};

export default MyCoursesPage;

