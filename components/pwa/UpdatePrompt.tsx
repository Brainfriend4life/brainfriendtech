"use client";

import { useEffect, useState } from "react";
import { RefreshCw, X } from "lucide-react";

export default function UpdatePrompt() {
  const [updateAvailable, setUpdateAvailable] =
    useState(false);

  const [updating, setUpdating] =
    useState(false);

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !("serviceWorker" in navigator)
    ) {
      return;
    }

    let interval: ReturnType<typeof setInterval> | null =
      null;

    const checkForUpdate = async () => {
      try {
        const registration =
          await navigator.serviceWorker.getRegistration();

        if (!registration) {
          return;
        }

        await registration.update();

        if (registration.waiting) {
          setUpdateAvailable(true);
        }
      } catch (error) {
        console.error(
          "PWA update check failed:",
          error
        );
      }
    };

    const handleControllerChange = () => {
      window.location.reload();
    };

    navigator.serviceWorker.addEventListener(
      "controllerchange",
      handleControllerChange
    );

    checkForUpdate();

    interval = setInterval(
      checkForUpdate,
      5 * 60 * 1000
    );

    const handleVisibilityChange = () => {
      if (
        document.visibilityState === "visible"
      ) {
        checkForUpdate();
      }
    };

    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange
    );

    return () => {
      navigator.serviceWorker.removeEventListener(
        "controllerchange",
        handleControllerChange
      );

      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange
      );

      if (interval) {
        clearInterval(interval);
      }
    };
  }, []);

  async function updateApp() {
    setUpdating(true);

    try {
      const registration =
        await navigator.serviceWorker.getRegistration();

      if (!registration?.waiting) {
        window.location.reload();
        return;
      }

      registration.waiting.postMessage({
        type: "SKIP_WAITING",
      });
    } catch (error) {
      console.error(
        "Failed to update app:",
        error
      );

      window.location.reload();
    }
  }

  if (!updateAvailable) {
    return null;
  }

  return (
    <div className="fixed inset-x-4 bottom-5 z-[9999] sm:left-auto sm:right-5 sm:w-[380px]">
      <div className="rounded-2xl border border-indigo-100 bg-white p-5 shadow-2xl shadow-indigo-200/40">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
            <RefreshCw className="h-5 w-5" />
          </div>

          <div className="min-w-0 flex-1">
            <h3 className="font-bold text-gray-900">
              New update available
            </h3>

            <p className="mt-1 text-sm leading-5 text-gray-500">
              A new version of Brainfriend Global
              Tech is available. Update now to get
              the latest features and improvements.
            </p>

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={updateApp}
                disabled={updating}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCw
                  className={`h-4 w-4 ${
                    updating
                      ? "animate-spin"
                      : ""
                  }`}
                />

                {updating
                  ? "Updating..."
                  : "Update now"}
              </button>

              <button
                type="button"
                onClick={() =>
                  setUpdateAvailable(false)
                }
                disabled={updating}
                className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-600 transition hover:bg-gray-50 disabled:opacity-50"
              >
                Later
              </button>
            </div>
          </div>

          {!updating && (
            <button
              type="button"
              onClick={() =>
                setUpdateAvailable(false)
              }
              className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}