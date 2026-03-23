interface Props {
  message: { role: "user" | "assistant"; content: string };
}

export function ChatMessage({ message }: Props) {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] text-sm rounded-xl px-3.5 py-2.5 ${
          isUser
            ? "bg-[var(--brand)] text-white rounded-br-sm"
            : "bg-gray-100 text-[var(--text)] rounded-bl-sm"
        }`}
      >
        <p className="whitespace-pre-wrap m-0 leading-relaxed">{message.content}</p>
      </div>
    </div>
  );
}
