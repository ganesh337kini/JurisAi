import { useEffect, useRef, useState } from "react";
import Spinner from "./Spinner.jsx";

const SUGGESTED_QUESTIONS = [
  "What is the rent?",
  "Who is the owner?",
  "Who is the tenant?",
  "What is the security deposit?",
  "What is the duration of the agreement?",
  "Is there a penalty clause?",
  "How can the agreement be terminated?",
];

function MessageBubble({ message, onCopy, onHighlightSource }) {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
          isUser
            ? "bg-emerald-500/20 text-emerald-50 ring-1 ring-emerald-500/30"
            : "bg-slate-900 text-slate-200 ring-1 ring-slate-800"
        }`}
      >
        <div className="whitespace-pre-wrap">{message.content}</div>
        {!isUser && message.sources?.length > 0 ? (
          <div className="mt-3 border-t border-slate-800 pt-3">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              Sources
            </div>
            <div className="mt-2 space-y-2">
              {message.sources.map((src, i) => (
                <button
                  key={src.chunk_id || i}
                  type="button"
                  onClick={() => onHighlightSource?.(src)}
                  className="block w-full rounded-lg bg-slate-950/80 px-2 py-1.5 text-left text-xs text-slate-400 hover:bg-slate-950 hover:text-emerald-200"
                >
                  Excerpt #{src.chunk_index + 1}
                  <span className="ml-1 text-slate-600">· click to highlight</span>
                </button>
              ))}
            </div>
          </div>
        ) : null}
        {!isUser ? (
          <button
            type="button"
            onClick={() => onCopy(message.content)}
            className="mt-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500 hover:text-emerald-300"
          >
            Copy response
          </button>
        ) : null}
        <div className="mt-1 text-[10px] text-slate-600">
          {message.timestamp ? new Date(message.timestamp).toLocaleTimeString() : ""}
        </div>
      </div>
    </div>
  );
}

export default function ChatBox({
  messages,
  onSend,
  loading,
  disabled,
  onHighlightChunk,
}) {
  const [input, setInput] = useState("");
  const [listening, setListening] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const q = input.trim();
    if (!q || loading || disabled) return;
    onSend(q);
    setInput("");
  };

  const handleSuggestion = (q) => {
    if (loading || disabled) return;
    onSend(q);
  };

  const handleCopy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // ignore
    }
  };

  const handleVoice = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice input is not supported in this browser.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = "en-IN";
    recognition.interimResults = false;
    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
      inputRef.current?.focus();
    };
    recognition.start();
  };

  return (
    <div className="flex h-full min-h-[480px] flex-col rounded-3xl border border-slate-800 bg-slate-900/30">
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center px-4 text-center">
            <div className="text-3xl">💬</div>
            <p className="mt-3 text-sm text-slate-400">
              Ask anything about this document. Answers use retrieved passages from your upload.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              {SUGGESTED_QUESTIONS.map((q) => (
                <button
                  key={q}
                  type="button"
                  disabled={disabled || loading}
                  onClick={() => handleSuggestion(q)}
                  className="rounded-full bg-slate-950 px-3 py-1.5 text-xs text-slate-300 ring-1 ring-slate-800 hover:bg-slate-900 hover:text-emerald-200 disabled:opacity-50"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m, i) => (
            <MessageBubble
              key={m._id || `${m.role}-${i}`}
              message={m}
              onCopy={handleCopy}
              onHighlightSource={(src) => onHighlightChunk?.(src.chunk_index)}
            />
          ))
        )}
        {loading ? (
          <div className="flex justify-start">
            <div className="rounded-2xl bg-slate-900 px-4 py-3 ring-1 ring-slate-800">
              <Spinner label="AI is thinking…" />
            </div>
          </div>
        ) : null}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSubmit} className="border-t border-slate-800 p-4">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={disabled || loading}
            placeholder={disabled ? "Document not ready for chat" : "Ask a question about this document…"}
            className="min-w-0 flex-1 rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white outline-none ring-emerald-500/30 focus:ring-2 disabled:opacity-50"
          />
          <button
            type="button"
            onClick={handleVoice}
            disabled={disabled || loading}
            title="Voice input"
            className="rounded-xl bg-slate-950 px-3 py-2 text-sm text-slate-300 ring-1 ring-slate-800 hover:bg-slate-900 disabled:opacity-50"
          >
            {listening ? "🎙️" : "🎤"}
          </button>
          <button
            type="submit"
            disabled={disabled || loading || !input.trim()}
            className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}
