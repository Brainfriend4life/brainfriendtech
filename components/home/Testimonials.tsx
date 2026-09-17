"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { BadgeCheck, Star } from "lucide-react";

type Review = {
  id: string;
  displayName: string;
  role: string | null;
  rating: number;
  review: string;
  createdAt: string;
  verified?: boolean;
};

type ReviewDraft = {
  displayName: string;
  role: string;
  rating: number;
  review: string;
};

const MAX_REVIEW_LENGTH = 500;
const MIN_REVIEW_LENGTH = 10;
const REVIEWS_PER_PAGE = 6;

// Used to hand a draft review across the login redirect. sessionStorage
// (not localStorage) so it clears itself when the tab closes rather than
// lingering indefinitely if something goes wrong.
const DRAFT_STORAGE_KEY = "bgt_pending_review_draft";

function getErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

function formatReviewDate(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function StarRating({ rating }: { rating: number }) {
  const clampedRating = Math.max(0, Math.min(5, Math.round(rating)));

  return (
    <div className="mb-4 flex" aria-label={`${clampedRating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          aria-hidden="true"
          className={`mr-1 h-5 w-5 shrink-0 ${
            star <= clampedRating
              ? "fill-yellow-400 text-yellow-400"
              : "fill-gray-200 text-gray-200 dark:fill-gray-700 dark:text-gray-700"
          }`}
        />
      ))}
    </div>
  );
}

function StarRatingInput({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex gap-1" role="radiogroup" aria-label="Rating">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          role="radio"
          aria-checked={value === star}
          aria-label={`${star} star${star > 1 ? "s" : ""}`}
          disabled={disabled}
          onClick={() => onChange(star)}
          className="-m-1 p-1 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Star
            className={`h-6 w-6 transition-colors ${
              star <= value
                ? "fill-yellow-400 text-yellow-400"
                : "fill-gray-200 text-gray-200 dark:fill-gray-700 dark:text-gray-700"
            }`}
          />
        </button>
      ))}
    </div>
  );
}

function ReviewCard({ item }: { item: Review }) {
  const formattedDate = formatReviewDate(item.createdAt);

  return (
    <div className="flex h-full flex-col rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl dark:border-gray-800 dark:bg-gray-900 dark:shadow-gray-950/30 dark:hover:border-gray-700 dark:hover:shadow-2xl sm:p-8">
      <StarRating rating={item.rating} />

      <p className="mb-6 flex-1 leading-relaxed text-gray-600 dark:text-gray-300">
        &ldquo;{item.review}&rdquo;
      </p>

      <div>
        <div className="flex flex-wrap items-center gap-1.5">
          <h3 className="font-bold text-gray-900 dark:text-white">
            {item.displayName}
          </h3>
          {item.verified && (
            <span
              className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300"
              title="Verified customer"
            >
              <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />
              Verified
            </span>
          )}
        </div>

        {item.role && (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {item.role}
          </p>
        )}

        {formattedDate && (
          <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
            {formattedDate}
          </p>
        )}
      </div>
    </div>
  );
}

function ReviewCardSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="animate-pulse rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-8"
    >
      <div className="mb-4 flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <div
            key={star}
            className="h-5 w-5 rounded-full bg-gray-200 dark:bg-gray-800"
          />
        ))}
      </div>
      <div className="mb-2 h-3 w-full rounded bg-gray-200 dark:bg-gray-800" />
      <div className="mb-2 h-3 w-5/6 rounded bg-gray-200 dark:bg-gray-800" />
      <div className="mb-6 h-3 w-2/3 rounded bg-gray-200 dark:bg-gray-800" />
      <div className="mb-1 h-4 w-1/3 rounded bg-gray-200 dark:bg-gray-800" />
      <div className="h-3 w-1/4 rounded bg-gray-200 dark:bg-gray-800" />
    </div>
  );
}

function ReviewForm() {
  const { data: session, status: sessionStatus } = useSession();
  const isLoggedIn = sessionStatus === "authenticated" && !!session?.user;

  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState("");
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Prevents auto-submitting the same recovered draft twice (e.g. if
  // the session status flips a couple of times while NextAuth settles
  // in right after the redirect back).
  const hasAutoSubmitted = useRef(false);

  const busy = submitting || redirecting;

  const validateDraft = (draft: ReviewDraft): string | null => {
    if (!draft.displayName.trim()) {
      return "Please enter a name to display with your review.";
    }
    if (draft.rating < 1) {
      return "Please select a star rating.";
    }
    if (draft.review.trim().length < MIN_REVIEW_LENGTH) {
      return `Please write at least ${MIN_REVIEW_LENGTH} characters.`;
    }
    return null;
  };

  const submitReview = async (draft: ReviewDraft) => {
    const response = await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        displayName: draft.displayName.trim(),
        role: draft.role.trim(),
        rating: draft.rating,
        review: draft.review.trim(),
      }),
    });

    let result: any = null;
    try {
      result = await response.json();
    } catch {
      // Non-JSON error response (e.g. a 500 from an upstream proxy).
    }

    if (!response.ok || !result?.success) {
      throw new Error(result?.message || "Unable to submit your review.");
    }

    return result;
  };

  const resetForm = () => {
    setDisplayName("");
    setRole("");
    setRating(0);
    setReviewText("");
  };

  // -----------------------------------------------------------------
  // RECOVER A DRAFT AFTER RETURNING FROM LOGIN
  //
  // If the person wrote a review, hit Submit while logged out, got
  // redirected to log in, and landed back here now authenticated —
  // pick their draft back up from sessionStorage and submit it for
  // them automatically, rather than making them retype it.
  // -----------------------------------------------------------------

  useEffect(() => {
    if (!isLoggedIn || hasAutoSubmitted.current) {
      return;
    }

    const stored = sessionStorage.getItem(DRAFT_STORAGE_KEY);

    if (!stored) {
      return;
    }

    hasAutoSubmitted.current = true;

    let draft: ReviewDraft;

    try {
      draft = JSON.parse(stored);
    } catch {
      sessionStorage.removeItem(DRAFT_STORAGE_KEY);
      return;
    }

    // Repopulate the form either way, so if auto-submit fails for some
    // reason, the person sees their own text still sitting there
    // instead of it silently vanishing.
    setDisplayName(draft.displayName || "");
    setRole(draft.role || "");
    setRating(draft.rating || 0);
    setReviewText(draft.review || "");

    const validationError = validateDraft(draft);
    if (validationError) {
      // Draft was tampered with or predates a validation rule change —
      // let the person fix it up manually instead of auto-submitting
      // something we know the API will reject.
      setError(validationError);
      sessionStorage.removeItem(DRAFT_STORAGE_KEY);
      return;
    }

    (async () => {
      try {
        setSubmitting(true);
        setError("");
        const result = await submitReview(draft);
        setSuccess(result.message);
        resetForm();
      } catch (err: unknown) {
        setError(
          getErrorMessage(
            err,
            "You're logged in — please hit Submit to finish posting your review.",
          ),
        );
      } finally {
        sessionStorage.removeItem(DRAFT_STORAGE_KEY);
        setSubmitting(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn]);

  // Auto-dismiss the success banner instead of leaving it on screen
  // indefinitely.
  useEffect(() => {
    if (!success) return;
    const timeout = setTimeout(() => setSuccess(""), 6000);
    return () => clearTimeout(timeout);
  }, [success]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    const draft: ReviewDraft = {
      displayName: displayName.trim(),
      role: role.trim(),
      rating,
      review: reviewText.trim(),
    };

    const validationError = validateDraft(draft);

    if (validationError) {
      setError(validationError);
      return;
    }

    // Not logged in yet: save the draft and send them to log in. They
    // land back on this same section and it auto-submits for them —
    // see the recovery effect above.
    if (!isLoggedIn) {
      setRedirecting(true);
      sessionStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));

      const returnUrl = `${window.location.pathname}#leave-review`;
      window.location.href = `/login?callbackUrl=${encodeURIComponent(
        returnUrl,
      )}`;
      return;
    }

    try {
      setSubmitting(true);
      const result = await submitReview(draft);
      setSuccess(result.message);
      resetForm();
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Unable to submit your review."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      id="leave-review"
      onSubmit={handleSubmit}
      className="mx-auto mt-8 w-full max-w-sm scroll-mt-24 rounded-xl border border-gray-200 bg-white p-4 text-left shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:max-w-md sm:p-5"
    >
      <h3 className="mb-0.5 text-base font-bold text-gray-900 dark:text-white">
        Leave a Review
      </h3>

      <p className="mb-4 text-xs text-gray-500 dark:text-gray-400">
        You'll be asked to log in before it posts, it'll appear once our team
        reviews it.
      </p>

      {error && (
        <div
          role="alert"
          className="mb-3 rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300"
        >
          {error}
        </div>
      )}

      {success && (
        <div
          role="status"
          className="mb-3 rounded-lg border border-green-200 bg-green-50 p-2.5 text-xs text-green-700 dark:border-green-800 dark:bg-green-950/30 dark:text-green-300"
        >
          {success}
        </div>
      )}

      <fieldset disabled={busy} className="contents">
        <div className="mb-3">
          <label className="mb-1.5 block text-xs font-medium text-gray-800 dark:text-gray-200">
            Rating
          </label>
          <StarRatingInput
            value={rating}
            onChange={setRating}
            disabled={busy}
          />
        </div>

        <div className="mb-3">
          <label
            htmlFor="review-display-name"
            className="mb-1.5 block text-xs font-medium text-gray-800 dark:text-gray-200"
          >
            Display Name
          </label>
          <input
            id="review-display-name"
            type="text"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            placeholder="e.g. David J."
            maxLength={60}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          />
        </div>

        <div className="mb-3">
          <label
            htmlFor="review-role"
            className="mb-1.5 block text-xs font-medium text-gray-800 dark:text-gray-200"
          >
            Role (optional)
          </label>
          <input
            id="review-role"
            type="text"
            value={role}
            onChange={(event) => setRole(event.target.value)}
            placeholder="e.g. Business Owner, Student"
            maxLength={60}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          />
        </div>

        <div className="mb-4">
          <label
            htmlFor="review-text"
            className="mb-1.5 block text-xs font-medium text-gray-800 dark:text-gray-200"
          >
            Your Review
          </label>
          <textarea
            id="review-text"
            value={reviewText}
            onChange={(event) => setReviewText(event.target.value)}
            rows={3}
            maxLength={MAX_REVIEW_LENGTH}
            placeholder="Tell us about your experience..."
            className="w-full resize-none rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          />
          <p className="mt-1 text-right text-[11px] text-gray-400 dark:text-gray-500">
            {reviewText.length}/{MAX_REVIEW_LENGTH}
          </p>
        </div>
      </fieldset>

      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {redirecting
          ? "Redirecting to log in..."
          : submitting
            ? "Submitting..."
            : isLoggedIn
              ? "Submit Review"
              : "Log In & Submit Review"}
      </button>
    </form>
  );
}

export default function Testimonials() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    const loadReviews = async (pageToLoad: number) => {
      try {
        pageToLoad === 1 ? setLoading(true) : setLoadingMore(true);
        setLoadError("");

        const response = await fetch(
          `/api/reviews?page=${pageToLoad}&limit=${REVIEWS_PER_PAGE}`,
          { cache: "no-store", signal: controller.signal },
        );
        const result = await response.json();

        if (response.ok && result.success) {
          setReviews((prev) =>
            pageToLoad === 1
              ? result.reviews || []
              : [...prev, ...(result.reviews || [])],
          );
          setHasMore(Boolean(result.pagination?.hasMore));
        } else {
          setLoadError(result?.message || "Unable to load reviews right now.");
        }
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setLoadError("Unable to load reviews right now.");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    };

    loadReviews(page);

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const visibleReviews = reviews;

  return (
    <section
      aria-labelledby="testimonials-heading"
      className="bg-white py-16 transition-colors dark:bg-gray-950 sm:py-20"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        {/* Heading */}
        <div className="mb-12 text-center sm:mb-14">
          <p className="font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
            Customer Reviews
          </p>

          <h2
            id="testimonials-heading"
            className="mt-2 text-3xl font-bold text-gray-900 dark:text-white sm:text-4xl"
          >
            What Our Customers Say About Brainfriend Global Tech
          </h2>

          <p className="mx-auto mt-4 max-w-2xl text-gray-600 dark:text-gray-400">
            See what customers have to say about our fast, secure and reliable
            VTU and digital payment services.
          </p>
        </div>

        {/* Reviews */}
        {loading && (
          <div className="grid gap-6 sm:gap-8 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <ReviewCardSkeleton key={index} />
            ))}
          </div>
        )}

        {!loading && loadError && (
          <p
            role="alert"
            className="text-center text-gray-500 dark:text-gray-400"
          >
            {loadError}
          </p>
        )}

        {!loading && !loadError && reviews.length > 0 && (
          <>
            <div className="grid gap-6 sm:gap-8 md:grid-cols-2 lg:grid-cols-3">
              {visibleReviews.map((item) => (
                <ReviewCard key={item.id} item={item} />
              ))}
            </div>

            {hasMore && (
              <div className="mt-10 flex justify-center">
                <button
                  type="button"
                  disabled={loadingMore}
                  onClick={() => setPage((current) => current + 1)}
                  className="rounded-xl border border-gray-300 px-6 py-2.5 font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-900"
                >
                  {loadingMore ? "Loading..." : "Load more reviews"}
                </button>
              </div>
            )}
          </>
        )}

        {!loading && !loadError && reviews.length === 0 && (
          <p className="text-center text-gray-500 dark:text-gray-400">
            Be the first to leave a review.
          </p>
        )}

        {/* Submission — always visible, login only required at submit time */}
        <ReviewForm />
      </div>
    </section>
  );
}
