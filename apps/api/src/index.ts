import { Elysia } from "elysia";
import { scheduleRoutes } from "./handlers/schedule";

const app = new Elysia()
  .use(scheduleRoutes)
  .get("/", () => ({ name: "SyncU API", status: "ok" }))
  .listen(Number(process.env.PORT ?? 3001));

console.log(`SyncU API running on http://localhost:${app.server?.port}`);
