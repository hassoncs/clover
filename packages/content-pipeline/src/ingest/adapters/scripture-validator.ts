const MAX_REASONABLE_CHAPTER = 150;
const MAX_REASONABLE_VERSE = 176;

export const BIBLE_BOOKS = [
	"Genesis",
	"Exodus",
	"Leviticus",
	"Numbers",
	"Deuteronomy",
	"Joshua",
	"Judges",
	"Ruth",
	"1 Samuel",
	"2 Samuel",
	"1 Kings",
	"2 Kings",
	"1 Chronicles",
	"2 Chronicles",
	"Ezra",
	"Nehemiah",
	"Esther",
	"Job",
	"Psalms",
	"Proverbs",
	"Ecclesiastes",
	"Song of Solomon",
	"Isaiah",
	"Jeremiah",
	"Lamentations",
	"Ezekiel",
	"Daniel",
	"Hosea",
	"Joel",
	"Amos",
	"Obadiah",
	"Jonah",
	"Micah",
	"Nahum",
	"Habakkuk",
	"Zephaniah",
	"Haggai",
	"Zechariah",
	"Malachi",
	"Matthew",
	"Mark",
	"Luke",
	"John",
	"Acts",
	"Romans",
	"1 Corinthians",
	"2 Corinthians",
	"Galatians",
	"Ephesians",
	"Philippians",
	"Colossians",
	"1 Thessalonians",
	"2 Thessalonians",
	"1 Timothy",
	"2 Timothy",
	"Titus",
	"Philemon",
	"Hebrews",
	"James",
	"1 Peter",
	"2 Peter",
	"1 John",
	"2 John",
	"3 John",
	"Jude",
	"Revelation",
] as const;

const BOOK_ABBREVIATIONS: Record<string, string> = {
	gen: "Genesis",
	exod: "Exodus",
	lev: "Leviticus",
	num: "Numbers",
	deut: "Deuteronomy",
	jos: "Joshua",
	judg: "Judges",
	rut: "Ruth",
	"1 sam": "1 Samuel",
	"2 sam": "2 Samuel",
	"1 kgs": "1 Kings",
	"2 kgs": "2 Kings",
	"1 chr": "1 Chronicles",
	"2 chr": "2 Chronicles",
	ezr: "Ezra",
	neh: "Nehemiah",
	est: "Esther",
	ps: "Psalms",
	psa: "Psalms",
	prov: "Proverbs",
	eccl: "Ecclesiastes",
	ecc: "Ecclesiastes",
	song: "Song of Solomon",
	sos: "Song of Solomon",
	isa: "Isaiah",
	jer: "Jeremiah",
	lam: "Lamentations",
	ezek: "Ezekiel",
	dan: "Daniel",
	hos: "Hosea",
	obad: "Obadiah",
	hab: "Habakkuk",
	zeph: "Zephaniah",
	zech: "Zechariah",
	mal: "Malachi",
	mat: "Matthew",
	matt: "Matthew",
	luk: "Luke",
	rom: "Romans",
	"1 cor": "1 Corinthians",
	"2 cor": "2 Corinthians",
	gal: "Galatians",
	eph: "Ephesians",
	phil: "Philippians",
	col: "Colossians",
	"1 thess": "1 Thessalonians",
	"2 thess": "2 Thessalonians",
	"1 tim": "1 Timothy",
	"2 tim": "2 Timothy",
	phlm: "Philemon",
	heb: "Hebrews",
	jas: "James",
	"1 pet": "1 Peter",
	"2 pet": "2 Peter",
	"1 john": "1 John",
	"2 john": "2 John",
	"3 john": "3 John",
	rev: "Revelation",
};

function normalizeBook(input: string): string {
	return input.toLowerCase().replaceAll(".", "").replace(/\s+/g, " ").trim();
}

function resolveBook(book: string): string | null {
	const normalized = normalizeBook(book);

	for (const canonical of BIBLE_BOOKS) {
		if (normalizeBook(canonical) === normalized) {
			return canonical;
		}
	}

	return BOOK_ABBREVIATIONS[normalized] ?? null;
}

export interface ParsedScriptureRef {
	book: string;
	chapter: number;
	verseStart: number;
	verseEnd?: number;
}

export function parseScriptureRef(ref: string): ParsedScriptureRef | null {
	const match = ref
		.trim()
		.match(/^(.+?)\s+(\d{1,3}):(\d{1,3})(?:-(\d{1,3}))?$/);

	if (!match) {
		return null;
	}

	const [, rawBook, rawChapter, rawVerseStart, rawVerseEnd] = match;
	if (!rawBook || !rawChapter || !rawVerseStart) {
		return null;
	}

	const book = resolveBook(rawBook);
	if (!book) {
		return null;
	}

	const chapter = Number(rawChapter);
	const verseStart = Number(rawVerseStart);
	const verseEnd = rawVerseEnd ? Number(rawVerseEnd) : undefined;

	if (
		!Number.isInteger(chapter) ||
		!Number.isInteger(verseStart) ||
		chapter < 1 ||
		verseStart < 1 ||
		chapter > MAX_REASONABLE_CHAPTER ||
		verseStart > MAX_REASONABLE_VERSE
	) {
		return null;
	}

	if (verseEnd !== undefined) {
		if (
			!Number.isInteger(verseEnd) ||
			verseEnd < verseStart ||
			verseEnd > MAX_REASONABLE_VERSE
		) {
			return null;
		}
	}

	return {
		book,
		chapter,
		verseStart,
		...(verseEnd ? { verseEnd } : {}),
	};
}

export function isValidScriptureRef(ref: string): boolean {
	return parseScriptureRef(ref) !== null;
}
