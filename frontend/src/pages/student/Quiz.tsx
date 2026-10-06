import { useNavigate, useParams } from "react-router-dom";
import QuizTemplate from "../../QuizTemplate";
import { useAuth } from "../../context/AuthContext";

export default function StudentQuiz() {
  const { courseId, quizId } = useParams<{ courseId: string; quizId: string }>();
  const { loginresult, studentCourses } = useAuth();
  const navigate = useNavigate();

  const course = studentCourses.find((c) => c.id === Number(courseId));

  return (
    <QuizTemplate
      onExit={() => navigate(`/course/${courseId}`)}
      quizId={quizId ? Number(quizId) : undefined}
      userId={loginresult?.user.id}
      course={course}
    />
  );
}
