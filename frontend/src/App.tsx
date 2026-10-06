import { Navigate, Route, Routes } from "react-router-dom";
import RequireAuth from "./components/RequireAuth";
import RootLayout from "./layouts/RootLayout";
import About from "./pages/About";
import ForgotPassword from "./pages/ForgotPassword";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import StudentCourse from "./pages/student/Course";
import StudentGrades from "./pages/student/Grades";
import StudentQuiz from "./pages/student/Quiz";
import CreateCourse from "./pages/instructor/CreateCourse";
import InstructorCourse from "./pages/instructor/Course";
import InstructorGrades from "./pages/instructor/Grades";
import CreateQuiz from "./pages/instructor/CreateQuiz";
import EditQuiz from "./pages/instructor/EditQuiz";
import ViewSubmissions from "./pages/instructor/ViewSubmissions";
import SubmissionDetails from "./pages/instructor/SubmissionDetails";

export default function App() {
  return (
    <Routes>
      <Route element={<RootLayout />}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Navigate to="/about" replace />} />

        <Route element={<RequireAuth />}>
          <Route path="/" element={<Home />} />
          <Route path="/course/:courseId" element={<StudentCourse />} />
          <Route path="/course/:courseId/grades" element={<StudentGrades />} />
          <Route path="/course/:courseId/quiz/:quizId" element={<StudentQuiz />} />
          <Route path="/instructor/create-course" element={<CreateCourse />} />
          <Route path="/instructor/course/:courseId" element={<InstructorCourse />} />
          <Route path="/instructor/course/:courseId/grades" element={<InstructorGrades />} />
          <Route path="/instructor/course/:courseId/quiz/create" element={<CreateQuiz />} />
          <Route path="/instructor/course/:courseId/quiz/:quizId/edit" element={<EditQuiz />} />
          <Route path="/instructor/course/:courseId/submissions" element={<ViewSubmissions />} />
          <Route path="/instructor/course/:courseId/submissions/detail" element={<SubmissionDetails />} />
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Route>
    </Routes>
  );
}
