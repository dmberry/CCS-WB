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
 * Timestamp appears below the bubble in small text.
 * Assistant messages include copy and favourite buttons on hover.
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
      <div className="mt-1 px-1 flex items-center justify-between w-full max-w-[80%]">
        <span className="font-sans text-[9px] text-slate-muted">
          {formatTimestamp(message.timestamp)}
        </span>
        {!isUser && onCopy && onToggleFavourite && (
          <div className="flex items-center gap-0.5 opacity-0 group-hover/message:opacity-100 transition-opacity">
            <button
              onClick={() => onCopy(message.id, message.content)}
              className="p-1 text-slate-muted hover:text-ink rounded-sm transition-colors"
              title="Copy response"
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
                "p-1 rounded-sm transition-colors",
                isFavourite
                  ? "text-burgundy"
                  : "text-slate-muted hover:text-ink"
              )}
              title={isFavourite ? "Liked" : "Like"}
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
