import { useEffect, useRef, useState } from "react";
import { sendChatMessage } from "../api";
import type { ChatMessage, Place } from "../types";

const STARTER_PROMPTS = [
  "What's the closest restaurant?",
  "Best pizza place in Malta",
  "Find a coffee shop near me",
];

interface ChatPanelProps {
  lat: number;
  lng: number;
  locationReady: boolean;
  onPlacesFound: (places: Place[]) => void;
}

export function ChatPanel({
  lat,
  lng,
  locationReady,
  onPlacesFound,
}: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Hi, I'm Voya — your local guide. Ask for the **closest** place near you, or the **best** rated — I'll know the difference. Try \"closest coffee shop\" or \"best pizza in Malta\".",
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
    setLoading(true);

    const userMessage: ChatMessage = { role: "user", content: trimmed };
    const history = messages.filter((m) => m.role !== "assistant" || messages.indexOf(m) > 0);
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
    <div className="flex h-full flex-col bg-white">
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-voya-600 text-white"
                  : "bg-gray-100 text-gray-800"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="rounded-2xl bg-gray-100 px-4 py-2.5 text-sm text-gray-500">
              Searching nearby…
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {error && (
        <div className="mx-4 mb-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
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
              className="rounded-full border border-voya-200 bg-voya-50 px-3 py-1.5 text-xs text-voya-700 hover:bg-voya-100 disabled:opacity-50"
            >
              {prompt}
            </button>
          ))}
        </div>
      )}

      <form
        className="border-t border-gray-200 p-4"
        onSubmit={(e) => {
          e.preventDefault();
          sendMessage(input);
        }}
      >
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about places near you…"
            disabled={loading}
            className="flex-1 rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-voya-500 focus:ring-1 focus:ring-voya-500 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="rounded-xl bg-voya-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-voya-700 disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}
