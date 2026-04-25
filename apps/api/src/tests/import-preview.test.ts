import { afterAll, describe, expect, test } from "bun:test";
import { unlinkSync } from "fs";
import { Elysia } from "elysia";
import * as XLSX from "xlsx";

const TEST_DB_PATH = `/tmp/syncu-test-import-preview-${Date.now()}-${Math.random()
	.toString(16)
	.slice(2)}.db`;

process.env.DB_PATH = TEST_DB_PATH;

const { timetableRoutes } = await import("../handlers/timetable/index");

function cleanup() {
	try {
		unlinkSync(TEST_DB_PATH);
		unlinkSync(`${TEST_DB_PATH}-wal`);
		unlinkSync(`${TEST_DB_PATH}-shm`);
	} catch {}
}

afterAll(cleanup);

const app = new Elysia().use(timetableRoutes);

function buildWorkbookFile(name = "plan.xlsx") {
	const data: Array<Array<string | number | null>> = [];
	data[0] = [null, null, "ROK II sem 4"];
	data[1] = [null, null, 31, 32];
	data[2] = [null, "sobota"];
	data[3] = [45000, "8.00-10.30", "Algorytmy", "Bazy Danych"];
	data[4] = [null, "10.45-13.15", "Sieci", null];
	data[5] = [null, "Legenda"];
	data[6] = [null, null, "skrot", "imie i nazwisko", null, null, null, null, null, null, null, null, "email"];
	data[7] = [null, null, "AB", "dr Adam Baran", null, null, null, null, null, null, null, null, "adam@pk.edu.pl"];
	data[8] = [];
	data[9] = [];

	const worksheet = XLSX.utils.aoa_to_sheet(data);
	const workbook = XLSX.utils.book_new();
	XLSX.utils.book_append_sheet(workbook, worksheet, "Plan");
	const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

	return new File([buffer], name, {
		type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
	});
}

async function req(file: File | string) {
	const formData = new FormData();

	if (file instanceof File) {
		formData.append("file", file);
	}

	return app.handle(
		new Request("http://localhost/timetable/import", {
			method: "POST",
			body: formData,
		}),
	);
}

describe("POST /timetable/import", () => {
	test("parses uploaded spreadsheet and returns preview payload", async () => {
		const response = await req(buildWorkbookFile());

		expect(response.status).toBe(200);

		const body = (await response.json()) as {
			fileName: string;
			selectedSectionId: string | null;
			sectionCount: number;
			lecturerCount: number;
			data: {
				sections: Array<{ id: string; entries: Array<{ subject: string }> }>;
				lecturers: Array<{ abbr: string }>;
			};
		};

		expect(body.fileName).toBe("plan.xlsx");
		expect(body.selectedSectionId).toBe("31_1");
		expect(body.sectionCount).toBe(2);
		expect(body.lecturerCount).toBe(1);
		expect(body.data.sections[0].entries[0].subject).toBe("Algorytmy");
		expect(body.data.lecturers[0].abbr).toBe("AB");
	});

	test("rejects missing file field", async () => {
		const response = await req("missing");

		expect(response.status).toBe(400);
		expect(await response.json()).toEqual({
			message: "Missing file field.",
		});
	});

	test("rejects unsupported file extension", async () => {
		const response = await req(new File(["plain text"], "plan.txt", { type: "text/plain" }));

		expect(response.status).toBe(400);
		expect(await response.json()).toEqual({
			message: "File must be in .xls or .xlsx format.",
		});
	});
});
