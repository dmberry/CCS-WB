"use client";

import { cn, formatTimestamp } from "@/lib/utils";
import { Copy, Check, Heart } from "lucide-react";
import type { Message } from "@/types";
import ReactMarkdown from "react-markdown";

interface MessageBubbleProps {
  message: Message;
  fontSize?: number; // Font size in pixels
  userName?: string; // Display name for user messages
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
  userName,
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
            : "bg-card border border-parchment text-foreground"
        )}
      >
        {isUser ? (
          <p
            className="font-body whitespace-pre-wrap leading-relaxed"
            style={{ fontSize: `${fontSize}px` }}
          >
            {message.content}
          </p>
        ) : (
          <div
            className="font-body leading-relaxed prose prose-sm prose-slate dark:prose-invert max-w-none
              prose-p:my-2 prose-p:leading-relaxed prose-p:text-[1em]
              prose-headings:font-display prose-headings:text-ink prose-headings:mt-4 prose-headings:mb-2
              prose-h1:text-[1.2em] prose-h2:text-[1.1em] prose-h3:text-[1em]
              prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5 prose-li:text-[1em]
              prose-code:font-mono prose-code:bg-parchment prose-code:px-1 prose-code:py-0.5 prose-code:rounded-sm prose-code:!text-[0.85em] prose-code:before:content-none prose-code:after:content-none
              prose-pre:bg-parchment prose-pre:border prose-pre:border-parchment-dark prose-pre:rounded-sm prose-pre:my-2 prose-pre:!text-[0.85em] prose-pre:font-mono prose-pre:overflow-x-auto
              prose-blockquote:border-l-burgundy prose-blockquote:text-slate-muted prose-blockquote:my-2
              prose-strong:text-ink prose-strong:font-semibold
              prose-a:text-burgundy prose-a:no-underline hover:prose-a:underline"
            style={{ fontSize: `${fontSize}px` }}
          >
            <ReactMarkdown>{message.content}</ReactMarkdown>
          </div>
        )}
      </div>
      {/* User/Model name, timestamp, and actions inline */}
      <div className={cn(
        "mt-0.5 px-1 flex items-center gap-2",
        isUser ? "flex-row-reverse" : "flex-row"
      )}>
        <span className="font-sans text-[9px] text-slate-muted">
          {!isUser && message.metadata?.model && `${message.metadata.model}, `}
          {formatTimestamp(message.timestamp)}
          {isUser && userName && `, ${userName}`}
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
