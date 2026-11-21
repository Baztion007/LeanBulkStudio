"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

/**
 * Class-based theme provider.
 * - `defaultTheme="system"` respects the OS preference on first visit
 * - the explicit choice is persisted to localStorage by next-themes
 * - `disableTransitionOnChange` avoids mixed-theme flash while colors cross-fade
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
