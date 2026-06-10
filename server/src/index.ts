import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { handleChat } from "./chat.js";
import { searchNearbyPlaces } from "./places.js";
import type { ChatRequest } from "./types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const localEnvPath = path.resolve(__dirname, "../../.env");
dotenv.config({ path: localEnvPath });

const app = express();
const PORT = Number(process.env.PORT) || 3001;
const CLIENT_URL = process.env.CLIENT_URL;

app.use(
  cors({
    origin: CLIENT_URL
      ? [CLIENT_URL, CLIENT_URL.replace(/\/$/, "")]
      : true,
  })
);
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
    const rankBy =
      req.query.rankBy === "best" ? ("best" as const) : ("distance" as const);
    const area = req.query.area ? String(req.query.area) : undefined;

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      res.status(400).json({ error: "lat and lng query params are required" });
      return;
    }

    const result = await searchNearbyPlaces(q, lat, lng, { rankBy, area });
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

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Voya server running on port ${PORT}`);
});
