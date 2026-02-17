import type { ContentType } from "./prompt-loader";

export interface ScheduledPack {
	packId: string;
	brandId: string;
	activateDate: Date;
	deactivateDate: Date;
	contentType: ContentType;
}

const HOLY_WEEK_2026_START = new Date("2026-03-30T00:00:00.000Z");
const HOLY_WEEK_2026_END = new Date("2026-04-06T23:59:59.999Z");
const GOOD_FRIDAY_2026_START = new Date("2026-04-03T00:00:00.000Z");
const GOOD_FRIDAY_2026_END = new Date("2026-04-04T23:59:59.999Z");

export const SCHEDULED_PACKS: ScheduledPack[] = [
	{
		packId: "amen-easter-special",
		brandId: "amen",
		activateDate: HOLY_WEEK_2026_START,
		deactivateDate: HOLY_WEEK_2026_END,
		contentType: "trivia",
	},
	{
		packId: "amen-easter-special",
		brandId: "amen",
		activateDate: HOLY_WEEK_2026_START,
		deactivateDate: HOLY_WEEK_2026_END,
		contentType: "quip",
	},
	{
		packId: "amen-easter-special",
		brandId: "amen",
		activateDate: HOLY_WEEK_2026_START,
		deactivateDate: HOLY_WEEK_2026_END,
		contentType: "fibbage",
	},
	{
		packId: "amen-easter-special",
		brandId: "amen",
		activateDate: HOLY_WEEK_2026_START,
		deactivateDate: HOLY_WEEK_2026_END,
		contentType: "estimation",
	},
	{
		packId: "amen-easter-special",
		brandId: "amen",
		activateDate: HOLY_WEEK_2026_START,
		deactivateDate: HOLY_WEEK_2026_END,
		contentType: "drawing",
	},
	{
		packId: "amen-easter-special",
		brandId: "amen",
		activateDate: HOLY_WEEK_2026_START,
		deactivateDate: HOLY_WEEK_2026_END,
		contentType: "ranking",
	},
	{
		packId: "amen-easter-special",
		brandId: "amen",
		activateDate: HOLY_WEEK_2026_START,
		deactivateDate: HOLY_WEEK_2026_END,
		contentType: "wyr",
	},
	{
		packId: "amen-easter-special",
		brandId: "amen",
		activateDate: HOLY_WEEK_2026_START,
		deactivateDate: HOLY_WEEK_2026_END,
		contentType: "headsup",
	},
	{
		packId: "amen-good-friday",
		brandId: "amen",
		activateDate: GOOD_FRIDAY_2026_START,
		deactivateDate: GOOD_FRIDAY_2026_END,
		contentType: "trivia",
	},
	{
		packId: "amen-good-friday",
		brandId: "amen",
		activateDate: GOOD_FRIDAY_2026_START,
		deactivateDate: GOOD_FRIDAY_2026_END,
		contentType: "quip",
	},
	{
		packId: "amen-good-friday",
		brandId: "amen",
		activateDate: GOOD_FRIDAY_2026_START,
		deactivateDate: GOOD_FRIDAY_2026_END,
		contentType: "wyr",
	},
];

function isDateWithinRange(
	date: Date,
	activateDate: Date,
	deactivateDate: Date,
): boolean {
	return date >= activateDate && date <= deactivateDate;
}

export function getActivePacks(
	brandId: string,
	date: Date = new Date(),
): ScheduledPack[] {
	return SCHEDULED_PACKS.filter((pack) => {
		return (
			pack.brandId === brandId &&
			isDateWithinRange(date, pack.activateDate, pack.deactivateDate)
		);
	});
}

export function isPackActive(packId: string, date: Date = new Date()): boolean {
	return SCHEDULED_PACKS.some((pack) => {
		return (
			pack.packId === packId &&
			isDateWithinRange(date, pack.activateDate, pack.deactivateDate)
		);
	});
}

export function getActivePacksForType(
	brandId: string,
	contentType: ContentType,
	date: Date = new Date(),
): ScheduledPack[] {
	return getActivePacks(brandId, date).filter((pack) => {
		return pack.contentType === contentType;
	});
}
