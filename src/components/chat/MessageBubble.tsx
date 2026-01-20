"use client";

import { cn, formatTimestamp } from "@/lib/utils";
import { Copy, Check, Heart } from "lucide-react";
import type { Message } from "@/types";

interface MessageBubbleProps {
  message: Message;
  fontSize?: number; // Font size in pixels
  isCopied?: boolean;
  isFavourite?: boolean;
  onCopy?: (messageId: string, content: string) => void;
  onToggleFavourite?: (messageId: string) => void;
}

/**
 * Chat message bubble component with editorial styling.
 * User messages appear on the right, assistant messages on the left with a border.
 * Timestamp and action buttons appear inline below the bubble.
 * Copy and favourite buttons available for all messages on hover.
 */
export function MessageBubble({
  message,
  fontSize = 14,
  isCopied = false,
  isFavourite = false,
  onCopy,
  onToggleFavourite,
}: MessageBubbleProps) {
  const isUser = message.role === "user";

  return (
    <div
      className={cn(
        "message-enter group/message",
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
      {/* Timestamp and actions inline */}
      <div className={cn(
        "mt-0.5 px-1 flex items-center gap-2",
        isUser ? "flex-row-reverse" : "flex-row"
      )}>
        <span className="font-sans text-[9px] text-slate-muted">
          {formatTimestamp(message.timestamp)}
        </span>
        {onCopy && onToggleFavourite && (
          <div className="flex items-center gap-0.5">
            <button
              onClick={() => onCopy(message.id, message.content)}
              className="p-0.5 text-slate-muted hover:text-ink rounded-sm transition-colors opacity-0 group-hover/message:opacity-100"
              title="Copy"
            >
              {isCopied ? (
                <Check className="h-3 w-3 text-green-600" strokeWidth={1.5} />
              ) : (
                <Copy className="h-3 w-3" strokeWidth={1.5} />
              )}
            </button>
            <button
              onClick={() => onToggleFavourite(message.id)}
              className={cn(
                "p-0.5 rounded-sm transition-colors",
                isFavourite
                  ? "text-burgundy"
                  : "text-slate-muted hover:text-ink opacity-0 group-hover/message:opacity-100"
              )}
              title={isFavourite ? "Marked" : "Mark"}
            >
              <Heart
                className="h-3 w-3"
                strokeWidth={1.5}
                fill={isFavourite ? "currentColor" : "none"}
              />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
