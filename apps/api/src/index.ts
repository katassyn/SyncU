import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import logixlysia from "logixlysia";
import { authRoutes } from "./handlers/auth";
import { coursesRoutes } from "./handlers/courses";
import { eventsRoutes } from "./handlers/events";
import { examsRoutes } from "./handlers/exams";
import { groupsRoutes } from "./handlers/groups";
import { filesRoutes, materialsRoutes } from "./handlers/materials";
import { meRoutes } from "./handlers/me";
import { scheduleRoutes } from "./handlers/schedule";
import { timetableRoutes } from "./handlers/timetable";
import { cleanupOldScheduleChanges } from "./db";

const app = new Elysia()
	.use(cors({ origin: "*" }))
	.use(
		logixlysia({
			config: {
				service: 'api-server',
				showStartupMessage: true,
				startupMessageFormat: 'banner',
				showContextTree: true,
				contextDepth: 2,
				slowThreshold: 500,
				verySlowThreshold: 1000,
				timestamp: {
					translateTime: 'yyyy-mm-dd HH:MM:ss.SSS'
				},
				ip: true
			}
		})
	)
	.use(authRoutes)
	.use(coursesRoutes)
	.use(eventsRoutes)
	.use(examsRoutes)
	.use(groupsRoutes)
	.use(materialsRoutes)
	.use(filesRoutes)
	.use(meRoutes)
	.use(scheduleRoutes)
	.use(timetableRoutes)
	.get("/", () => ({ name: "SyncU API", status: "ok" }))
	.listen({ port: Number(process.env.PORT ?? 3001), hostname: "0.0.0.0" });

console.log(`SyncU API running on http://0.0.0.0:${app.server?.port}`);

cleanupOldScheduleChanges();
setInterval(() => cleanupOldScheduleChanges(), 24 * 60 * 60 * 1000);
