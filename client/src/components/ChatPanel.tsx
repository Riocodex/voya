import { useEffect, useRef, useState } from "react";
import { sendChatMessage } from "../api";
import type { ChatMessage, Place } from "../types";

const STARTER_PROMPTS = [
  "Closest restaurant?",
  "Best pizza in Malta",
  "Coffee shop near me",
];

interface ChatPanelProps {
  lat: number;
  lng: number;
  locationReady: boolean;
  places: Place[];
  onPlacesFound: (places: Place[]) => void;
  onStartJourney: (place: Place) => void;
}

const JOURNEY_INTENT =
  /\b(start (the )?journey|take me there|let'?s go|navigate|directions|start (walking|driving|cycling)|guide me|go there)\b/i;

export function ChatPanel({
  lat,
  lng,
  locationReady,
  places,
  onPlacesFound,
  onStartJourney,
}: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Hey, I'm Voya. Ask for the closest place or the best rated nearby. Tap a pin for details, then say \"start journey\" and I'll guide you there by car, foot, or bike.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    if (!locationReady) {
      setError("Waiting for your location… allow GPS access for best results.");
      return;
    }

    setError(null);
    setInput("");

    if (JOURNEY_INTENT.test(trimmed) && places.length > 0) {
      setMessages((prev) => [
        ...prev,
        { role: "user", content: trimmed },
        {
          role: "assistant",
          content: `Starting your journey to ${places[0].name}. Pick a travel mode on the map — drive, walk, or cycle.`,
        },
      ]);
      onStartJourney(places[0]);
      return;
    }

    setLoading(true);

    const userMessage: ChatMessage = { role: "user", content: trimmed };
    const history = messages.filter(
      (m) => m.role !== "assistant" || messages.indexOf(m) > 0
    );
    setMessages((prev) => [...prev, userMessage]);

    try {
      const response = await sendChatMessage(trimmed, lat, lng, history);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: response.reply },
      ]);
      onPlacesFound(response.places);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, I hit an error. Check your API keys and try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-full flex-col bg-transparent">
      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${
              msg.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-gradient-to-br from-sky-400 to-indigo-500 text-[#0b1220] shadow-[0_6px_20px_rgba(56,189,248,0.35)]"
                  : "bg-white/8 text-white/90 ring-1 ring-white/10 backdrop-blur"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="flex items-center gap-1.5 rounded-2xl bg-white/8 px-4 py-3 ring-1 ring-white/10">
              <span className="voya-typing-dot" />
              <span className="voya-typing-dot" style={{ animationDelay: "0.15s" }} />
              <span className="voya-typing-dot" style={{ animationDelay: "0.3s" }} />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {error && (
        <div className="mx-4 mb-2 rounded-lg bg-rose-500/15 px-3 py-2 text-sm text-rose-200 ring-1 ring-rose-400/20">
          {error}
        </div>
      )}

      {messages.length <= 1 && (
        <div className="flex flex-wrap gap-2 px-4 pb-2">
          {STARTER_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => sendMessage(prompt)}
              disabled={loading}
              className="rounded-full bg-white/6 px-3 py-1.5 text-xs text-sky-200 ring-1 ring-white/10 transition hover:bg-sky-400 hover:text-[#0b1220] disabled:opacity-50"
            >
              {prompt}
            </button>
          ))}
        </div>
      )}

      <form
        className="border-t border-white/10 p-3"
        onSubmit={(e) => {
          e.preventDefault();
          sendMessage(input);
        }}
      >
        <div className="flex items-center gap-2 rounded-2xl bg-white/8 p-1.5 ring-1 ring-white/10 focus-within:ring-sky-400/60">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about places near you…"
            disabled={loading}
            className="flex-1 bg-transparent px-3 py-2 text-sm text-white placeholder:text-white/35 outline-none disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 to-indigo-500 text-[#0b1220] transition hover:brightness-110 disabled:opacity-40"
            aria-label="Send"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 12l16-8-6 16-2.5-6L4 12z" strokeLinejoin="round" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </form>
    </div>
  );
}
