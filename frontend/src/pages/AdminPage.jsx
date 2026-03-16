import { useState, useEffect } from "react";
import NeoPage from "../components/NeoPage";
import NeoFooter from "../components/NeoFooter";
import SiteHeader from "../components/SiteHeader";
import { useAuth } from "../context/AuthContext";
import { API_URL } from "../config";
import ForumManagement from "../components/admin/ForumManagement";

const AdminPage = () => {
  const { user, loading, getIdToken } = useAuth();
  const [activeTab, setActiveTab] = useState("courses");
  const [isLessonEditor, setIsLessonEditor] = useState(false);
  const [allCourses, setAllCourses] = useState([]);
  const [users, setUsers] = useState(null); // null = loading, [] = empty, [users] = loaded
  const [grantEmail, setGrantEmail] = useState("");
  const [grantCourseId, setGrantCourseId] = useState("");
  const [grantStatus, setGrantStatus] = useState("");
  
  // Analytics states
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);
  
  // Payment requests states
  const [paymentRequests, setPaymentRequests] = useState([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  
  // Course management states
  const [courseName, setCourseName] = useState("");
  const [coursePrice, setCoursePrice] = useState("");
  const [editingCourse, setEditingCourse] = useState(null);
  const [courseStatus, setCourseStatus] = useState("");
  
  // Module management states
  const [moduleTitle, setModuleTitle] = useState("");
  const [moduleDescription, setModuleDescription] = useState("");
  const [moduleWistiaUrl, setModuleWistiaUrl] = useState("");
  const [editingModuleId, setEditingModuleId] = useState(null);

  if (loading) {
    return (
      <NeoPage>
        <SiteHeader hideCta />
        <div className="w-full py-24 flex justify-center text-lg font-heavy">Loading...</div>
        <NeoFooter />
      </NeoPage>
    );
  }

  if (!user) {
    return (
      <NeoPage>
        <SiteHeader hideCta />
        <div className="w-full py-24 flex flex-col items-center gap-4 text-center">
          <p className="text-2xl font-display">Login Required</p>
          <p className="text-gray-600">Please sign in with Google to check access.</p>
          <a href="/login" className="btn-neo-main">
            Go to Login
          </a>
        </div>
        <NeoFooter />
      </NeoPage>
    );
  }

  // Check if user is admin - this should match backend ADMIN_EMAILS configuration
  // For now, we'll check via API or use environment variable
  // In production, this should be checked server-side only
  const adminEmails = (import.meta.env.VITE_ADMIN_EMAILS || "0hrmelk@gmail.com")
    .split(",")
    .map((e) => e.trim().toLowerCase());
  const isAdmin = user.email && adminEmails.includes(user.email.toLowerCase());

  const loadCourses = async () => {
    try {
      const coursesRes = await fetch(`${API_URL}/api/courses`);
      if (coursesRes.ok) {
        const coursesData = await coursesRes.json();
        setAllCourses(coursesData);
        if (coursesData.length > 0 && !grantCourseId) {
          setGrantCourseId(coursesData[0].id);
        }
      }
    } catch (error) {
      console.error("Error loading courses:", error);
    }
  };

  const loadUsers = async () => {
    try {
      const token = await getIdToken();
      if (!token) {
        console.error("No token available");
        setUsers([]);
        return;
      }

      console.log(`Fetching users from ${API_URL}/api/admin/all-users`);
      const usersRes = await fetch(`${API_URL}/api/admin/all-users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log("Users response status:", usersRes.status);
      
      if (usersRes.ok) {
        const usersData = await usersRes.json();
        console.log("Loaded users:", usersData.length, usersData);
        setUsers(usersData);
      } else {
        const errorText = await usersRes.text();
        console.error("Failed to load users:", usersRes.status, errorText);
        try {
          const errorData = JSON.parse(errorText);
          console.error("Error message:", errorData.message);
        } catch (e) {
          console.error("Could not parse error response");
        }
        setUsers([]);
      }
    } catch (error) {
      console.error("Error loading users:", error);
      setUsers([]);
    }
  };

  const loadStats = async () => {
    try {
      setStatsLoading(true);
      const token = await getIdToken();
      if (!token) return;
      const res = await fetch(`${API_URL}/api/admin/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats);
      }
    } catch (error) {
      console.error("Error loading stats:", error);
    } finally {
      setStatsLoading(false);
    }
  };

  const loadPaymentRequests = async () => {
    try {
      setRequestsLoading(true);
      const token = await getIdToken();
      if (!token) return;
      const res = await fetch(`${API_URL}/api/admin/payment-requests`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setPaymentRequests(data.requests || []);
      }
    } catch (error) {
      console.error("Error loading payment requests:", error);
    } finally {
      setRequestsLoading(false);
    }
  };

  useEffect(() => {
    if (!isAdmin) {
      console.log("Not admin, skipping data load");
      return;
    }

    const loadData = async () => {
      try {
        console.log("Loading admin data...");
        const token = await getIdToken();
        if (!token) {
          console.error("No token available");
          return;
        }
        console.log("Token obtained, loading courses and users...");

        // Load courses
        await loadCourses();

        // Load all registered users from Firebase
        await loadUsers();
        
        // Load stats
        await loadStats();
        
        // Load payment requests
        await loadPaymentRequests();
      } catch (error) {
        console.error("Error loading admin data:", error);
        setUsers([]);
      }
    };

    loadData();
  }, [isAdmin, getIdToken]);

  const handleCreateCourse = async (e) => {
    e.preventDefault();
    if (!courseName || !coursePrice) {
      setCourseStatus("Fill in course name and price");
      return;
    }

    try {
      const token = await getIdToken();
      if (!token) {
        setCourseStatus("Error: Failed to get token");
        return;
      }

      const res = await fetch(`${API_URL}/api/admin/courses`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: courseName,
          price: coursePrice,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setCourseStatus("✅ Course created successfully!");
        setCourseName("");
        setCoursePrice("");
        await loadCourses();
      } else {
        setCourseStatus(`❌ ${data.message || "Error"}`);
      }
    } catch (error) {
      setCourseStatus(`❌ Error: ${error.message}`);
    }
  };

  const handleDeleteCourse = async (courseId) => {
    if (!confirm("Are you sure you want to delete this course?")) return;

    try {
      const token = await getIdToken();
      if (!token) return;

      const res = await fetch(`${API_URL}/api/admin/courses/${courseId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        await loadCourses();
        setCourseStatus("✅ Course deleted successfully!");
      } else {
        const data = await res.json();
        setCourseStatus(`❌ ${data.message || "Error"}`);
      }
    } catch (error) {
      setCourseStatus(`❌ Error: ${error.message}`);
    }
  };

  const handleEditCourse = (course) => {
    setEditingCourse(course);
    setCourseName(course.title);
    setCoursePrice(course.price);
    setIsLessonEditor(true);
  };

  const handleUpdateCourse = async (e) => {
    e.preventDefault();
    if (!editingCourse || !courseName || !coursePrice) {
      setCourseStatus("Fill in all fields");
      return;
    }

    try {
      const token = await getIdToken();
      if (!token) {
        setCourseStatus("Error: Failed to get token");
        return;
      }

      const res = await fetch(`${API_URL}/api/admin/courses/${editingCourse.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: courseName,
          price: coursePrice,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setCourseStatus("✅ Course updated successfully!");
        setEditingCourse(null);
        setCourseName("");
        setCoursePrice("");
        await loadCourses();
        setIsLessonEditor(false);
      } else {
        setCourseStatus(`❌ ${data.message || "Error"}`);
      }
    } catch (error) {
      setCourseStatus(`❌ Error: ${error.message}`);
    }
  };

  const handleAddModule = async (e) => {
    e.preventDefault();
    if (!editingCourse || !moduleTitle) {
      setCourseStatus("Fill in module title");
      return;
    }

    try {
      const token = await getIdToken();
      if (!token) {
        setCourseStatus("Error: Failed to get token");
        return;
      }

      if (!editingCourse || !editingCourse.id) {
        setCourseStatus("Error: Course ID is missing");
        return;
      }

      const url = editingModuleId
        ? `${API_URL}/api/admin/courses/${editingCourse.id}/modules/${editingModuleId}`
        : `${API_URL}/api/admin/courses/${editingCourse.id}/modules`;
      
      const method = editingModuleId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: moduleTitle,
          description: moduleDescription,
          wistiaUrl: moduleWistiaUrl,
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error("Error response:", res.status, errorText);
        try {
          const errorData = JSON.parse(errorText);
          setCourseStatus(`❌ ${errorData.message || "Error updating module"}`);
        } catch {
          setCourseStatus(`❌ Error: ${res.status} ${res.statusText}`);
        }
        return;
      }

      const data = await res.json();
      if (data.success) {
        setCourseStatus(editingModuleId ? "✅ Module updated successfully!" : "✅ Module added successfully!");
        setModuleTitle("");
        setModuleDescription("");
        setModuleWistiaUrl("");
        setEditingModuleId(null);
        
        // Reload the course to get updated modules
        try {
          const courseRes = await fetch(`${API_URL}/api/courses/${editingCourse.id}`);
          if (courseRes.ok) {
            const courseData = await courseRes.json();
            setEditingCourse(courseData);
          }
          // Also reload all courses list
          await loadCourses();
        } catch (error) {
          console.error("Error reloading course:", error);
          // Still show success, data is saved
        }
      } else {
        setCourseStatus(`❌ ${data.message || "Error saving module"}`);
      }
    } catch (error) {
      console.error("Error saving module:", error);
      setCourseStatus(`❌ Error: ${error.message}`);
    }
  };

  const handleEditModule = (module) => {
    setModuleTitle(module.title || "");
    setModuleDescription(module.description || "");
    setModuleWistiaUrl(module.wistiaUrl || "");
    setEditingModuleId(module.id);
  };

  const handleCancelEdit = () => {
    setModuleTitle("");
    setModuleDescription("");
    setModuleWistiaUrl("");
    setEditingModuleId(null);
    setCourseStatus("");
  };

  const handleDeleteModule = async (moduleId) => {
    if (!editingCourse) return;
    if (!confirm("Are you sure you want to delete this module?")) return;

    try {
      const token = await getIdToken();
      if (!token) return;

      const res = await fetch(`${API_URL}/api/admin/courses/${editingCourse.id}/modules/${moduleId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: "Unknown error" }));
        setCourseStatus(`❌ ${errorData.message || "Error deleting module"}`);
        return;
      }

      const data = await res.json();
      if (data.success) {
        setCourseStatus("✅ Module deleted successfully!");
        
        // Reload the course to get updated modules
        try {
          const courseRes = await fetch(`${API_URL}/api/courses/${editingCourse.id}`);
          if (courseRes.ok) {
            const courseData = await courseRes.json();
            setEditingCourse(courseData);
          }
          // Also reload all courses list
          await loadCourses();
        } catch (error) {
          console.error("Error reloading course:", error);
          // Still show success, data is saved
        }
      } else {
        setCourseStatus(`❌ ${data.message || "Error"}`);
      }
    } catch (error) {
      console.error("Error deleting module:", error);
      setCourseStatus(`❌ Error: ${error.message}`);
    }
  };

  const handleGrantAccess = async (e) => {
    e.preventDefault();
    if (!grantEmail || !grantCourseId) {
      setGrantStatus("Fill in all fields");
      return;
    }

    try {
      const token = await getIdToken();
      if (!token) {
        setGrantStatus("Error: Failed to get token");
        return;
      }

      const res = await fetch(`${API_URL}/api/admin/grant-access`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userEmail: grantEmail, courseId: grantCourseId }),
      });

      const data = await res.json();
      if (res.ok) {
        setGrantStatus(`✅ ${data.message}`);
        setGrantEmail("");
        // Refresh users list
        await loadUsers();
      } else {
        setGrantStatus(`❌ ${data.message || "Error"}`);
      }
    } catch (error) {
      setGrantStatus(`❌ Error: ${error.message}`);
    }
  };

  const handleRevokeAccess = async (userEmail, courseId) => {
    if (!confirm(`Are you sure you want to revoke access to this course from ${userEmail}?`)) {
      return;
    }

    try {
      const token = await getIdToken();
      if (!token) {
        setGrantStatus("Error: Failed to get token");
        return;
      }

      const res = await fetch(`${API_URL}/api/admin/revoke-access`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userEmail, courseId }),
      });

      const data = await res.json();
      if (res.ok) {
        setGrantStatus(`✅ ${data.message}`);
        // Refresh users list
        await loadUsers();
      } else {
        setGrantStatus(`❌ ${data.message || "Error"}`);
      }
    } catch (error) {
      setGrantStatus(`❌ Error: ${error.message}`);
    }
  };

  if (!isAdmin) {
    return (
      <NeoPage>
        <SiteHeader hideCta />
        <div className="w-full py-24 flex flex-col items-center gap-4 text-center">
          <p className="text-2xl font-display text-neo-main">Access Denied</p>
          <p className="text-gray-600 max-w-xl">
            This admin panel is only available to the owner. Sign in with an authorized Google account.
          </p>
        </div>
        <NeoFooter />
      </NeoPage>
    );
  }

  return (
    <NeoPage>
      <SiteHeader hideCta />
      <div className="bg-neo-black text-white py-2 border-b-4 border-neo-accent flex justify-center">
        <div className="flex items-center gap-3 text-sm font-mono">
          <span>Admin mode: {user.email}</span>
        </div>
      </div>
      <main className="w-full py-12 md:py-24 px-6">
        <div className="container mx-auto max-w-6xl">
          <h1 className="text-5xl md:text-7xl font-display font-extrabold text-neo-black mb-12">
            Admin <span className="text-outline">Panel</span>
          </h1>

          <div className="flex flex-wrap gap-3 mb-8">
            <button
              type="button"
              className={activeTab === "analytics" ? "btn-neo-main text-lg" : "btn-neo-black text-lg"}
              onClick={() => { setActiveTab("analytics"); loadStats(); }}
            >
              📊 Analytics
            </button>
            <button
              type="button"
              className={activeTab === "payments" ? "btn-neo-main text-lg" : "btn-neo-black text-lg"}
              onClick={() => { setActiveTab("payments"); loadPaymentRequests(); }}
            >
              💰 Payment Requests
            </button>
            <button
              type="button"
              className={activeTab === "courses" ? "btn-neo-main text-lg" : "btn-neo-black text-lg"}
              onClick={() => setActiveTab("courses")}
            >
              📚 Courses
            </button>
            <button
              type="button"
              className={activeTab === "users" ? "btn-neo-main text-lg" : "btn-neo-black text-lg"}
              onClick={() => setActiveTab("users")}
            >
              👥 Users
            </button>
            <button
              type="button"
              className={activeTab === "forum" ? "btn-neo-main text-lg" : "btn-neo-black text-lg"}
              onClick={() => setActiveTab("forum")}
            >
              💬 Forum
            </button>
          </div>

              {activeTab === "courses" && !isLessonEditor && (
                <>
                  <div className="card-neo mb-12">
                    <h2 className="text-3xl font-display font-bold text-neo-black mb-6">Create New Course</h2>
                    <form onSubmit={handleCreateCourse} className="space-y-6">
                      <div>
                        <label className="block text-lg font-heavy text-neo-black mb-2">Course Name</label>
                        <input
                          type="text"
                          className="input-neo"
                          placeholder="e.g., Reddit Empire Builder"
                          value={courseName}
                          onChange={(e) => setCourseName(e.target.value)}
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-lg font-heavy text-neo-black mb-2">Price ($)</label>
                        <input
                          type="number"
                          className="input-neo"
                          placeholder="e.g., 249"
                          value={coursePrice}
                          onChange={(e) => setCoursePrice(e.target.value)}
                          required
                          min="0"
                        />
                      </div>
                      {courseStatus && (
                        <p className={`text-lg font-bold ${courseStatus.startsWith("✅") ? "text-green-600" : "text-neo-main"}`}>
                          {courseStatus}
                        </p>
                      )}
                      <button type="submit" className="btn-neo-main text-lg inline-flex items-center gap-2">
                        Create Course
                      </button>
                    </form>
                  </div>

                  <h2 className="text-4xl font-display font-bold text-neo-black mb-6">Existing Courses</h2>
                  <div className="space-y-6">
                    {allCourses.length === 0 ? (
                      <div className="card-neo text-center py-8">
                        <p className="text-gray-600">No courses yet. Create your first course above.</p>
                      </div>
                    ) : (
                      allCourses.map((course) => (
                        <div key={course.id} className="card-neo flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                          <div>
                            <h3 className="text-3xl font-display font-bold">{course.title}</h3>
                            <p className="text-2xl font-heavy text-neo-main">${course.price}</p>
                            {course.subtitle && <p className="text-gray-600 mt-1">{course.subtitle}</p>}
                          </div>
                          <div className="flex-shrink-0 flex gap-3">
                            <button
                              className="btn-neo py-2 px-4 text-sm"
                              onClick={() => {
                                const fullCourse = allCourses.find((c) => c.id === course.id);
                                if (fullCourse) {
                                  fetch(`${API_URL}/api/courses/${course.id}`)
                                    .then((res) => res.json())
                                    .then((data) => {
                                      setEditingCourse(data);
                                      setIsLessonEditor(true);
                                    });
                                }
                              }}
                            >
                              Edit Lessons
                            </button>
                            <button
                              className="btn-neo-main py-2 px-4 text-sm bg-red-600"
                              onClick={() => handleDeleteCourse(course.id)}
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </>
              )}

              {activeTab === "courses" && isLessonEditor && editingCourse && (
                <div>
                  <button
                    className="btn-neo-black text-lg mb-6 inline-flex items-center gap-2"
                    onClick={() => {
                      setIsLessonEditor(false);
                      setEditingCourse(null);
                      setModuleTitle("");
                      setModuleDescription("");
                      setModuleWistiaUrl("");
                      setCourseStatus("");
                    }}
                  >
                    Back to Courses
                  </button>
                  <h2 className="text-4xl font-display font-bold text-neo-black mb-8">
                    Editing: <span className="text-neo-main">{editingCourse.title}</span>
                  </h2>

                  <div className="card-neo mb-12">
                    <h3 className="text-3xl font-display font-bold text-neo-black mb-6">
                      {editingModuleId ? "Edit Module" : "Add New Module"}
                    </h3>
                    <form onSubmit={handleAddModule} className="space-y-6">
                      <div>
                        <label className="block text-lg font-heavy text-neo-black mb-2">Module Title</label>
                        <input
                          type="text"
                          className="input-neo"
                          placeholder="e.g., Module 1: Account Setup"
                          value={moduleTitle}
                          onChange={(e) => setModuleTitle(e.target.value)}
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-lg font-heavy text-neo-black mb-2">Description</label>
                        <textarea
                          className="textarea-neo"
                          placeholder="What this module is about..."
                          value={moduleDescription}
                          onChange={(e) => setModuleDescription(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-lg font-heavy text-neo-black mb-2">Wistia Video Link</label>
                        <input
                          type="url"
                          className="input-neo"
                          placeholder="https://wistia.com/medias/..."
                          value={moduleWistiaUrl}
                          onChange={(e) => setModuleWistiaUrl(e.target.value)}
                        />
                        <p className="text-sm text-gray-600 mt-1">Enter the full Wistia video URL</p>
                      </div>
                      {courseStatus && (
                        <p className={`text-lg font-bold ${courseStatus.startsWith("✅") ? "text-green-600" : "text-neo-main"}`}>
                          {courseStatus}
                        </p>
                      )}
                      <div className="flex gap-4">
                        <button type="submit" className="btn-neo-main text-lg inline-flex items-center gap-2">
                          {editingModuleId ? "Update Module" : "Add Module"}
                        </button>
                        {editingModuleId && (
                          <button
                            type="button"
                            onClick={handleCancelEdit}
                            className="btn-neo-black text-lg"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </form>
                  </div>

                  <h3 className="text-3xl font-display font-bold text-neo-black mb-6">Existing Modules</h3>
                  <div className="space-y-4">
                    {editingCourse.modules && editingCourse.modules.length > 0 ? (
                      editingCourse.modules.map((module) => (
                        <div key={module.id} className="card-neo p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                          <div className="flex-grow">
                            <span className="text-xl font-bold block">{module.title}</span>
                            {module.description && <span className="text-gray-600 text-sm block mt-1">{module.description}</span>}
                            {module.wistiaUrl && (
                              <a
                                href={module.wistiaUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-neo-main text-sm font-bold mt-2 inline-block hover:underline"
                              >
                                📹 Watch Video →
                              </a>
                            )}
                          </div>
                          <div className="flex-shrink-0 flex gap-2">
                            <button
                              className="btn-neo py-2 px-3 text-sm"
                              onClick={() => handleEditModule(module)}
                            >
                              Edit
                            </button>
                            <button
                              className="btn-neo-main py-2 px-3 text-sm bg-red-600"
                              onClick={() => handleDeleteModule(module.id)}
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="card-neo text-center py-8">
                        <p className="text-gray-600">No modules yet. Add your first module above.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === "users" && (
                <div>
                  <div className="card-neo mb-12">
                    <h2 className="text-3xl font-display font-bold text-neo-black mb-6">Grant Course Access</h2>
                    <form onSubmit={handleGrantAccess} className="space-y-6">
                      <div>
                        <label className="block text-lg font-heavy text-neo-black mb-2">User Email</label>
                        <input
                          type="email"
                          className="input-neo"
                          placeholder="user@example.com"
                          value={grantEmail}
                          onChange={(e) => setGrantEmail(e.target.value)}
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-lg font-heavy text-neo-black mb-2">Course</label>
                        <select
                          className="input-neo"
                          value={grantCourseId}
                          onChange={(e) => setGrantCourseId(e.target.value)}
                          required
                        >
                          {allCourses.map((course) => (
                            <option key={course.id} value={course.id}>
                              {course.title}
                            </option>
                          ))}
                        </select>
                      </div>
                      {grantStatus && (
                        <p className={`text-lg font-bold ${grantStatus.startsWith("✅") ? "text-green-600" : "text-neo-main"}`}>
                          {grantStatus}
                        </p>
                      )}
                      <button type="submit" className="btn-neo-main text-lg inline-flex items-center gap-2">
                        Grant Access
                      </button>
                    </form>
                  </div>

                  <div className="card-neo">
                    <div className="flex justify-between items-center mb-6">
                      <h2 className="text-3xl font-display font-bold text-neo-black">All Registered Users</h2>
                      <button
                        onClick={loadUsers}
                        className="btn-neo text-sm"
                        title="Refresh users list"
                      >
                        🔄 Refresh
                      </button>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="table-neo w-full text-left">
                        <thead>
                          <tr>
                            <th>Email</th>
                            <th>Name</th>
                            <th>Registered</th>
                            <th>Courses (click ✕ to revoke)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {users === null ? (
                            <tr>
                              <td colSpan="4" className="text-center text-gray-600 py-4">
                                Loading users...
                              </td>
                            </tr>
                          ) : users.length === 0 ? (
                            <tr>
                              <td colSpan="4" className="text-center text-gray-600 py-4">
                                No registered users yet
                              </td>
                            </tr>
                          ) : (
                            users.map((u) => (
                              <tr key={u.uid || u.email}>
                                <td className="font-bold">{u.email}</td>
                                <td>{u.displayName || "—"}</td>
                                <td>{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "—"}</td>
                                <td>
                                  {u.courses && Array.isArray(u.courses) && u.courses.length > 0 ? (
                                    <div className="flex flex-col gap-2">
                                      {u.courses.map((course) => (
                                        <div key={course.id} className="flex items-center gap-2">
                                          <span className="text-sm">{course.title}</span>
                                          <button
                                            onClick={() => handleRevokeAccess(u.email, course.id)}
                                            className="btn-neo-main py-1 px-2 text-xs bg-red-600 hover:bg-red-700"
                                            title="Revoke access"
                                          >
                                            ✕
                                          </button>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <span className="text-gray-500">No access</span>
                                  )}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "forum" && <ForumManagement />}

              {activeTab === "analytics" && (
                <div>
                  <div className="flex justify-between items-center mb-8">
                    <h2 className="text-3xl font-display font-bold text-neo-black">📊 Site Analytics</h2>
                    <button onClick={loadStats} className="btn-neo text-sm">🔄 Refresh</button>
                  </div>
                  {statsLoading ? (
                    <div className="card-neo text-center py-8">
                      <p className="text-gray-600 text-lg">Loading stats...</p>
                    </div>
                  ) : stats ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mb-8">
                      <div className="card-neo text-center">
                        <div className="text-5xl font-heavy text-neo-main">{stats.totalUsers}</div>
                        <div className="text-lg font-bold text-neo-black mt-2">Total Users</div>
                      </div>
                      <div className="card-neo text-center">
                        <div className="text-5xl font-heavy text-neo-main">{stats.recentSignups}</div>
                        <div className="text-lg font-bold text-neo-black mt-2">Signups (7 days)</div>
                      </div>
                      <div className="card-neo text-center">
                        <div className="text-5xl font-heavy text-neo-main">{stats.totalCourses}</div>
                        <div className="text-lg font-bold text-neo-black mt-2">Total Courses</div>
                      </div>
                      <div className="card-neo text-center">
                        <div className="text-5xl font-heavy text-neo-main">{stats.usersWithAccess}</div>
                        <div className="text-lg font-bold text-neo-black mt-2">Users with Access</div>
                      </div>
                      <div className="card-neo text-center">
                        <div className="text-5xl font-heavy text-neo-main">{stats.totalAccessGrants}</div>
                        <div className="text-lg font-bold text-neo-black mt-2">Total Access Grants</div>
                      </div>
                      <div className="card-neo text-center border-neo-main">
                        <div className="text-5xl font-heavy text-red-600 animate-pulse">{stats.pendingRequests}</div>
                        <div className="text-lg font-bold text-neo-black mt-2">Pending Payments</div>
                      </div>
                    </div>
                  ) : (
                    <div className="card-neo text-center py-8">
                      <p className="text-gray-600">Could not load stats. Click Refresh.</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === "payments" && (
                <div>
                  <div className="flex justify-between items-center mb-8">
                    <h2 className="text-3xl font-display font-bold text-neo-black">💰 Payment Access Requests</h2>
                    <button onClick={loadPaymentRequests} className="btn-neo text-sm">🔄 Refresh</button>
                  </div>
                  {requestsLoading ? (
                    <div className="card-neo text-center py-8">
                      <p className="text-gray-600 text-lg">Loading requests...</p>
                    </div>
                  ) : paymentRequests.length === 0 ? (
                    <div className="card-neo text-center py-8">
                      <p className="text-gray-600 text-lg">No payment requests yet. They will appear here when users click "I already paid – request access".</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {paymentRequests.map((req) => (
                        <div key={req.id} className={`card-neo flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center ${!req.read ? 'border-neo-main border-4' : ''}`}>
                          <div className="flex-grow">
                            <div className="flex items-center gap-2 mb-1">
                              {!req.read && <span className="inline-block w-3 h-3 bg-red-500 rounded-full animate-pulse" />}
                              <span className="font-heavy text-lg">{req.title || 'Payment Request'}</span>
                            </div>
                            <p className="text-gray-700 text-sm">{req.message}</p>
                            <p className="text-gray-500 text-xs mt-1">
                              {req.createdAt ? new Date(req.createdAt).toLocaleString() : 'Unknown date'}
                            </p>
                          </div>
                          <div className="flex-shrink-0 flex gap-2">
                            <button
                              className="btn-neo-main py-2 px-4 text-sm"
                              onClick={() => {
                                // Extract email from the message
                                const match = req.message?.match(/User\s+(\S+@\S+)/);
                                if (match) {
                                  setGrantEmail(match[1]);
                                  setActiveTab('users');
                                }
                              }}
                            >
                              Grant Access
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
        </div>
      </main>

      <NeoFooter />
    </NeoPage>
  );
};

export default AdminPage;

