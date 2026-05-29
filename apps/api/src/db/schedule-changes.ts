import type { ScheduleData, ScheduleEntry } from "@syncu/types";

export type ScheduleChangeType = "added" | "removed" | "modified";

export type FlattenedScheduleEntry = ScheduleEntry & {
	scheduleId: string;
	sectionId: string;
	label: string;
	yearSemLabel: string;
	groupId: string;
	subjectNormalized: string;
	normalizedDate: string;
	normalizedTime: string;
};

export type DetectedScheduleChange = {
	scheduleId: string;
	changeType: ScheduleChangeType;
	prevDataJson: string | null;
};

function normalizeDate(date: string): string {
	const trimmed = date.trim();
	if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;

	const match = /^(\d{1,2})\.(\d{1,2})$/.exec(trimmed);
	if (!match) return trimmed;

	const [, day, month] = match;
	return `${day.padStart(2, "0")}.${month.padStart(2, "0")}`;
}

function normalizeTime(time: string): string {
	return time
		.trim()
		.replace(/\s+/g, "")
		.replace(/\./g, ":")
		.replace(/(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})/, (_, sh, sm, eh, em) => {
			return `${String(sh).padStart(2, "0")}:${sm}-${String(eh).padStart(2, "0")}:${em}`;
		});
}

function buildScheduleId(sectionId: string, entry: Pick<FlattenedScheduleEntry, "normalizedDate" | "normalizedTime" | "subjectNormalized">): string {
	return `${sectionId}|${entry.normalizedDate}|${entry.normalizedTime}|${entry.subjectNormalized}`;
}

export function serializeFlattenedEntry(entry: FlattenedScheduleEntry): string {
	return JSON.stringify({
		scheduleId: entry.scheduleId,
		sectionId: entry.sectionId,
		label: entry.label,
		yearSemLabel: entry.yearSemLabel,
		groupId: entry.groupId,
		date: entry.date,
		time: entry.time,
		subject: entry.subject,
	});
}

export function flattenScheduleData(
	data: ScheduleData,
	normalizeFn: (value: string) => string,
): FlattenedScheduleEntry[] {
	return data.sections.flatMap((section) =>
		section.entries.map((entry) => {
			const subjectNormalized = normalizeFn(entry.subject);
			const normalizedDate = normalizeDate(entry.date);
			const normalizedTime = normalizeTime(entry.time);

			return {
				...entry,
				scheduleId: buildScheduleId(section.id, {
					normalizedDate,
					normalizedTime,
					subjectNormalized,
				}),
				sectionId: section.id,
				label: section.label,
				yearSemLabel: section.yearSemLabel,
				groupId: String(section.groupId),
				subjectNormalized,
				normalizedDate,
				normalizedTime,
			};
		}),
	);
}

function takeMatchingIndex(
	entries: FlattenedScheduleEntry[],
	candidate: FlattenedScheduleEntry,
	matcher: (entry: FlattenedScheduleEntry, candidate: FlattenedScheduleEntry) => boolean,
): number {
	return entries.findIndex((entry) => matcher(entry, candidate));
}

export function detectScheduleChanges(
	previousData: ScheduleData | null,
	nextData: ScheduleData,
	normalizeFn: (value: string) => string,
): DetectedScheduleChange[] {
	if (!previousData) return [];

	const previousEntries = flattenScheduleData(previousData, normalizeFn);
	const nextEntries = flattenScheduleData(nextData, normalizeFn);
	const unmatchedPrevious = [...previousEntries];
	const unmatchedNext = [...nextEntries];
	const changes: DetectedScheduleChange[] = [];

	for (let i = unmatchedNext.length - 1; i >= 0; i--) {
		const nextEntry = unmatchedNext[i];
		const previousIndex = takeMatchingIndex(
			unmatchedPrevious,
			nextEntry,
			(entry, candidate) => entry.scheduleId === candidate.scheduleId,
		);

		if (previousIndex >= 0) {
			unmatchedPrevious.splice(previousIndex, 1);
			unmatchedNext.splice(i, 1);
		}
	}

	for (let i = unmatchedNext.length - 1; i >= 0; i--) {
		const nextEntry = unmatchedNext[i];
		const previousIndex = takeMatchingIndex(
			unmatchedPrevious,
			nextEntry,
			(entry, candidate) =>
				entry.sectionId === candidate.sectionId &&
				entry.normalizedDate === candidate.normalizedDate &&
				entry.subjectNormalized === candidate.subjectNormalized,
		);

		if (previousIndex >= 0) {
			const previousEntry = unmatchedPrevious[previousIndex];
			changes.push({
				scheduleId: nextEntry.scheduleId,
				changeType: "modified",
				prevDataJson: serializeFlattenedEntry(previousEntry),
			});
			unmatchedPrevious.splice(previousIndex, 1);
			unmatchedNext.splice(i, 1);
		}
	}

	for (let i = unmatchedNext.length - 1; i >= 0; i--) {
		const nextEntry = unmatchedNext[i];
		const previousIndex = takeMatchingIndex(
			unmatchedPrevious,
			nextEntry,
			(entry, candidate) =>
				entry.sectionId === candidate.sectionId &&
				entry.normalizedDate === candidate.normalizedDate &&
				entry.normalizedTime === candidate.normalizedTime,
		);

		if (previousIndex >= 0) {
			const previousEntry = unmatchedPrevious[previousIndex];
			changes.push({
				scheduleId: nextEntry.scheduleId,
				changeType: "modified",
				prevDataJson: serializeFlattenedEntry(previousEntry),
			});
			unmatchedPrevious.splice(previousIndex, 1);
			unmatchedNext.splice(i, 1);
		}
	}

	for (const entry of unmatchedNext) {
		changes.push({
			scheduleId: entry.scheduleId,
			changeType: "added",
			prevDataJson: null,
		});
	}

	for (const entry of unmatchedPrevious) {
		changes.push({
			scheduleId: entry.scheduleId,
			changeType: "removed",
			prevDataJson: serializeFlattenedEntry(entry),
		});
	}

	return changes;
}
