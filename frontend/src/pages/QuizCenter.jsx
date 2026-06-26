import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../api/client.js";
import Spinner from "../components/Spinner.jsx";

export default function QuizCenter() {
  const { documentId } = useParams();
  const [quiz, setQuiz] = useState(null);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const generate = async () => {
    setLoading(true);
    setError("");
    setResult(null);
    setAnswers({});
    try {
      const { data } = await api.post(`/quiz/generate/${documentId}`, { numQuestions: 8 });
      setQuiz(data.quiz);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to generate quiz");
    } finally {
      setLoading(false);
    }
  };

  const submit = async () => {
    if (!quiz) return;
    setLoading(true);
    setError("");
    try {
      const payload = {
        quizId: quiz._id,
        answers: quiz.questions.map((q) => ({
          question_id: q.id,
          answer: answers[q.id] || "",
        })),
      };
      const { data } = await api.post("/quiz/submit", payload);
      setResult(data.evaluation);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to submit quiz");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Link to="/learning/hub" className="text-sm text-emerald-300 hover:underline">
        ← Learning Hub
      </Link>
      <div className="font-display text-3xl text-white">Quiz Center</div>

      {!quiz ? (
        <button
          type="button"
          onClick={generate}
          disabled={loading}
          className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-50"
        >
          {loading ? "Generating…" : "Generate Quiz from Document"}
        </button>
      ) : null}

      {error ? <p className="text-rose-300">{error}</p> : null}
      {loading && !quiz ? <Spinner label="Generating quiz…" /> : null}

      {quiz && !result ? (
        <div className="space-y-6">
          {quiz.questions.map((q, i) => (
            <div key={q.id} className="rounded-2xl border border-slate-800 bg-slate-900/30 p-5">
              <div className="text-xs uppercase tracking-wide text-slate-500">
                Q{i + 1} · {q.type.replace("_", " ")}
              </div>
              <p className="mt-2 text-sm text-white">{q.question}</p>
              {q.options?.length ? (
                <div className="mt-3 space-y-2">
                  {q.options.map((opt) => (
                    <label key={opt} className="flex cursor-pointer items-center gap-2 text-sm text-slate-300">
                      <input
                        type="radio"
                        name={q.id}
                        value={opt}
                        checked={answers[q.id] === opt}
                        onChange={() => setAnswers((prev) => ({ ...prev, [q.id]: opt }))}
                        className="accent-emerald-500"
                      />
                      {opt}
                    </label>
                  ))}
                </div>
              ) : (
                <input
                  value={answers[q.id] || ""}
                  onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                  placeholder="Your answer"
                  className="mt-3 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white outline-none"
                />
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={submit}
            disabled={loading}
            className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-50"
          >
            Submit Quiz
          </button>
        </div>
      ) : null}

      {result ? (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-6">
          <div className="text-2xl font-semibold text-emerald-200">Score: {result.score}%</div>
          <p className="mt-1 text-sm text-slate-400">
            {result.correct_count} / {result.total} correct
          </p>
          <div className="mt-6 space-y-3">
            {result.results.map((r) => (
              <div
                key={r.question_id}
                className={`rounded-xl p-3 text-sm ${r.is_correct ? "bg-emerald-500/10 text-emerald-100" : "bg-rose-500/10 text-rose-100"}`}
              >
                <div>{r.question}</div>
                <div className="mt-1 text-xs opacity-80">{r.feedback}</div>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => {
              setQuiz(null);
              setResult(null);
            }}
            className="mt-6 rounded-xl bg-slate-900 px-4 py-2 text-sm text-slate-200 ring-1 ring-slate-800"
          >
            Try Another Quiz
          </button>
        </div>
      ) : null}
    </div>
  );
}
