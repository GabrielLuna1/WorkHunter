"use client";

import { useState, Fragment, type ReactNode } from "react";
import { Bot, User } from "lucide-react";
import { cn } from "@/lib/utils";

function formatMarkdown(text: string) {
  const lines = text.split("\n");
  const elements: ReactNode[] = [];
  let inList = false;

  lines.forEach((line, i) => {
    const trimmed = line.trim();

    // Empty line = paragraph break
    if (!trimmed) {
      if (inList) {
        elements.push(<br key={`br-${i}`} />);
        inList = false;
      }
      elements.push(<br key={`p-${i}`} />);
      return;
    }

    // Bullet point
    if (trimmed.startsWith("* ")) {
      inList = true;
      const content = parseInline(trimmed.slice(2));
      elements.push(
        <div key={`li-${i}`} className="flex gap-2 ml-2">
          <span className="text-accent mt-0.5 shrink-0">•</span>
          <span>{content}</span>
        </div>
      );
      return;
    }

    // Numbered list
    const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
    if (numMatch) {
      inList = true;
      const content = parseInline(numMatch[2]);
      elements.push(
        <div key={`li-${i}`} className="flex gap-2 ml-2">
          <span className="text-ink-muted text-xs mt-0.5 w-4 shrink-0 text-right">{numMatch[1]}.</span>
          <span>{content}</span>
        </div>
      );
      return;
    }

    inList = false;

    // Separator
    if (trimmed === "---") {
      elements.push(
        <div key={`hr-${i}`} className="border-t border-hairline my-2" />
      );
      return;
    }

    elements.push(
      <div key={`p-${i}`} className="mb-0.5">
        {parseInline(trimmed)}
      </div>
    );
  });

  return elements;
}

function parseInline(text: string) {
  const parts: ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    // Bold **text**
    const boldMatch = remaining.match(/^\*\*(.+?)\*\*/);
    if (boldMatch) {
      parts.push(<strong key={key++}>{boldMatch[1]}</strong>);
      remaining = remaining.slice(boldMatch[0].length);
      continue;
    }

    // Italic _text_
    const italicMatch = remaining.match(/^_(.+?)_/);
    if (italicMatch) {
      parts.push(<em key={key++}>{italicMatch[1]}</em>);
      remaining = remaining.slice(italicMatch[0].length);
      continue;
    }

    // Code `text`
    const codeMatch = remaining.match(/^`(.+?)`/);
    if (codeMatch) {
      parts.push(
        <code key={key++} className="px-1 py-0.5 rounded bg-surface text-[12px] font-mono text-accent">
          {codeMatch[1]}
        </code>
      );
      remaining = remaining.slice(codeMatch[0].length);
      continue;
    }

    // Plain text until next marker
    const nextMarker = remaining.search(/(\*\*|_|`)/);
    if (nextMarker === 0) {
      parts.push(<Fragment key={key++}>{remaining[0]}</Fragment>);
      remaining = remaining.slice(1);
      continue;
    }
    if (nextMarker > 0) {
      parts.push(<Fragment key={key++}>{remaining.slice(0, nextMarker)}</Fragment>);
      remaining = remaining.slice(nextMarker);
    } else {
      parts.push(<Fragment key={key++}>{remaining}</Fragment>);
      break;
    }
  }

  return parts.length > 0 ? <>{parts}</> : text;
}

interface ChatMessageProps {
  papel: "user" | "assistant" | "system";
  conteudo: string;
  metadata?: Record<string, unknown> | null;
  isStreaming?: boolean;
}

export function ChatMessage({ papel, conteudo, metadata, isStreaming }: ChatMessageProps) {
  const isUser = papel === "user";

  return (
    <div
      className={cn(
        "flex gap-3 px-4 py-3",
        isUser ? "justify-end" : "justify-start",
      )}
    >
      {!isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center">
          <Bot className="w-4 h-4 text-accent" />
        </div>
      )}

      <div className="max-w-[80%] space-y-2">
        <div
          className={cn(
            "rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
            isUser
              ? "bg-accent/15 text-ink rounded-br-md"
              : "bg-surface-2 border border-hairline text-ink rounded-bl-md",
          )}
        >
          <div className="text-sm leading-relaxed break-words">
            {formatMarkdown(conteudo)}
            {isStreaming && (
              <span className="inline-flex ml-0.5">
                <span className="w-1.5 h-4 bg-accent rounded-full animate-pulse-dot" />
              </span>
            )}
          </div>
        </div>

      </div>

      {isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-accent/20 border border-accent/30 flex items-center justify-center">
          <User className="w-4 h-4 text-accent" />
        </div>
      )}
    </div>
  );
}
