import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { handleChat } from "./chat.js";
import { searchNearbyPlaces } from "./places.js";
import type { ChatRequest } from "./types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const app = express();
const PORT = Number(process.env.PORT) || 3001;

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", name: "voya" });
});

app.get("/api/config", (_req, res) => {
  res.json({
    mapboxToken: process.env.MAPBOX_TOKEN ?? "",
  });
});

app.get("/api/places/test", async (req, res) => {
  try {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    const q = String(req.query.q ?? "restaurant");

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      res.status(400).json({ error: "lat and lng query params are required" });
      return;
    }

    const result = await searchNearbyPlaces(q, lat, lng);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: err instanceof Error ? err.message : "Search failed",
    });
  }
});

app.post("/api/chat", async (req, res) => {
  try {
    const body = req.body as ChatRequest;

    if (!body.message?.trim()) {
      res.status(400).json({ error: "message is required" });
      return;
    }
    if (!Number.isFinite(body.lat) || !Number.isFinite(body.lng)) {
      res.status(400).json({ error: "lat and lng are required" });
      return;
    }

    const result = await handleChat(body);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: err instanceof Error ? err.message : "Chat failed",
    });
  }
});

app.listen(PORT, () => {
  console.log(`Voya server running on http://localhost:${PORT}`);
});
