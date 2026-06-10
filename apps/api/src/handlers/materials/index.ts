import { mkdirSync } from "fs";
import { join, resolve } from "path";
import { desc, eq } from "drizzle-orm";
import { Elysia, t } from "elysia";
import { db } from "../../db/client";
import { materials, users } from "../../db/schema";
import { getAuthenticatedUser, getCurrentTimestamp } from "../auth/shared";

/**
 * G-14: materialy wspoldzielone w ramach grupy.
 * Materialy sa przypisane do grupy (group_id z profilu autora w momencie
 * dodania) + opcjonalnie do przedmiotu po NAZWIE (courseName), bo courseId
 * jest per-user (kazdy user ma wlasne courses z wlasnego importu).
 *
 *  - GET  /materials        -> { groupId, materials: [{ ..., authorName }] }
 *  - POST /materials        -> 201 { material } (link / tekst)
 *  - POST /materials/upload -> 201 { material } (multipart z plikiem na dysku)
 *  - GET  /files/:name      -> serwowanie wgranego pliku (nazwy to losowe UUID,
 *                              wiec URL jest niezgadywalny; bez Bearera, zeby
 *                              dzialy zwykle <a href> z przegladarki)
 */

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

const MATERIAL_KINDS = new Set(["notatki", "link", "zadania", "inne"]);

function getFileExtension(fileName: string): string {
	const dotIndex = fileName.lastIndexOf(".");
	return dotIndex === -1 ? "" : fileName.slice(dotIndex + 1).toLowerCase();
}

/** Nazwy plikow na dysku: wylacznie "<uuid>.<ext>" - zero path traversal. */
const STORED_NAME_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.[a-z0-9]{1,8}$/;

const createMaterialBody = t.Object({
	title: t.String({ minLength: 1, maxLength: 200 }),
	kind: t.Union([
		t.Literal("notatki"),
		t.Literal("link"),
		t.Literal("zadania"),
		t.Literal("inne"),
	]),
	url: t.Optional(t.Nullable(t.String({ maxLength: 2000 }))),
	content: t.Optional(t.Nullable(t.String({ maxLength: 5000 }))),
	courseName: t.Optional(t.Nullable(t.String({ maxLength: 200 }))),
});

export const materialsRoutes = new Elysia({ prefix: "/materials" })
	.get("/", async ({ headers, set }) => {
		const currentUser = await getAuthenticatedUser(headers.authorization);

		if (!currentUser) {
			set.status = 401;
			return {
				message: "Unauthorized.",
			};
		}

		if (!currentUser.groupId) {
			set.status = 400;
			return {
				message: "User has no group selected.",
			};
		}

		const rows = db
			.select({
				id: materials.id,
				userId: materials.userId,
				groupId: materials.groupId,
				courseName: materials.courseName,
				title: materials.title,
				kind: materials.kind,
				url: materials.url,
				content: materials.content,
				fileName: materials.fileName,
				createdAt: materials.createdAt,
				authorName: users.displayName,
			})
			.from(materials)
			.innerJoin(users, eq(materials.userId, users.id))
			.where(eq(materials.groupId, currentUser.groupId))
			.orderBy(desc(materials.createdAt), desc(materials.id))
			.all();

		return {
			groupId: currentUser.groupId,
			materials: rows,
		};
	})
	.post(
		"/",
		async ({ headers, body, set }) => {
			const currentUser = await getAuthenticatedUser(headers.authorization);

			if (!currentUser) {
				set.status = 401;
				return {
					message: "Unauthorized.",
				};
			}

			if (!currentUser.groupId) {
				set.status = 400;
				return {
					message: "User has no group selected.",
				};
			}

			const insertedMaterial = db
				.insert(materials)
				.values({
					userId: currentUser.id,
					groupId: currentUser.groupId,
					courseName: body.courseName?.trim() || null,
					title: body.title,
					kind: body.kind,
					url: body.url?.trim() || null,
					content: body.content?.trim() || null,
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
		},
		{
			body: createMaterialBody,
		},
	)
	.post("/upload", async ({ headers, request, set }) => {
		const currentUser = await getAuthenticatedUser(headers.authorization);

		if (!currentUser) {
			set.status = 401;
			return {
				message: "Unauthorized.",
			};
		}

		if (!currentUser.groupId) {
			set.status = 400;
			return {
				message: "User has no group selected.",
			};
		}

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
		if (!ALLOWED_EXTENSIONS.has(extension)) {
			set.status = 400;
			return {
				message: `Unsupported file type ".${extension}". Allowed: ${[...ALLOWED_EXTENSIONS.keys()].join(", ")}.`,
			};
		}

		const rawTitle = formData.get("title");
		const title =
			(typeof rawTitle === "string" ? rawTitle.trim() : "").slice(0, 200) || file.name;

		const rawKind = formData.get("kind");
		const kind =
			typeof rawKind === "string" && MATERIAL_KINDS.has(rawKind) ? rawKind : "notatki";

		const rawCourseName = formData.get("courseName");
		const courseName =
			typeof rawCourseName === "string" && rawCourseName.trim()
				? rawCourseName.trim().slice(0, 200)
				: null;

		const storedName = `${crypto.randomUUID()}.${extension}`;
		await Bun.write(join(UPLOADS_DIR, storedName), await file.arrayBuffer());

		const insertedMaterial = db
			.insert(materials)
			.values({
				userId: currentUser.id,
				groupId: currentUser.groupId,
				courseName,
				title,
				kind,
				url: `/files/${storedName}`,
				content: null,
				fileName: file.name,
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
	});

/**
 * Serwowanie wgranych plikow. Osobna instancja (bez prefiksu /materials).
 * Walidacja nazwy regexem (UUID.ext) wyklucza path traversal.
 */
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

	// Oryginalna nazwa pliku do Content-Disposition (jesli material istnieje)
	const material = db
		.select({ fileName: materials.fileName })
		.from(materials)
		.where(eq(materials.url, `/files/${params.name}`))
		.get();
	// Naglowki HTTP musza byc ASCII - polskie znaki leca do filename* (RFC 5987),
	// a fallback `filename=` dostaje wersje przefiltrowana.
	const originalName = material?.fileName ?? params.name;
	const downloadName = originalName.replace(/[^\x20-\x7E]/g, "_").replace(/["\\]/g, "_");

	return new Response(file, {
		headers: {
			"Content-Type": contentType,
			"Content-Disposition": `inline; filename="${downloadName}"; filename*=UTF-8''${encodeURIComponent(originalName)}`,
			"Cache-Control": "private, max-age=3600",
		},
	});
});
