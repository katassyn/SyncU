import { eq } from "drizzle-orm";
import { db } from "../../db/client";
import { users } from "../../db/schema";

export type AuthUser = {
	id: number;
	email: string;
	displayName: string;
	university: string | null;
	fieldOfStudy: string | null;
	yearOfStudy: number | null;
	groupId: string | null;
	createdAt: string;
	updatedAt: string;
};

type JwtPayload = {
	sub: number;
	email: string;
	iat: number;
	exp: number;
};

export function getCurrentTimestamp(): string {
	return new Date().toISOString();
}

export function getCurrentUnixTimestamp(): number {
	return Math.floor(Date.now() / 1000);
}

export function generateSalt(): string {
	return Array.from(crypto.getRandomValues(new Uint8Array(16)))
		.map((byte) => byte.toString(16).padStart(2, "0"))
		.join("");
}

function getJwtSecret(): string {
	return process.env.JWT_SECRET ?? "syncu-dev-secret";
}

function encodeBase64Url(input: string | Uint8Array): string {
	const bytes = typeof input === "string" ? new TextEncoder().encode(input) : input;
	let binary = "";
	for (const byte of bytes) {
		binary += String.fromCharCode(byte);
	}
	return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export async function signJwt(payload: Record<string, unknown>): Promise<string> {
	const header = {
		alg: "HS256",
		typ: "JWT",
	};

	const encodedHeader = encodeBase64Url(JSON.stringify(header));
	const encodedPayload = encodeBase64Url(JSON.stringify(payload));
	const data = `${encodedHeader}.${encodedPayload}`;

	const cryptoKey = await crypto.subtle.importKey(
		"raw",
		new TextEncoder().encode(getJwtSecret()),
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["sign"],
	);
	const signature = await crypto.subtle.sign(
		"HMAC",
		cryptoKey,
		new TextEncoder().encode(data),
	);

	return `${data}.${encodeBase64Url(new Uint8Array(signature))}`;
}

function decodeBase64Url(input: string): string {
	const base64 = input.replace(/-/g, "+").replace(/_/g, "/");
	const padding = "=".repeat((4 - (base64.length % 4)) % 4);
	return atob(`${base64}${padding}`);
}

function isJwtPayload(value: unknown): value is JwtPayload {
	const candidate = value as Record<string, unknown> | null;

	return (
		!!candidate &&
		typeof candidate === "object" &&
		typeof candidate.sub === "number" &&
		typeof candidate.email === "string" &&
		typeof candidate.iat === "number" &&
		typeof candidate.exp === "number"
	);
}

export async function verifyJwt(token: string): Promise<JwtPayload | null> {
	const parts = token.split(".");

	if (parts.length !== 3) {
		return null;
	}

	const [encodedHeader, encodedPayload, encodedSignature] = parts;
	const data = `${encodedHeader}.${encodedPayload}`;
	let signatureBytes: Uint8Array;
	let payload: unknown;

	try {
		signatureBytes = Uint8Array.from(decodeBase64Url(encodedSignature), (char) =>
			char.charCodeAt(0),
		);
		payload = JSON.parse(decodeBase64Url(encodedPayload));
	} catch {
		return null;
	}

	const cryptoKey = await crypto.subtle.importKey(
		"raw",
		new TextEncoder().encode(getJwtSecret()),
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["verify"],
	);
	const isValid = await crypto.subtle.verify(
		"HMAC",
		cryptoKey,
		signatureBytes,
		new TextEncoder().encode(data),
	);

	if (!isValid || !isJwtPayload(payload)) {
		return null;
	}

	if (payload.exp <= getCurrentUnixTimestamp()) {
		return null;
	}

	return payload;
}

export function toAuthUser(user: AuthUser) {
	return {
		id: user.id,
		email: user.email,
		displayName: user.displayName,
		university: user.university,
		fieldOfStudy: user.fieldOfStudy,
		yearOfStudy: user.yearOfStudy,
		groupId: user.groupId,
		createdAt: user.createdAt,
		updatedAt: user.updatedAt,
	};
}

export async function getAuthenticatedUser(authorization?: string): Promise<AuthUser | null> {
	if (!authorization?.startsWith("Bearer ")) {
		return null;
	}

	const token = authorization.slice("Bearer ".length).trim();
	const payload = await verifyJwt(token);

	if (!payload) {
		return null;
	}

	const user = db
		.select({
			id: users.id,
			email: users.email,
			displayName: users.displayName,
			university: users.university,
			fieldOfStudy: users.fieldOfStudy,
			yearOfStudy: users.yearOfStudy,
			groupId: users.groupId,
			createdAt: users.createdAt,
			updatedAt: users.updatedAt,
		})
		.from(users)
		.where(eq(users.id, payload.sub))
		.get();

	return user ?? null;
}
