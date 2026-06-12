import { existsSync, mkdirSync, unlinkSync } from "fs";
import { join, resolve } from "path";
import { and, desc, eq } from "drizzle-orm";
import { Elysia, t } from "elysia";
import { db } from "../../db/client";
import { materials, users } from "../../db/schema";
import { type AuthUser, getAuthenticatedUser, getCurrentTimestamp } from "../auth/shared";

type RouteSet = {
	status?: unknown;
};

const UPLOADS_DIR = resolve(process.env.UPLOADS_DIR ?? "./data/uploads");
mkdirSync(UPLOADS_DIR, { recursive: true });

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

const ALLOWED_EXTENSIONS = new Map<string, string>([
	["pdf", "application/pdf"],
	["doc", "application/msword"],
	["docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
	["xls", "application/vnd.ms-excel"],
	["xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
	["ppt", "application/vnd.ms-powerpoint"],
	["pptx", "application/vnd.openxmlformats-officedocument.presentationml.presentation"],
	["txt", "text/plain; charset=utf-8"],
	["md", "text/markdown; charset=utf-8"],
	["csv", "text/csv; charset=utf-8"],
	["png", "image/png"],
	["jpg", "image/jpeg"],
	["jpeg", "image/jpeg"],
	["gif", "image/gif"],
	["zip", "application/zip"],
]);

const STORED_NAME_PATTERN =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.[a-z0-9]{1,8}$/;

function getFileExtension(fileName: string): string {
	const dotIndex = fileName.lastIndexOf(".");
	return dotIndex === -1 ? "" : fileName.slice(dotIndex + 1).toLowerCase();
}

async function requireAuth(authorization: string | undefined, set: RouteSet) {
	const currentUser = await getAuthenticatedUser(authorization);

	if (!currentUser) {
		set.status = 401;
		return {
			user: null,
			response: { message: "Unauthorized." },
		};
	}

	return {
		user: currentUser,
		response: null,
	};
}

function requireGroupMembership(currentUser: AuthUser, set: RouteSet) {
	if (!currentUser.groupId) {
		set.status = 400;
		return {
			groupId: null,
			response: { message: "User has no group selected." },
		};
	}

	return {
		groupId: currentUser.groupId,
		response: null,
	};
}

function getRequiredFormValue(formData: { get(name: string): unknown }, names: string[]) {
	for (const name of names) {
		const value = formData.get(name);
		if (typeof value === "string" && value.trim()) {
			return value.trim();
		}
	}

	return null;
}

async function createUploadedMaterial(
	request: Request,
	currentUser: AuthUser,
	groupId: string,
	set: RouteSet,
) {
	const formData = await request.formData();
	const file = formData.get("file");

	if (!(file instanceof File)) {
		set.status = 400;
		return { message: "Missing file field." };
	}

	if (file.size === 0 || file.size > MAX_FILE_SIZE) {
		set.status = 400;
		return { message: "File must be between 1 byte and 10 MB." };
	}

	const extension = getFileExtension(file.name);
	const allowedMimeType = ALLOWED_EXTENSIONS.get(extension);
	if (!allowedMimeType) {
		set.status = 400;
		return {
			message: `Unsupported file type ".${extension}". Allowed: ${[...ALLOWED_EXTENSIONS.keys()].join(", ")}.`,
		};
	}

	const courseName = getRequiredFormValue(formData, ["course", "courseName"]);
	if (!courseName) {
		set.status = 400;
		return { message: "Course name is required." };
	}

	const title = getRequiredFormValue(formData, ["title"]) ?? file.name;
	const storedName = `${crypto.randomUUID()}.${extension}`;
	const fileUrl = `/files/${storedName}`;
	await Bun.write(join(UPLOADS_DIR, storedName), await file.arrayBuffer());

	const insertedMaterial = db
		.insert(materials)
		.values({
			groupId,
			courseName: courseName.slice(0, 200),
			title: title.slice(0, 200),
			fileUrl,
			fileSize: file.size,
			mimeType: file.type || allowedMimeType,
			uploadedBy: currentUser.id,
			createdAt: getCurrentTimestamp(),
		})
		.returning()
		.get();

	set.status = 201;
	return {
		material: {
			...insertedMaterial,
			authorName: currentUser.displayName,
		},
	};
}

export const materialsRoutes = new Elysia({ prefix: "/materials" })
	.get(
		"/",
		async ({ headers, query, set }) => {
			const auth = await requireAuth(headers.authorization, set);
			if (!auth.user) return auth.response;

			const courseName = query.course?.trim();

			// Widok per przedmiot (?course=) jest GLOBALNY - kazdy zalogowany,
			// kto otworzy przedmiot, widzi wszystkie jego pliki niezaleznie od
			// grupy autora. Widok bez parametru pozostaje group-scoped.
			if (courseName) {
				const rows = db
					.select({
						id: materials.id,
						groupId: materials.groupId,
						courseName: materials.courseName,
						title: materials.title,
						fileUrl: materials.fileUrl,
						fileSize: materials.fileSize,
						mimeType: materials.mimeType,
						uploadedBy: materials.uploadedBy,
						createdAt: materials.createdAt,
						authorName: users.displayName,
					})
					.from(materials)
					.innerJoin(users, eq(materials.uploadedBy, users.id))
					.where(eq(materials.courseName, courseName))
					.orderBy(desc(materials.createdAt), desc(materials.id))
					.all();

				return {
					groupId: auth.user.groupId ?? "",
					materials: rows,
				};
			}

			const group = requireGroupMembership(auth.user, set);
			if (!group.groupId) return group.response;

			const where = eq(materials.groupId, group.groupId);

			const rows = db
				.select({
					id: materials.id,
					groupId: materials.groupId,
					courseName: materials.courseName,
					title: materials.title,
					fileUrl: materials.fileUrl,
					fileSize: materials.fileSize,
					mimeType: materials.mimeType,
					uploadedBy: materials.uploadedBy,
					createdAt: materials.createdAt,
					authorName: users.displayName,
				})
				.from(materials)
				.innerJoin(users, eq(materials.uploadedBy, users.id))
				.where(where)
				.orderBy(desc(materials.createdAt), desc(materials.id))
				.all();

			return {
				groupId: group.groupId,
				materials: rows,
			};
		},
		{
			query: t.Object({
				course: t.Optional(t.String({ maxLength: 200 })),
			}),
		},
	)
	.post("/", async ({ headers, request, set }) => {
		const auth = await requireAuth(headers.authorization, set);
		if (!auth.user) return auth.response;

		const group = requireGroupMembership(auth.user, set);
		if (!group.groupId) return group.response;

		return createUploadedMaterial(request, auth.user, group.groupId, set);
	})
	.post("/upload", async ({ headers, request, set }) => {
		const auth = await requireAuth(headers.authorization, set);
		if (!auth.user) return auth.response;

		const group = requireGroupMembership(auth.user, set);
		if (!group.groupId) return group.response;

		return createUploadedMaterial(request, auth.user, group.groupId, set);
	})
	.delete(
		"/:id",
		async ({ headers, params, set }) => {
			const auth = await requireAuth(headers.authorization, set);
			if (!auth.user) return auth.response;

			const group = requireGroupMembership(auth.user, set);
			if (!group.groupId) return group.response;

			const material = db
				.select({
					id: materials.id,
					groupId: materials.groupId,
					fileUrl: materials.fileUrl,
				})
				.from(materials)
				.where(eq(materials.id, params.id))
				.get();

			if (!material || material.groupId !== group.groupId) {
				set.status = 404;
				return { message: "Material not found." };
			}

			db.delete(materials).where(eq(materials.id, material.id)).run();

			const storedName = material.fileUrl.startsWith("/files/")
				? material.fileUrl.slice("/files/".length)
				: "";
			if (STORED_NAME_PATTERN.test(storedName)) {
				const filePath = join(UPLOADS_DIR, storedName);
				if (existsSync(filePath)) {
					unlinkSync(filePath);
				}
			}

			return { deleted: true };
		},
		{
			params: t.Object({
				id: t.Numeric({ minimum: 1 }),
			}),
		},
	);

export const filesRoutes = new Elysia().get("/files/:name", async ({ params, set }) => {
	if (!STORED_NAME_PATTERN.test(params.name)) {
		set.status = 404;
		return { message: "File not found." };
	}

	const filePath = join(UPLOADS_DIR, params.name);
	const file = Bun.file(filePath);

	if (!(await file.exists())) {
		set.status = 404;
		return { message: "File not found." };
	}

	const extension = getFileExtension(params.name);
	const contentType = ALLOWED_EXTENSIONS.get(extension) ?? "application/octet-stream";

	return new Response(file, {
		headers: {
			"Content-Type": contentType,
			"Cache-Control": "private, max-age=3600",
		},
	});
});
