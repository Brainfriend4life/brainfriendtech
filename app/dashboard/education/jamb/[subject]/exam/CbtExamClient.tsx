"use client";

import { useEffect, useRef, useState } from "react";
import {
  Clock,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
} from "lucide-react";

type Question = {
  id: string;
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
};

type Props = {
  attemptId: string;
  questions: Question[];
  duration: number;
};

export default function CbtExamClient({
  attemptId,
  questions,
  duration,
}: Props) {
  const [currentQuestion, setCurrentQuestion] = useState(0);

  const [answers, setAnswers] = useState<Record<string, string>>({});

  const [timeLeft, setTimeLeft] = useState(duration * 60);

  const [submitting, setSubmitting] = useState(false);

  const submittedRef = useRef(false);

  const question = questions[currentQuestion];

  /*
  ========================================
  TIMER
  ========================================
  */

  useEffect(() => {
    if (timeLeft <= 0) {
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((previous) => {
        if (previous <= 1) {
          clearInterval(timer);
          return 0;
        }

        return previous - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  /*
  ========================================
  AUTO SUBMIT WHEN TIME FINISHES
  ========================================
  */

  useEffect(() => {
    if (timeLeft !== 0) {
      return;
    }

    if (submittedRef.current) {
      return;
    }

    submittedRef.current = true;

    submitExam();
  }, [timeLeft]);

  /*
  ========================================
  FORMAT TIME
  ========================================
  */

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);

    const remainingSeconds = seconds % 60;

    return `${String(minutes).padStart(2, "0")}:${String(
      remainingSeconds
    ).padStart(2, "0")}`;
  };

  /*
  ========================================
  SELECT ANSWER
  ========================================
  */

  const selectAnswer = (answer: string) => {
    if (!question || submitting) {
      return;
    }

    setAnswers((previous) => ({
      ...previous,
      [question.id]: answer,
    }));
  };

  /*
  ========================================
  SUBMIT EXAM
  ========================================
  */

  const submitExam = async () => {
    if (submitting) {
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch("/api/cbt/submit", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          attemptId,
          answers,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        submittedRef.current = false;

        alert(data.error || "Failed to submit examination.");

        setSubmitting(false);

        return;
      }

      window.location.href = `/dashboard/education/cbt/result/${attemptId}`;
    } catch (error) {
      console.error("SUBMIT EXAM ERROR:", error);

      submittedRef.current = false;

      alert("Something went wrong while submitting the examination.");

      setSubmitting(false);
    }
  };

  /*
  ========================================
  NO QUESTIONS
  ========================================
  */

  if (!question) {
    return (
      <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
        <h2 className="text-xl font-bold text-gray-900">
          No questions available
        </h2>

        <p className="mt-2 text-gray-500">
          There are currently no questions for this examination.
        </p>
      </div>
    );
  }

  /*
  ========================================
  OPTIONS
  ========================================
  */

  const options = [
    {
      key: "A",
      value: question.optionA,
    },
    {
      key: "B",
      value: question.optionB,
    },
    {
      key: "C",
      value: question.optionC,
    },
    {
      key: "D",
      value: question.optionD,
    },
  ];

  const answeredCount = Object.keys(answers).length;

  const progress =
    ((currentQuestion + 1) / questions.length) * 100;

  return (
    <div className="space-y-6">
      {/* TOP BAR */}

      <div className="flex flex-col gap-4 rounded-2xl bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-gray-500">
            Question
          </p>

          <p className="text-lg font-bold text-gray-900">
            {currentQuestion + 1} / {questions.length}
          </p>

          <p className="mt-1 text-xs text-gray-500">
            {answeredCount} of {questions.length} answered
          </p>
        </div>

        <div
          className={`flex items-center gap-2 rounded-xl px-4 py-2 font-bold ${
            timeLeft <= 60
              ? "bg-red-100 text-red-600"
              : "bg-indigo-100 text-indigo-600"
          }`}
        >
          <Clock className="h-5 w-5" />

          {formatTime(timeLeft)}
        </div>
      </div>

      {/* PROGRESS */}

      <div className="h-2 overflow-hidden rounded-full bg-gray-200">
        <div
          className="h-full bg-indigo-600 transition-all duration-300"
          style={{
            width: `${progress}%`,
          }}
        />
      </div>

      {/* QUESTION */}

      <div className="rounded-2xl bg-white p-6 shadow-sm sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <p className="text-lg font-semibold leading-8 text-gray-900">
            {question.question}
          </p>

          {answers[question.id] && (
            <CheckCircle2 className="h-6 w-6 shrink-0 text-green-600" />
          )}
        </div>

        {/* OPTIONS */}

        <div className="mt-8 space-y-4">
          {options.map((option) => {
            const selected =
              answers[question.id] === option.key;

            return (
              <button
                key={option.key}
                type="button"
                disabled={submitting}
                onClick={() => selectAnswer(option.key)}
                className={`flex w-full items-start gap-4 rounded-xl border p-4 text-left transition ${
                  selected
                    ? "border-indigo-600 bg-indigo-50"
                    : "border-gray-200 hover:border-indigo-300 hover:bg-gray-50"
                } ${
                  submitting
                    ? "cursor-not-allowed opacity-70"
                    : ""
                }`}
              >
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-bold ${
                    selected
                      ? "bg-indigo-600 text-white"
                      : "bg-gray-100 text-gray-700"
                  }`}
                >
                  {option.key}
                </span>

                <span className="pt-1 text-sm leading-6 text-gray-700">
                  {option.value}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* NAVIGATION */}

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
        {/* PREVIOUS */}

        <button
          type="button"
          disabled={
            currentQuestion === 0 || submitting
          }
          onClick={() =>
            setCurrentQuestion(
              (value) => value - 1
            )
          }
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-3 font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft className="h-5 w-5" />

          Previous
        </button>

        {/* NEXT / SUBMIT */}

        {currentQuestion === questions.length - 1 ? (
          <button
            type="button"
            disabled={submitting}
            onClick={() => {
              submittedRef.current = true;
              submitExam();
            }}
            className="rounded-xl bg-green-600 px-6 py-3 font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting
              ? "Submitting..."
              : "Submit Examination"}
          </button>
        ) : (
          <button
            type="button"
            disabled={submitting}
            onClick={() =>
              setCurrentQuestion(
                (value) => value + 1
              )
            }
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next

            <ChevronRight className="h-5 w-5" />
          </button>
        )}
      </div>
    </div>
  );
}