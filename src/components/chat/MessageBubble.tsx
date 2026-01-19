"use client";

import { cn, formatTimestamp } from "@/lib/utils";
import type { Message } from "@/types";

interface MessageBubbleProps {
  message: Message;
  fontSize?: number; // Font size in pixels
}

/**
 * Chat message bubble component with editorial styling.
 * User messages appear on the right, assistant messages on the left with a border.
 * Timestamp appears below the bubble in small text.
 */
export function MessageBubble({ message, fontSize = 14 }: MessageBubbleProps) {
  const isUser = message.role === "user";

  return (
    <div
      className={cn(
        "message-enter",
        isUser ? "flex flex-col items-end" : "flex flex-col items-start"
      )}
    >
      <div
        className={cn(
          "max-w-[80%] rounded-sm px-4 py-3",
          isUser
            ? "bg-burgundy/10 text-ink"
            : "bg-white border border-parchment text-ink"
        )}
      >
        <p
          className="font-body whitespace-pre-wrap leading-relaxed"
          style={{ fontSize: `${fontSize}px` }}
        >
          {message.content}
        </p>
      </div>
      <div className="mt-1 px-1">
        <span className="font-sans text-[9px] text-slate-muted">
          {formatTimestamp(message.timestamp)}
        </span>
      </div>
    </div>
  );
}
