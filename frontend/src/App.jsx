import { Routes, Route } from "react-router-dom";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import ProfilePage from "./pages/ProfilePage";
import MyCoursesPage from "./pages/MyCoursesPage";
import WatchCoursePage from "./pages/WatchCoursePage";
import AdminPage from "./pages/AdminPage";
import RefundPolicyPage from "./pages/RefundPolicyPage";
import DisclaimerPage from "./pages/DisclaimerPage";
import FaqPage from "./pages/FaqPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import CalculatorPage from "./pages/CalculatorPage";
import ForumPage from "./pages/ForumPage";
import TopicDetail from "./components/forum/TopicDetail";
import CreateTopicForm from "./components/forum/CreateTopicForm";
import NotFoundPage from "./pages/NotFoundPage";
import FreePdfPage from "./pages/FreePdfPage";


const App = () => (
  <Routes>
    <Route path="/" element={<HomePage />} />
    <Route path="/freepdffyou" element={<FreePdfPage />} />
    <Route path="/login" element={<LoginPage />} />
    <Route path="/reset-password" element={<ResetPasswordPage />} />
    <Route path="/dashboard" element={<DashboardPage />} />
    <Route path="/profile" element={<ProfilePage />} />
    <Route path="/my-courses" element={<MyCoursesPage />} />
    <Route path="/watch-course/:courseId" element={<WatchCoursePage />} />
    <Route path="/admin" element={<AdminPage />} />
    <Route path="/refund-policy" element={<RefundPolicyPage />} />
    <Route path="/disclaimer" element={<DisclaimerPage />} />
    <Route path="/faq" element={<FaqPage />} />
    <Route path="/calculator" element={<CalculatorPage />} />
    <Route path="/forum" element={<ForumPage />} />
    <Route path="/forum/create" element={<CreateTopicForm />} />
    <Route path="/forum/topics/:id" element={<TopicDetail />} />
    <Route path="/forum/topics/:id/edit" element={<CreateTopicForm />} />
    <Route path="*" element={<NotFoundPage />} />
  </Routes>
);

export default App;
