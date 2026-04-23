import { Elysia } from "elysia";

const app = new Elysia()
  .get("/", () => ({ name: "SyncU API", status: "ok" }))
  .listen(Number(process.env.PORT ?? 3001));

console.log(`SyncU API running on http://localhost:${app.server?.port}`);
