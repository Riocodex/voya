import OpenAI from "openai";
import { searchNearbyPlaces } from "./places.js";
import type { ChatMessage, ChatRequest, ChatResponse, Place } from "./types.js";

const SYSTEM_PROMPT = `You are Voya, a friendly local guide that helps people find places.

You have TWO search modes — pick the right one every time:

**CLOSEST mode (rank_by: "distance")** — use when the user wants proximity:
- Words like: closest, nearest, near me, nearby, around me, walking distance
- Examples: "closest pizza?", "nearest pharmacy", "coffee shop near me"
- Recommend the FIRST result — it is sorted by true GPS distance
- Mention walk time and distance

**BEST mode (rank_by: "best")** — use when the user wants quality, not proximity:
- Words like: best, top, highest rated, most popular, famous, recommended, must-try
- Examples: "best pizza in Malta", "top rated sushi", "most popular cafe"
- Recommend the FIRST result — it is sorted by rating and review count, NOT distance
- Mention the rating and that it may be further away; include distance honestly
- If they name a region (Malta, Valletta, Sliema, etc.), pass it as the "area" parameter

General rules:
- Never invent places — only use tool results
- Offer 1–2 alternatives from the list when helpful
- Be concise and conversational
- If no results, suggest broadening the search`;

const searchTool: OpenAI.Chat.Completions.ChatCompletionTool = {
  type: "function",
  function: {
    name: "search_nearby_places",
    description:
      "Search for places. Use rank_by to match user intent: distance for closest/near me, best for quality/top-rated queries.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description:
            'What to search for, e.g. "pizza restaurant", "coffee shop", "sushi"',
        },
        rank_by: {
          type: "string",
          enum: ["distance", "best"],
          description:
            '"distance" for closest/nearest/near me. "best" for highest rated, top, most popular, or best in a region.',
        },
        area: {
          type: "string",
          description:
            'Optional region scope when user names a place, e.g. "Malta", "Valletta", "Sliema". Leave empty for near-me searches.',
        },
      },
      required: ["query", "rank_by"],
    },
  },
};

export async function handleChat(req: ChatRequest): Promise<ChatResponse> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const openai = new OpenAI({ apiKey });
  let foundPlaces: Place[] = [];
  let searchNote: string | undefined;

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: SYSTEM_PROMPT },
    ...(req.history ?? []).map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    {
      role: "user",
      content: `${req.message}\n\n[User location: lat ${req.lat}, lng ${req.lng}]`,
    },
  ];

  let response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages,
    tools: [searchTool],
    tool_choice: "auto",
  });

  let assistantMessage = response.choices[0]?.message;

  while (assistantMessage?.tool_calls?.length) {
    messages.push(assistantMessage);

    for (const toolCall of assistantMessage.tool_calls) {
      if (toolCall.type !== "function") continue;

      const args = JSON.parse(toolCall.function.arguments) as {
        query: string;
        rank_by?: "distance" | "best";
        area?: string;
      };

      const result = await searchNearbyPlaces(args.query, req.lat, req.lng, {
        rankBy: args.rank_by,
        area: args.area,
      });
      foundPlaces = result.places;
      searchNote = result.searchNote;

      messages.push({
        role: "tool",
        tool_call_id: toolCall.id,
        content: JSON.stringify({
          places: foundPlaces,
          rankBy: result.rankBy,
          searchNote: searchNote ?? null,
          hint:
            result.rankBy === "distance"
              ? "Sorted closest-first by GPS distance."
              : "Sorted by rating and reviews — NOT by distance.",
        }),
      });
    }

    response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      tools: [searchTool],
    });

    assistantMessage = response.choices[0]?.message;
  }

  const reply =
    assistantMessage?.content?.trim() ||
    "Sorry, I couldn't generate a response. Please try again.";

  const mapCenter =
    foundPlaces.length > 0
      ? { lat: foundPlaces[0].lat, lng: foundPlaces[0].lng }
      : { lat: req.lat, lng: req.lng };

  return { reply, places: foundPlaces, mapCenter, searchNote };
}
