interface ChatMessageProps {
  role: "user" | "ai";
  content: string;
}

export default function ChatMessage({ role, content }: ChatMessageProps) {
  const isUser = role === "user";

  return (
    <div className={`flex gap-4 max-w-[85%] ${isUser ? "ml-auto flex-row-reverse" : ""}`}>
      <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${
        isUser
          ? "bg-surface-container-highest"
          : "bg-primary shadow-lg shadow-primary/20"
      }`}>
        <span className={`material-symbols-outlined text-xl ${
          isUser ? "text-primary" : "text-fondo"
        }`} style={isUser ? undefined : { fontVariationSettings: "'FILL' 1" }}>
          {isUser ? "person" : "smart_toy"}
        </span>
      </div>
      <div className={`p-4 rounded-2xl shadow-sm ${
        isUser
          ? "bg-acento text-white rounded-tr-none shadow-lg shadow-primary/10"
          : "bg-lienzo text-on-surface rounded-tl-none border border-purple-800/30"
      }`}>
        <p className="font-body leading-relaxed" dangerouslySetInnerHTML={{ __html: content }} />
      </div>
    </div>
  );
}
