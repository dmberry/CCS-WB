/**
 * useUnsavedWarning Hook
 *
 * Warns users before they close the browser tab or navigate away
 * when there are unsaved changes.
 */

import { useEffect, useCallback, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';

interface UseUnsavedWarningOptions {
  /**
   * Whether there are unsaved changes
   */
  isDirty: boolean;

  /**
   * Custom warning message (browsers may not display this)
   */
  message?: string;

  /**
   * Callback when user attempts to leave with unsaved changes
   */
  onAttemptLeave?: () => void;
}

/**
 * Hook to warn users before closing tab/navigating with unsaved changes
 *
 * Usage:
 * ```tsx
 * useUnsavedWarning({ isDirty: hasUnsavedChanges });
 * ```
 */
export function useUnsavedWarning(options: UseUnsavedWarningOptions): void {
  const {
    isDirty,
    message = 'You have unsaved changes. Are you sure you want to leave?',
    onAttemptLeave,
  } = options;

  const isDirtyRef = useRef(isDirty);
  const pathname = usePathname();

  // Update ref when isDirty changes
  useEffect(() => {
    isDirtyRef.current = isDirty;
  }, [isDirty]);

  /**
   * Browser beforeunload event
   * Triggered when user closes tab/window or refreshes page
   */
  const handleBeforeUnload = useCallback(
    (e: BeforeUnloadEvent) => {
      if (!isDirtyRef.current) {
        return;
      }

      if (onAttemptLeave) {
        onAttemptLeave();
      }

      // Modern browsers ignore custom messages for security,
      // but setting returnValue triggers the default warning
      e.preventDefault();
      e.returnValue = message;
      return message;
    },
    [message, onAttemptLeave]
  );

  /**
   * Register beforeunload handler
   */
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [handleBeforeUnload]);

  /**
   * Next.js route change warning
   * Note: This is more complex in App Router vs Pages Router
   * For now, we'll just handle beforeunload (tab close/refresh)
   *
   * Future: Implement route change blocking when Next.js adds support
   * See: https://github.com/vercel/next.js/discussions/41934
   */
}
