import { useState } from "react";

interface Props {
  onSendMessage: (message: string) => Promise<boolean>;
  disabled?: boolean;
  pensando?: boolean;
}
export default function MessageInput({ onSendMessage, disabled, pensando }: Props) {
  const [message, setMessage] = useState("");
  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || disabled || pensando) return;
    if (await onSendMessage(message.trim())) setMessage("");
  };
  return <form onSubmit={enviar} className="p-4 sm:p-6 border-t border-white/10 bg-background">
    <div className="max-w-3xl mx-auto flex items-end gap-3 rounded-2xl border border-outline-variant/50 bg-surface-container p-3">
      <textarea aria-label="Mensaje al tutor" value={message} onChange={e => setMessage(e.target.value)} disabled={disabled || pensando} rows={2} maxLength={10000} placeholder={disabled ? "El tutor todavía no está disponible." : "¿Qué te gustaría aprender hoy?"} className="min-w-0 flex-1 bg-transparent resize-none text-sm p-1 outline-none disabled:opacity-50" onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); e.currentTarget.form?.requestSubmit(); } }} />
      <button type="submit" disabled={disabled || pensando || !message.trim()} aria-label="Enviar mensaje" className="w-10 h-10 rounded-xl bg-primary text-on-primary grid place-items-center disabled:opacity-40"><span className={`material-symbols-outlined ${pensando ? "animate-spin" : ""}`}>{pensando ? "progress_activity" : "arrow_upward"}</span></button>
    </div>
    <p className="text-center text-[10px] text-on-surface-variant/50 mt-3">Enter para enviar · Shift + Enter para una nueva línea</p>
  </form>;
}
