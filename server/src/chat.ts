import OpenAI from "openai";
import { searchNearbyPlaces } from "./places.js";
import type { ChatMessage, ChatRequest, ChatResponse, Place } from "./types.js";

const SYSTEM_PROMPT = `You are Voya, a friendly local guide that helps people find places near their exact location.

Rules:
- Always recommend the CLOSEST matching place first when tool results are available.
- Include walk time in minutes and approximate distance in meters.
- If the closest place is more than 1km away, say so honestly.
- Offer alternatives when multiple results exist, e.g. "If you don't like that, I have 2 others within 5 minutes."
- Never invent places — only mention places returned by the search_nearby_places tool.
- Be concise and conversational, like a helpful friend.
- If no places are found, say so and suggest trying a broader query.`;

const searchTool: OpenAI.Chat.Completions.ChatCompletionTool = {
  type: "function",
  function: {
    name: "search_nearby_places",
    description:
      "Search for places near the user's current GPS location. Results are sorted by true distance.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description:
            'What to search for, e.g. "restaurant", "coffee shop", "mattress store", "pharmacy"',
        },
      },
      required: ["query"],
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

      const args = JSON.parse(toolCall.function.arguments) as { query: string };
      const result = await searchNearbyPlaces(args.query, req.lat, req.lng);
      foundPlaces = result.places;
      searchNote = result.searchNote;

      messages.push({
        role: "tool",
        tool_call_id: toolCall.id,
        content: JSON.stringify({
          places: foundPlaces,
          searchNote: searchNote ?? null,
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
