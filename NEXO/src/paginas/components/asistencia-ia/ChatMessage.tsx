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
          isUser ? "text-primary" : "text-[#1C1030]"
        }`} style={isUser ? undefined : { fontVariationSettings: "'FILL' 1" }}>
          {isUser ? "person" : "smart_toy"}
        </span>
      </div>
      <div className={`p-4 rounded-2xl shadow-sm ${
        isUser
          ? "bg-[#C548F5] text-white rounded-tr-none shadow-lg shadow-primary/10"
          : "bg-[#2D1B4E] text-on-surface rounded-tl-none border border-purple-800/30"
      }`}>
        <p className="font-body leading-relaxed" dangerouslySetInnerHTML={{ __html: content }} />
      </div>
    </div>
  );
}
