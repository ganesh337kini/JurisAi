import { useState } from "react";
import Spinner from "./Spinner.jsx";

export default function QuizIntelligencePanel({ data, loading, onGenerate, onSubmitScore }) {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(null);

  if (loading) return <Spinner label="Generating quiz…" />;

  if (!data?.questions?.length) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-800 p-10 text-center">
        <p className="text-sm text-slate-400">10–15 questions: MCQ, True/False, Fill-in-the-blank, Short Answer, Scenario.</p>
        <button
          type="button"
          onClick={async () => {
            setIndex(0);
            setAnswers({});
            setSubmitted(false);
            setScore(null);
            await onGenerate();
          }}
          className="mt-4 rounded-xl bg-emerald-500 px-5 py-2 text-sm font-semibold text-slate-950"
        >
          Start Quiz
        </button>
      </div>
    );
  }

  const questions = data.questions;
  const q = questions[index];
  const total = questions.length;

  const submitAll = () => {
    let correct = 0;
    questions.forEach((question) => {
      const given = (answers[question.id] || "").trim().toLowerCase();
      const expected = (question.correct_answer || "").trim().toLowerCase();
      if (given === expected || expected.includes(given) || given.includes(expected)) {
        correct += 1;
      }
    });
    const pct = Math.round((correct / total) * 100);
    setScore({ correct, total, pct });
    setSubmitted(true);
    onSubmitScore?.({ correct, total, pct });
  };

  if (submitted && score) {
    return (
      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-8 text-center">
        <div className="text-3xl font-semibold text-emerald-200">{score.pct}%</div>
        <p className="mt-2 text-sm text-slate-400">{score.correct} / {score.total} correct</p>
        <button
          type="button"
          onClick={() => { setSubmitted(false); setScore(null); setIndex(0); setAnswers({}); onGenerate(); }}
          className="mt-6 rounded-xl bg-slate-900 px-4 py-2 text-sm text-slate-200 ring-1 ring-slate-800"
        >
          New Quiz
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-6">
      <div className="text-xs uppercase text-slate-500">
        Question {index + 1} of {total} · {q.type.replace("_", " ")}
      </div>
      <p className="mt-3 text-sm text-white">{q.question}</p>

      {q.options?.length ? (
        <div className="mt-4 space-y-2">
          {q.options.map((opt) => (
            <label key={opt} className="flex cursor-pointer items-center gap-2 rounded-xl bg-slate-950 px-3 py-2 text-sm text-slate-300 ring-1 ring-slate-800">
              <input
                type="radio"
                name={q.id}
                checked={answers[q.id] === opt}
                onChange={() => setAnswers((a) => ({ ...a, [q.id]: opt }))}
                className="accent-emerald-500"
              />
              {opt}
            </label>
          ))}
        </div>
      ) : (
        <input
          value={answers[q.id] || ""}
          onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
          placeholder="Your answer"
          className="mt-4 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white outline-none"
        />
      )}

      <div className="mt-6 flex justify-between gap-2">
        <button
          type="button"
          disabled={index <= 0}
          onClick={() => setIndex((i) => i - 1)}
          className="rounded-xl bg-slate-950 px-4 py-2 text-sm text-slate-300 ring-1 ring-slate-800 disabled:opacity-40"
        >
          Back
        </button>
        {index < total - 1 ? (
          <button
            type="button"
            onClick={() => setIndex((i) => i + 1)}
            className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950"
          >
            Next
          </button>
        ) : (
          <button
            type="button"
            onClick={submitAll}
            className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950"
          >
            Submit Quiz
          </button>
        )}
      </div>
    </div>
  );
}
