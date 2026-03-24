"use client";

import React from "react";

interface Props {
  message: { role: "user" | "assistant"; content: string };
}

/** Render inline markdown: **bold**, *italic*, `code` */
function renderInline(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`)/g;
  let lastIndex = 0;
  let match;
  let key = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    if (match[2]) {
      parts.push(<strong key={key++} className="font-semibold">{match[2]}</strong>);
    } else if (match[3]) {
      parts.push(<em key={key++}>{match[3]}</em>);
    } else if (match[4]) {
      parts.push(
        <code key={key++} className="text-xs bg-gray-200 px-1 py-0.5 rounded font-mono">{match[4]}</code>
      );
    }
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : [text];
}

/** Simple markdown renderer for chat messages */
function renderMarkdown(text: string): React.ReactNode {
  const blocks = text.split(/\n\n+/);

  return blocks.map((block, bi) => {
    const trimmed = block.trim();
    if (!trimmed) return null;

    // Bullet list
    if (/^[\*\-•]\s/.test(trimmed)) {
      const items = trimmed.split(/\n/).filter((l) => l.trim());
      return (
        <ul key={bi} className="list-disc list-outside pl-4 my-1.5 space-y-0.5">
          {items.map((item, ii) => (
            <li key={ii} className="text-sm leading-relaxed">
              {renderInline(item.replace(/^[\*\-•]\s*/, ""))}
            </li>
          ))}
        </ul>
      );
    }

    // Numbered list
    if (/^\d+[\.\)]\s/.test(trimmed)) {
      const items = trimmed.split(/\n/).filter((l) => l.trim());
      return (
        <ol key={bi} className="list-decimal list-outside pl-4 my-1.5 space-y-0.5">
          {items.map((item, ii) => (
            <li key={ii} className="text-sm leading-relaxed">
              {renderInline(item.replace(/^\d+[\.\)]\s*/, ""))}
            </li>
          ))}
        </ol>
      );
    }

    // Regular paragraph
    return (
      <p key={bi} className="text-sm leading-relaxed my-1.5 first:mt-0 last:mb-0">
        {renderInline(trimmed)}
      </p>
    );
  });
}

export function ChatMessage({ message }: Props) {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-xl px-3.5 py-2.5 ${
          isUser
            ? "bg-[var(--brand)] text-white rounded-br-sm"
            : "bg-gray-50 text-[var(--text)] rounded-bl-sm border border-[var(--border)]"
        }`}
      >
        {isUser ? (
          <p className="text-sm whitespace-pre-wrap m-0 leading-relaxed">{message.content}</p>
        ) : (
          <div>{renderMarkdown(message.content)}</div>
        )}
      </div>
    </div>
  );
}
