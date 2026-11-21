"use client";

import { useEffect } from "react";

/**
 * Last-resort error boundary: replaces the entire root layout when even
 * it fails to render. It receives no CSS or providers, so every style
 * here is inline by design. Keep this file dependency-free except for
 * React itself.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Lean Bulk Studio] global error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "#16181d",
          color: "#e2e8f0",
          fontFamily:
            "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
          padding: "1.5rem",
        }}
      >
        <div
          role="alert"
          style={{
            maxWidth: "22rem",
            width: "100%",
            textAlign: "center",
            border: "1px solid #2e333d",
            borderRadius: "1rem",
            background: "#1d2027",
            padding: "1.75rem 1.5rem",
          }}
        >
          <div
            aria-hidden="true"
            style={{
              width: "3rem",
              height: "3rem",
              margin: "0 auto 1rem",
              display: "grid",
              placeItems: "center",
              borderRadius: "0.9rem",
              border: "1px solid rgba(245, 158, 11, 0.4)",
              background: "rgba(245, 158, 11, 0.1)",
              fontSize: "1.35rem",
            }}
          >
            !
          </div>
          <h1 style={{ fontSize: "1rem", fontWeight: 700, margin: "0 0 0.5rem" }}>
            Lean Bulk Studio can&apos;t start
          </h1>
          <p
            style={{
              fontSize: "0.75rem",
              lineHeight: 1.6,
              color: "#94a3b8",
              margin: "0 0 1.25rem",
            }}
          >
            A critical error prevented the app from loading. Your workout
            history is stored safely on this device.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              minHeight: "44px",
              width: "100%",
              border: "none",
              borderRadius: "0.75rem",
              background: "#2f6f63",
              color: "#ffffff",
              fontSize: "0.85rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
          {error.digest ? (
            <p
              style={{
                fontSize: "0.6rem",
                color: "#64748b",
                margin: "1rem 0 0",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              Error ID: {error.digest}
            </p>
          ) : null}
        </div>
      </body>
    </html>
  );
}
