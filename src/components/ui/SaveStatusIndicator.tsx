/**
 * Save Status Indicator Component
 *
 * Displays the current save status with appropriate icons and colors.
 * Shows: Saving... | Saved 2m ago | Save failed | Unsaved changes
 */

'use client';

import React from 'react';
import { Loader2, Check, AlertCircle, Circle } from 'lucide-react';
import type { SaveStatus } from '@/lib/file-system';

interface SaveStatusIndicatorProps {
  /**
   * Current save status
   */
  status: SaveStatus;

  /**
   * Last saved timestamp (ISO string)
   */
  lastSaved: string | null;

  /**
   * Has unsaved changes
   */
  isDirty: boolean;

  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * Format timestamp as relative time (e.g., "2m ago")
 */
function formatRelativeTime(timestamp: string): string {
  const now = Date.now();
  const then = new Date(timestamp).getTime();
  const diffMs = now - then;
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);

  if (diffSeconds < 10) {
    return 'just now';
  } else if (diffSeconds < 60) {
    return `${diffSeconds}s ago`;
  } else if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  } else if (diffHours < 24) {
    return `${diffHours}h ago`;
  } else {
    return new Date(timestamp).toLocaleDateString();
  }
}

export function SaveStatusIndicator({
  status,
  lastSaved,
  isDirty,
  className = '',
}: SaveStatusIndicatorProps): React.ReactElement {
  // Determine display based on status
  let icon: React.ReactNode;
  let text: string;
  let colorClass: string;

  switch (status) {
    case 'saving':
      icon = <Loader2 className="h-3 w-3 animate-spin" />;
      text = 'Saving...';
      colorClass = 'text-slate-500';
      break;

    case 'saved':
      icon = <Check className="h-3 w-3" />;
      text = lastSaved ? `Saved ${formatRelativeTime(lastSaved)}` : 'Saved';
      colorClass = 'text-green-600';
      break;

    case 'error':
      icon = <AlertCircle className="h-3 w-3" />;
      text = 'Save failed';
      colorClass = 'text-red-600';
      break;

    case 'idle':
    default:
      if (isDirty) {
        icon = <Circle className="h-3 w-3 fill-current" />;
        text = 'Unsaved changes';
        colorClass = 'text-amber-500';
      } else if (lastSaved) {
        icon = <Check className="h-3 w-3" />;
        text = `Saved ${formatRelativeTime(lastSaved)}`;
        colorClass = 'text-slate-400';
      } else {
        icon = null;
        text = '';
        colorClass = '';
      }
      break;
  }

  if (!text) {
    return <></>;
  }

  return (
    <div
      className={`flex items-center gap-1.5 text-xs ${colorClass} ${className}`}
      title={lastSaved ? `Last saved: ${new Date(lastSaved).toLocaleString()}` : undefined}
    >
      {icon}
      <span>{text}</span>
    </div>
  );
}
