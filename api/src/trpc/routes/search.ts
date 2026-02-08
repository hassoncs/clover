import { z } from "zod";
import { router, publicProcedure } from "../index";

const searchResultItemSchema = z.object({
  id: z.string(),
  type: z.enum(["icon", "spriteSheet", "tileSheet", "image"]),
  source: z.enum(["iconify", "kenney", "generated"]),
  name: z.string(),
  previewUrl: z.string(),
  metadata: z.object({
    collection: z.string().optional(),
    license: z.string().optional(),
    width: z.number().optional(),
    height: z.number().optional(),
    frameCount: z.number().optional(),
  }),
});

export type SearchResultItem = z.infer<typeof searchResultItemSchema>;

const searchInputSchema = z.object({
  query: z.string().min(1).max(200),
  limit: z.number().min(1).max(200).default(64),
  start: z.number().min(0).default(0),
});

interface IconifySearchResponse {
  icons: string[];
  total: number;
  limit: number;
  start: number;
  collections: Record<
    string,
    {
      name: string;
      total: number;
      author?: { name: string; url?: string };
      license?: { title: string; spdx?: string };
      height?: number | number[];
      category?: string;
      palette?: boolean;
    }
  >;
}

async function searchIconify(
  query: string,
  limit: number,
  start: number
): Promise<{ results: SearchResultItem[]; total: number; hasMore: boolean; nextStart: number }> {
  const params = new URLSearchParams({
    query,
    limit: String(limit),
    start: String(start),
  });

  const response = await fetch(`https://api.iconify.design/search?${params}`);
  if (!response.ok) {
    throw new Error(`Iconify API error: ${response.status}`);
  }

  const data = (await response.json()) as IconifySearchResponse;

  const results: SearchResultItem[] = data.icons.map((iconId) => {
    const [prefix, name] = iconId.split(":");
    const collection = data.collections[prefix];

    return {
      id: iconId,
      type: "icon" as const,
      source: "iconify" as const,
      name,
      previewUrl: `https://api.iconify.design/${prefix}/${name}.svg?height=128&color=%23E8E9EC`,
      metadata: {
        collection: collection?.name,
        license: collection?.license?.title,
      },
    };
  });

  const nextStart = start + data.icons.length;
  const hasMore = data.icons.length === limit;

  return { results, total: data.total, hasMore, nextStart };
}

export const searchRouter = router({
  query: publicProcedure
    .input(searchInputSchema)
    .query(async ({ input }) => {
      const { query, limit, start } = input;
      return searchIconify(query, limit, start);
    }),
});
