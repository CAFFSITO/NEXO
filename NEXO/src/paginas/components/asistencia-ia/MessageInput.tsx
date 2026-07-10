import { useState } from "react";
import QuickActionChip from "./QuickActionChip";

interface MessageInputProps {
  onSendMessage?: (message: string) => void;
}

export default function MessageInput({ onSendMessage }: MessageInputProps) {
  const [message, setMessage] = useState("");

  const handleSend = () => {
    if (message.trim()) {
      onSendMessage?.(message);
      setMessage("");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const quickActions = [
    { label: "Explicame este concepto", icon: "lightbulb" },
    { label: "Dame ejercicios", icon: "edit_note" },
    { label: "Ayúdame a organizar", icon: "calendar_today" },
    { label: "Revisá mi redacción", icon: "draw" },
  ];

  return (
    <footer className="p-6 bg-[#1C1030] space-y-4">
      <div className="flex flex-wrap gap-2">
        {quickActions.map((action) => (
          <QuickActionChip
            key={action.label}
            label={action.label}
            icon={action.icon}
            onClick={() => {
              setMessage(action.label);
            }}
          />
        ))}
      </div>

      <div className="relative group">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-[#C548F5]/30 to-[#4900a6]/30 rounded-2xl blur opacity-30 group-focus-within:opacity-100 transition duration-1000" />
        <div className="relative flex items-center bg-[#25193a] border border-purple-900/30 rounded-2xl p-2 pl-4">
          <input
            className="flex-1 bg-transparent border-none focus:ring-0 text-on-surface placeholder:text-gray-500 font-body py-2"
            placeholder="Hacé tu pregunta..."
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
          />
          <div className="flex items-center gap-1 px-2">
            <button className="p-2 text-gray-400 hover:text-primary transition-colors">
              <span className="material-symbols-outlined">attach_file</span>
            </button>
            <button className="p-2 text-gray-400 hover:text-primary transition-colors">
              <span className="material-symbols-outlined">mic</span>
            </button>
            <button
              onClick={handleSend}
              className="ml-2 w-10 h-10 bg-[#C548F5] text-white rounded-xl flex items-center justify-center shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
                send
              </span>
            </button>
          </div>
        </div>
      </div>
      <p className="text-[10px] text-center text-gray-500">
        Nexus AI puede cometer errores. Considera verificar la información importante.
      </p>
    </footer>
  );
}
