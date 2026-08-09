
"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Save,
  FileQuestion,
} from "lucide-react";

type Props = {
  examId: string;
  subjectId: string;
  subjectName: string;
};

export default function AddQuestionForm({
  examId,
  subjectId,
  subjectName,
}: Props) {
  const router = useRouter();

  const [question, setQuestion] = useState("");
  const [optionA, setOptionA] = useState("");
  const [optionB, setOptionB] = useState("");
  const [optionC, setOptionC] = useState("");
  const [optionD, setOptionD] = useState("");
  const [correctAnswer, setCorrectAnswer] = useState("A");
  const [marks, setMarks] = useState("1");
  const [explanation, setExplanation] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      if (
        !question.trim() ||
        !optionA.trim() ||
        !optionB.trim() ||
        !optionC.trim() ||
        !optionD.trim()
      ) {
        throw new Error(
          "Please fill in the question and all four options."
        );
      }

      const numericMarks = Number(marks);

      if (
        !Number.isInteger(numericMarks) ||
        numericMarks < 1
      ) {
        throw new Error(
          "Marks must be a whole number greater than 0."
        );
      }

      const response = await fetch(
        "/api/admin/cbt/questions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            subjectId,
            question: question.trim(),
            optionA: optionA.trim(),
            optionB: optionB.trim(),
            optionC: optionC.trim(),
            optionD: optionD.trim(),
            correctAnswer,
            marks: numericMarks,
            explanation:
              explanation.trim() || null,
          }),
        }
      );

      const contentType =
        response.headers.get("content-type") || "";

      if (!contentType.includes("application/json")) {
        throw new Error(
          "The server returned an unexpected response."
        );
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to add question."
        );
      }

      setSuccess(
        "Question added successfully."
      );

      setQuestion("");
      setOptionA("");
      setOptionB("");
      setOptionC("");
      setOptionD("");
      setCorrectAnswer("A");
      setMarks("1");
      setExplanation("");

      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* HEADER */}

      <div className="flex items-start gap-3">
        <Link
          href={`/dashboard/admin/cbt/${examId}`}
          className="mt-1 rounded-xl p-2 text-gray-600 transition hover:bg-gray-100"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>

        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Add Question
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Add a question to{" "}
            <span className="font-semibold text-indigo-600">
              {subjectName}
            </span>
          </p>
        </div>
      </div>

      {/* FORM */}

      <form
        onSubmit={handleSubmit}
        className="rounded-2xl bg-white p-6 shadow-sm sm:p-8"
      >
        {/* ICON */}

        <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-indigo-100">
          <FileQuestion className="h-7 w-7 text-indigo-600" />
        </div>

        {/* ERROR */}

        {error && (
          <div className="mb-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* SUCCESS */}

        {success && (
          <div className="mb-5 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700">
            {success}
          </div>
        )}

        {/* QUESTION */}

        <div>
          <label
            htmlFor="question"
            className="mb-2 block text-sm font-semibold text-gray-700"
          >
            Question
          </label>

          <textarea
            id="question"
            value={question}
            onChange={(e) =>
              setQuestion(e.target.value)
            }
            rows={4}
            placeholder="Enter the examination question..."
            className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          />
        </div>

        {/* OPTIONS */}

        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          {/* OPTION A */}

          <div>
            <label
              htmlFor="optionA"
              className="mb-2 block text-sm font-semibold text-gray-700"
            >
              Option A
            </label>

            <input
              id="optionA"
              value={optionA}
              onChange={(e) =>
                setOptionA(e.target.value)
              }
              placeholder="Enter option A"
              className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </div>

          {/* OPTION B */}

          <div>
            <label
              htmlFor="optionB"
              className="mb-2 block text-sm font-semibold text-gray-700"
            >
              Option B
            </label>

            <input
              id="optionB"
              value={optionB}
              onChange={(e) =>
                setOptionB(e.target.value)
              }
              placeholder="Enter option B"
              className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </div>

          {/* OPTION C */}

          <div>
            <label
              htmlFor="optionC"
              className="mb-2 block text-sm font-semibold text-gray-700"
            >
              Option C
            </label>

            <input
              id="optionC"
              value={optionC}
              onChange={(e) =>
                setOptionC(e.target.value)
              }
              placeholder="Enter option C"
              className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </div>

          {/* OPTION D */}

          <div>
            <label
              htmlFor="optionD"
              className="mb-2 block text-sm font-semibold text-gray-700"
            >
              Option D
            </label>

            <input
              id="optionD"
              value={optionD}
              onChange={(e) =>
                setOptionD(e.target.value)
              }
              placeholder="Enter option D"
              className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </div>
        </div>

        {/* ANSWER + MARKS */}

        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          {/* CORRECT ANSWER */}

          <div>
            <label
              htmlFor="correctAnswer"
              className="mb-2 block text-sm font-semibold text-gray-700"
            >
              Correct Answer
            </label>

            <select
              id="correctAnswer"
              value={correctAnswer}
              onChange={(e) =>
                setCorrectAnswer(e.target.value)
              }
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            >
              <option value="A">
                A
              </option>

              <option value="B">
                B
              </option>

              <option value="C">
                C
              </option>

              <option value="D">
                D
              </option>
            </select>
          </div>

          {/* MARKS */}

          <div>
            <label
              htmlFor="marks"
              className="mb-2 block text-sm font-semibold text-gray-700"
            >
              Marks
            </label>

            <input
              id="marks"
              type="number"
              min="1"
              step="1"
              value={marks}
              onChange={(e) =>
                setMarks(e.target.value)
              }
              className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </div>
        </div>

        {/* EXPLANATION */}

        <div className="mt-6">
          <label
            htmlFor="explanation"
            className="mb-2 block text-sm font-semibold text-gray-700"
          >
            Explanation{" "}
            <span className="font-normal text-gray-400">
              (Optional)
            </span>
          </label>

          <textarea
            id="explanation"
            value={explanation}
            onChange={(e) =>
              setExplanation(e.target.value)
            }
            rows={4}
            placeholder="Explain why the answer is correct..."
            className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          />
        </div>

        {/* BUTTONS */}

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Save className="h-5 w-5" />

            {loading
              ? "Saving..."
              : "Save Question"}
          </button>

          <Link
            href={`/dashboard/admin/cbt/${examId}`}
            className="inline-flex items-center justify-center rounded-xl border border-gray-300 px-6 py-3 font-semibold text-gray-700 transition hover:bg-gray-50"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}

