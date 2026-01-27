import { Hono } from "hono";
import { cors } from "hono/cors";
import { serveStatic } from "hono/cloudflare-pages";
import type { Bindings } from "@wdmock/shared";
import { api } from "./routes/api";
import { renderer } from "./renderer";

const app = new Hono<{ Bindings: Bindings }>();

// Static files
app.use("/static/*", serveStatic());

// CORS for API
app.use("/api/*", cors());

// API routes
app.route("/api", api);

// SPA fallback: render page shell for all other routes
app.use("*", renderer);

app.get("*", (c) => {
  return c.render(<div id="app-loading">Loading...</div>);
});

export default app;
