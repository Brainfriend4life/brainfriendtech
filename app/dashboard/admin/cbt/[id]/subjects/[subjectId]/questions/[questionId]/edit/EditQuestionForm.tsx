
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Save,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";

type Props = {
  examId: string;
  subjectId: string;
  questionId: string;
  subjectName: string;

  initialQuestion: string;
  initialOptionA: string;
  initialOptionB: string;
  initialOptionC: string;
  initialOptionD: string;
  initialCorrectAnswer: string;
  initialMarks: number;
  initialExplanation: string;
  initialIsActive: boolean;
};

export default function EditQuestionForm({
  examId,
  subjectId,
  questionId,
  subjectName,

  initialQuestion,
  initialOptionA,
  initialOptionB,
  initialOptionC,
  initialOptionD,
  initialCorrectAnswer,
  initialMarks,
  initialExplanation,
  initialIsActive,
}: Props) {
  const router = useRouter();

  const [question, setQuestion] =
    useState(initialQuestion);

  const [optionA, setOptionA] =
    useState(initialOptionA);

  const [optionB, setOptionB] =
    useState(initialOptionB);

  const [optionC, setOptionC] =
    useState(initialOptionC);

  const [optionD, setOptionD] =
    useState(initialOptionD);

  const [correctAnswer, setCorrectAnswer] =
    useState(initialCorrectAnswer);

  const [marks, setMarks] =
    useState(String(initialMarks));

  const [explanation, setExplanation] =
    useState(initialExplanation);

  const [isActive, setIsActive] =
    useState(initialIsActive);


  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");


  async function handleSubmit(
    e: React.FormEvent
  ) {
    e.preventDefault();

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(
        `/api/admin/cbt/questions/${questionId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            question,
            optionA,
            optionB,
            optionC,
            optionD,
            correctAnswer,
            marks: Number(marks),
            explanation,
            isActive,
          }),
        }
      );


      const data =
        await response.json();


      if (!response.ok) {
        throw new Error(
          data.error ||
          "Failed to update question."
        );
      }


      setSuccess(
        "Question updated successfully."
      );

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
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl bg-white p-6 shadow-sm space-y-6"
    >

      <div>
        <h2 className="text-lg font-bold text-gray-900">
          {subjectName}
        </h2>

        <p className="text-sm text-gray-500">
          Update examination question details.
        </p>
      </div>


      {error && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}


      {success && (
        <div className="rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700">
          {success}
        </div>
      )}



      {/* QUESTION */}

      <div>
        <label className="mb-2 block text-sm font-semibold">
          Question
        </label>

        <textarea
          value={question}
          onChange={(e)=>
            setQuestion(e.target.value)
          }
          rows={4}
          className="w-full rounded-xl border px-4 py-3"
        />
      </div>



      {/* OPTIONS */}

      <div className="grid gap-4 sm:grid-cols-2">

        <input
          value={optionA}
          onChange={(e)=>
            setOptionA(e.target.value)
          }
          placeholder="Option A"
          className="rounded-xl border px-4 py-3"
        />


        <input
          value={optionB}
          onChange={(e)=>
            setOptionB(e.target.value)
          }
          placeholder="Option B"
          className="rounded-xl border px-4 py-3"
        />


        <input
          value={optionC}
          onChange={(e)=>
            setOptionC(e.target.value)
          }
          placeholder="Option C"
          className="rounded-xl border px-4 py-3"
        />


        <input
          value={optionD}
          onChange={(e)=>
            setOptionD(e.target.value)
          }
          placeholder="Option D"
          className="rounded-xl border px-4 py-3"
        />

      </div>



      {/* ANSWER */}

      <div className="grid gap-4 sm:grid-cols-3">

        <div>
          <label className="mb-2 block text-sm font-semibold">
            Correct Answer
          </label>

          <select
            value={correctAnswer}
            onChange={(e)=>
              setCorrectAnswer(e.target.value)
            }
            className="w-full rounded-xl border px-4 py-3"
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



        <div>
          <label className="mb-2 block text-sm font-semibold">
            Marks
          </label>

          <input
            type="number"
            min="1"
            value={marks}
            onChange={(e)=>
              setMarks(e.target.value)
            }
            className="w-full rounded-xl border px-4 py-3"
          />
        </div>



        <div>
          <label className="mb-2 block text-sm font-semibold">
            Status
          </label>

          <select
            value={
              isActive
              ? "ACTIVE"
              : "INACTIVE"
            }
            onChange={(e)=>
              setIsActive(
                e.target.value === "ACTIVE"
              )
            }
            className="w-full rounded-xl border px-4 py-3"
          >
            <option value="ACTIVE">
              Active
            </option>

            <option value="INACTIVE">
              Inactive
            </option>

          </select>
        </div>

      </div>



      {/* EXPLANATION */}

      <textarea
        value={explanation}
        onChange={(e)=>
          setExplanation(e.target.value)
        }
        rows={3}
        placeholder="Explanation (optional)"
        className="w-full rounded-xl border px-4 py-3"
      />



      {/* BUTTONS */}

      <div className="flex flex-wrap gap-3">

        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          <Save className="h-5 w-5"/>

          {loading
            ? "Updating..."
            : "Update Question"}
        </button>


        <Link
          href={`/dashboard/admin/cbt/${examId}/subjects/${subjectId}/questions`}
          className="inline-flex items-center gap-2 rounded-xl border px-6 py-3 font-semibold"
        >
          <ArrowLeft className="h-5 w-5"/>
          Back
        </Link>

      </div>


    </form>
  );
}

