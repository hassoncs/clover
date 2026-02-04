# Themes Management UI Implementation Plan

## TL;DR

Add a **Themes** tab to the app with CRUD functionality, search, pagination, and AI prompt enhancement.

**Category**: `visual-engineering` + `unspecified-high`
**Skills**: `frontend-ui-ux`, `test-driven-development`, `verification-before-completion`

---

## Context

### What Exists
- `themes` table in D1 with: id, name, prompt_modifier, style, creator_user_id, is_public, created_at, updated_at, deleted_at
- Basic tRPC router at `api/src/trpc/routes/asset-system.ts` lines 1547-1645 with create/update/delete/get/list/listPublic
- Browse page pattern at `app/app/(tabs)/browse.tsx` with FilterBar, GameCard, pagination
- Shared types at `shared/src/types/asset-system.ts`

### What's Missing
- Pagination/search on list endpoints
- AI prompt enhancement endpoint
- Themes tab UI page
- Theme components (ThemeCard, ThemeFilterBar, ThemeEditorModal)
- Theme details screen
- thumbnailUrl field for future preview images

### Design Decisions (Confirmed)
- Navigation: New tab `(tabs)/themes.tsx`
- Layout: Two sections - "My Themes" + "Public Themes"
- Search: Name OR prompt matching
- Pagination: Load more (append pages)
- AI Enhancement: Manual button → editable result → Save
- Cards: Text-only now, but add thumbnailUrl plumbing
- Testing: API vitest + manual UI QA

---

## Tasks

### Task 1: Add thumbnail_url to themes (DB + types + API mapping) ✅

**Files to modify:**
- `api/schema.sql` - Add `thumbnail_url TEXT` to themes table
- `api/src/trpc/routes/asset-system.ts` - Update ThemeRow interface and toClientTheme()
- `shared/src/types/asset-system.ts` - Add thumbnailUrl to ThemeSchema

**Changes:**

1. In `api/schema.sql` around line 79, add after `deleted_at INTEGER`:
```sql
  thumbnail_url TEXT
```

2. In `api/src/trpc/routes/asset-system.ts`, update ThemeRow interface (line ~48-58):
```typescript
interface ThemeRow {
  id: string;
  name: string;
  prompt_modifier: string;
  style: string | null;
  creator_user_id: string | null;
  is_public: number;
  created_at: number;
  updated_at: number | null;
  deleted_at: number | null;
  thumbnail_url: string | null;  // ADD THIS
}
```

3. Update toClientTheme() (line ~157-168):
```typescript
function toClientTheme(row: ThemeRow) {
  return {
    id: row.id,
    name: row.name,
    promptModifier: row.prompt_modifier,
    style: row.style as 'pixel' | 'cartoon' | '3d' | 'flat' | null,
    creatorUserId: row.creator_user_id,
    isPublic: Boolean(row.is_public),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    thumbnailUrl: row.thumbnail_url,  // ADD THIS
  };
}
```

4. In `shared/src/types/asset-system.ts`, update ThemeSchema (line ~6-15):
```typescript
export const ThemeSchema = z.object({
  id: z.string(),
  name: z.string(),
  promptModifier: z.string(),
  style: z.enum(['pixel', 'cartoon', '3d', 'flat']).optional().nullable(),
  creatorUserId: z.string().optional().nullable(),
  isPublic: z.boolean(),
  createdAt: z.number(),
  updatedAt: z.number().optional().nullable(),
  thumbnailUrl: z.string().optional().nullable(),  // ADD THIS
});
```

**Verification:**
- `pnpm tsc --noEmit` passes
- Note: Local DB needs reset or ALTER TABLE for existing DBs

---

### Task 2: Add pagination + search to themes.list and themes.listPublic ✅

**File:** `api/src/trpc/routes/asset-system.ts`

**Changes to themes.list (line ~1629-1635):**

Replace current implementation with:
```typescript
list: protectedProcedure
  .input(z.object({
    limit: z.number().min(1).max(100).default(20),
    offset: z.number().min(0).default(0),
    query: z.string().optional(),
  }).optional())
  .query(async ({ ctx, input }) => {
    const { limit = 20, offset = 0, query } = input ?? {};
    
    let sql = 'SELECT * FROM themes WHERE creator_user_id = ? AND deleted_at IS NULL';
    const params: (string | number)[] = [ctx.user.id];
    
    if (query && query.trim()) {
      sql += ' AND (LOWER(name) LIKE ? OR LOWER(prompt_modifier) LIKE ?)';
      const searchPattern = `%${query.toLowerCase()}%`;
      params.push(searchPattern, searchPattern);
    }
    
    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);
    
    const result = await ctx.env.DB.prepare(sql).bind(...params).all<ThemeRow>();
    return result.results.map(toClientTheme);
  }),
```

**Changes to themes.listPublic (line ~1638-1644):**

Replace current implementation with:
```typescript
listPublic: publicProcedure
  .input(z.object({
    limit: z.number().min(1).max(100).default(20),
    offset: z.number().min(0).default(0),
    query: z.string().optional(),
  }).optional())
  .query(async ({ ctx, input }) => {
    const { limit = 20, offset = 0, query } = input ?? {};
    
    let sql = 'SELECT * FROM themes WHERE is_public = 1 AND deleted_at IS NULL';
    const params: (string | number)[] = [];
    
    if (query && query.trim()) {
      sql += ' AND (LOWER(name) LIKE ? OR LOWER(prompt_modifier) LIKE ?)';
      const searchPattern = `%${query.toLowerCase()}%`;
      params.push(searchPattern, searchPattern);
    }
    
    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);
    
    const result = await ctx.env.DB.prepare(sql).bind(...params).all<ThemeRow>();
    return result.results.map(toClientTheme);
  }),
```

**Verification:**
- `pnpm tsc --noEmit` passes

---

### Task 3: Fix access control on themes.update and themes.delete ✅

**File:** `api/src/trpc/routes/asset-system.ts`

**Changes to themes.update (line ~1566-1603):**

Update the SQL to enforce ownership:
```typescript
// Change line ~1598-1600 from:
await ctx.env.DB.prepare(
  `UPDATE themes SET ${updates.join(', ')} WHERE id = ? AND deleted_at IS NULL`
).bind(...values).run();

// To:
const result = await ctx.env.DB.prepare(
  `UPDATE themes SET ${updates.join(', ')} WHERE id = ? AND creator_user_id = ? AND deleted_at IS NULL`
).bind(...values, ctx.user.id).run();

if (result.meta.changes === 0) {
  throw new TRPCError({ code: 'NOT_FOUND', message: 'Theme not found or not owned by you' });
}
```

**Changes to themes.delete (line ~1605-1613):**

Update to enforce ownership:
```typescript
delete: protectedProcedure
  .input(z.object({ id: z.string() }))
  .mutation(async ({ ctx, input }) => {
    const now = Date.now();
    const result = await ctx.env.DB.prepare(
      'UPDATE themes SET deleted_at = ? WHERE id = ? AND creator_user_id = ?'
    ).bind(now, input.id, ctx.user.id).run();
    
    if (result.meta.changes === 0) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Theme not found or not owned by you' });
    }
    
    return { success: true };
  }),
```

**Verification:**
- `pnpm tsc --noEmit` passes

---

### Task 4: Add themes.getMine endpoint for fetching own private themes ✅

**File:** `api/src/trpc/routes/asset-system.ts`

**Add after themes.get (around line 1627):**

```typescript
getMine: protectedProcedure
  .input(z.object({ id: z.string() }))
  .query(async ({ ctx, input }) => {
    const row = await ctx.env.DB.prepare(
      'SELECT * FROM themes WHERE id = ? AND creator_user_id = ? AND deleted_at IS NULL'
    ).bind(input.id, ctx.user.id).first<ThemeRow>();

    if (!row) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Theme not found' });
    }

    return toClientTheme(row);
  }),
```

**Verification:**
- `pnpm tsc --noEmit` passes

---

### Task 5: Add themes.enhancePrompt mutation (AI prompt enhancement) ✅

**File:** `api/src/trpc/routes/asset-system.ts`

**Add to themes router (after getMine):**

```typescript
enhancePrompt: protectedProcedure
  .input(z.object({
    prompt: z.string().min(1).max(1000),
    name: z.string().optional(),
    style: styleSchema.optional(),
  }))
  .mutation(async ({ ctx, input }) => {
    // Check if AI is configured
    const openrouterKey = ctx.env.OPENROUTER_API_KEY;
    if (!openrouterKey) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'AI enhancement is not configured. Please contact support.',
      });
    }

    const systemPrompt = `You are a game art director. Given a brief theme description, expand it into a detailed, evocative prompt that would guide AI image generation for game assets.

The enhanced prompt should:
- Be 2-3 sentences
- Include specific visual details (colors, textures, lighting, mood)
- Reference art styles or eras if appropriate
- Be suitable for generating game UI elements, sprites, and backgrounds

Only output the enhanced prompt, nothing else.`;

    const userPrompt = input.name 
      ? `Theme name: "${input.name}"\nOriginal prompt: "${input.prompt}"`
      : `Original prompt: "${input.prompt}"`;

    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openrouterKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'openai/gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          max_tokens: 300,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to enhance prompt. Please try again.',
        });
      }

      const data = await response.json() as { choices: Array<{ message: { content: string } }> };
      const enhancedPrompt = data.choices[0]?.message?.content?.trim();

      if (!enhancedPrompt) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'AI returned empty response. Please try again.',
        });
      }

      return { enhancedPrompt };
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to enhance prompt. Please try again.',
      });
    }
  }),
```

**Verification:**
- `pnpm tsc --noEmit` passes

---

### Task 6: Create ThemeCard component ✅

**File to create:** `app/components/themes/ThemeCard.tsx`

```tsx
import { View, Text, Pressable, Image } from 'react-native';

interface ThemeCardProps {
  id: string;
  name: string;
  promptModifier: string;
  style?: string | null;
  isPublic: boolean;
  isOwned: boolean;
  thumbnailUrl?: string | null;
  onPress: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function ThemeCard({
  name,
  promptModifier,
  style,
  isPublic,
  isOwned,
  thumbnailUrl,
  onPress,
  onEdit,
  onDelete,
}: ThemeCardProps) {
  return (
    <Pressable
      className="bg-gray-800 p-4 rounded-xl border border-gray-700 mb-3 active:bg-gray-700"
      onPress={onPress}
    >
      <View className="flex-row items-start">
        {/* Thumbnail placeholder */}
        <View className="w-16 h-16 bg-indigo-900/30 rounded-lg items-center justify-center mr-4 overflow-hidden">
          {thumbnailUrl ? (
            <Image
              source={{ uri: thumbnailUrl }}
              className="w-full h-full"
              resizeMode="cover"
            />
          ) : (
            <Text className="text-3xl">🎨</Text>
          )}
        </View>
        
        <View className="flex-1">
          <View className="flex-row items-center flex-wrap gap-2">
            <Text className="text-lg font-semibold text-white">{name}</Text>
            {isPublic && (
              <View className="px-2 py-0.5 bg-green-600/80 rounded">
                <Text className="text-[10px] text-white font-medium">Public</Text>
              </View>
            )}
            {style && (
              <View className="px-2 py-0.5 bg-gray-700 rounded">
                <Text className="text-[10px] text-gray-300">{style}</Text>
              </View>
            )}
          </View>
          
          <Text className="text-gray-400 mt-1 text-sm" numberOfLines={2}>
            {promptModifier}
          </Text>
          
          {isOwned && (onEdit || onDelete) && (
            <View className="flex-row mt-2 gap-3">
              {onEdit && (
                <Pressable onPress={onEdit}>
                  <Text className="text-indigo-400 text-sm">Edit</Text>
                </Pressable>
              )}
              {onDelete && (
                <Pressable onPress={onDelete}>
                  <Text className="text-red-400 text-sm">Delete</Text>
                </Pressable>
              )}
            </View>
          )}
        </View>
        
        <Text className="text-gray-500 text-xl ml-2">→</Text>
      </View>
    </Pressable>
  );
}
```

**Verification:**
- `pnpm tsc --noEmit` passes

---

### Task 7: Create ThemeFilterBar component ✅

**File to create:** `app/components/themes/ThemeFilterBar.tsx`

```tsx
import { View, Text, TextInput, Pressable } from 'react-native';

interface ThemeFilterBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export function ThemeFilterBar({
  searchQuery,
  onSearchChange,
}: ThemeFilterBarProps) {
  return (
    <View className="mb-4">
      <View className="flex-row items-center bg-gray-800 rounded-xl px-4 py-3 border border-gray-700">
        <Text className="text-gray-400 mr-3">🔍</Text>
        <TextInput
          className="flex-1 text-white text-base"
          placeholder="Search themes..."
          placeholderTextColor="#6B7280"
          value={searchQuery}
          onChangeText={onSearchChange}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {searchQuery.length > 0 && (
          <Pressable onPress={() => onSearchChange('')}>
            <Text className="text-gray-400 text-lg">✕</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}
```

**Verification:**
- `pnpm tsc --noEmit` passes

---

### Task 8: Create useBrowseThemes hook ✅

**File to create:** `app/hooks/useBrowseThemes.ts`

```typescript
import { useState, useCallback, useEffect } from 'react';
import { trpc } from '@/lib/trpc/client';

const PAGE_SIZE = 20;

export function useBrowseThemes(options: { isAuthenticated: boolean }) {
  const { isAuthenticated } = options;
  
  // My themes state
  const [myThemes, setMyThemes] = useState<any[]>([]);
  const [myThemesPage, setMyThemesPage] = useState(0);
  const [hasMoreMyThemes, setHasMoreMyThemes] = useState(true);
  const [isLoadingMyThemes, setIsLoadingMyThemes] = useState(false);
  
  // Public themes state
  const [publicThemes, setPublicThemes] = useState<any[]>([]);
  const [publicThemesPage, setPublicThemesPage] = useState(0);
  const [hasMorePublicThemes, setHasMorePublicThemes] = useState(true);
  const [isLoadingPublicThemes, setIsLoadingPublicThemes] = useState(false);
  
  // Shared state
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchMyThemes = useCallback(async (page: number, query: string, reset = false) => {
    if (!isAuthenticated) return;
    
    setIsLoadingMyThemes(true);
    try {
      const result = await trpc.assetSystem.themes.list.query({
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
        query: query || undefined,
      });
      
      if (reset) {
        setMyThemes(result);
      } else {
        setMyThemes(prev => [...prev, ...result]);
      }
      setHasMoreMyThemes(result.length === PAGE_SIZE);
      setMyThemesPage(page);
    } catch (error) {
      console.error('Failed to fetch my themes:', error);
    } finally {
      setIsLoadingMyThemes(false);
    }
  }, [isAuthenticated]);

  const fetchPublicThemes = useCallback(async (page: number, query: string, reset = false) => {
    setIsLoadingPublicThemes(true);
    try {
      const result = await trpc.assetSystem.themes.listPublic.query({
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
        query: query || undefined,
      });
      
      if (reset) {
        setPublicThemes(result);
      } else {
        setPublicThemes(prev => [...prev, ...result]);
      }
      setHasMorePublicThemes(result.length === PAGE_SIZE);
      setPublicThemesPage(page);
    } catch (error) {
      console.error('Failed to fetch public themes:', error);
    } finally {
      setIsLoadingPublicThemes(false);
    }
  }, []);

  const loadMoreMyThemes = useCallback(() => {
    if (!isLoadingMyThemes && hasMoreMyThemes) {
      fetchMyThemes(myThemesPage + 1, searchQuery);
    }
  }, [fetchMyThemes, isLoadingMyThemes, hasMoreMyThemes, myThemesPage, searchQuery]);

  const loadMorePublicThemes = useCallback(() => {
    if (!isLoadingPublicThemes && hasMorePublicThemes) {
      fetchPublicThemes(publicThemesPage + 1, searchQuery);
    }
  }, [fetchPublicThemes, isLoadingPublicThemes, hasMorePublicThemes, publicThemesPage, searchQuery]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await Promise.all([
      fetchMyThemes(0, searchQuery, true),
      fetchPublicThemes(0, searchQuery, true),
    ]);
    setIsRefreshing(false);
  }, [fetchMyThemes, fetchPublicThemes, searchQuery]);

  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query);
    // Reset and refetch with new query
    setMyThemes([]);
    setPublicThemes([]);
    setMyThemesPage(0);
    setPublicThemesPage(0);
    setHasMoreMyThemes(true);
    setHasMorePublicThemes(true);
    fetchMyThemes(0, query, true);
    fetchPublicThemes(0, query, true);
  }, [fetchMyThemes, fetchPublicThemes]);

  // Initial fetch
  useEffect(() => {
    fetchPublicThemes(0, '', true);
    if (isAuthenticated) {
      fetchMyThemes(0, '', true);
    }
  }, [isAuthenticated]);

  return {
    myThemes,
    publicThemes,
    searchQuery,
    isLoadingMyThemes,
    isLoadingPublicThemes,
    isRefreshing,
    hasMoreMyThemes,
    hasMorePublicThemes,
    loadMoreMyThemes,
    loadMorePublicThemes,
    handleRefresh,
    handleSearchChange,
    refetchAll: handleRefresh,
  };
}
```

**Verification:**
- `pnpm tsc --noEmit` passes

---

### Task 9: Create ThemeEditorModal component ✅

**File to create:** `app/components/themes/ThemeEditorModal.tsx`

```tsx
import { useState, useEffect } from 'react';
import { View, Text, TextInput, Pressable, Modal, ActivityIndicator, ScrollView } from 'react-native';
import { trpc } from '@/lib/trpc/client';

interface ThemeEditorModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: () => void;
  editingTheme?: {
    id: string;
    name: string;
    promptModifier: string;
    style?: string | null;
  } | null;
}

const STYLE_OPTIONS = [
  { value: null, label: 'None' },
  { value: 'pixel', label: 'Pixel' },
  { value: 'cartoon', label: 'Cartoon' },
  { value: '3d', label: '3D' },
  { value: 'flat', label: 'Flat' },
] as const;

export function ThemeEditorModal({
  visible,
  onClose,
  onSave,
  editingTheme,
}: ThemeEditorModalProps) {
  const [name, setName] = useState('');
  const [promptModifier, setPromptModifier] = useState('');
  const [style, setStyle] = useState<string | null>(null);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditing = !!editingTheme;

  useEffect(() => {
    if (editingTheme) {
      setName(editingTheme.name);
      setPromptModifier(editingTheme.promptModifier);
      setStyle(editingTheme.style ?? null);
    } else {
      setName('');
      setPromptModifier('');
      setStyle(null);
    }
    setError(null);
  }, [editingTheme, visible]);

  const handleEnhance = async () => {
    if (!promptModifier.trim()) {
      setError('Enter a prompt to enhance');
      return;
    }
    
    setIsEnhancing(true);
    setError(null);
    try {
      const result = await trpc.assetSystem.themes.enhancePrompt.mutate({
        prompt: promptModifier,
        name: name || undefined,
        style: style as any,
      });
      setPromptModifier(result.enhancedPrompt);
    } catch (err: any) {
      setError(err.message || 'Failed to enhance prompt');
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    if (!promptModifier.trim()) {
      setError('Prompt is required');
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      if (isEditing) {
        await trpc.assetSystem.themes.update.mutate({
          id: editingTheme!.id,
          name: name.trim(),
          promptModifier: promptModifier.trim(),
          style: style as any,
        });
      } else {
        await trpc.assetSystem.themes.create.mutate({
          name: name.trim(),
          promptModifier: promptModifier.trim(),
          style: style as any,
        });
      }
      onSave();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save theme');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-gray-900">
        <View className="flex-row items-center justify-between p-4 border-b border-gray-800">
          <Pressable onPress={onClose}>
            <Text className="text-gray-400 text-lg">Cancel</Text>
          </Pressable>
          <Text className="text-white text-lg font-semibold">
            {isEditing ? 'Edit Theme' : 'New Theme'}
          </Text>
          <Pressable onPress={handleSave} disabled={isSaving}>
            {isSaving ? (
              <ActivityIndicator size="small" color="#818CF8" />
            ) : (
              <Text className="text-indigo-400 text-lg font-semibold">Save</Text>
            )}
          </Pressable>
        </View>

        <ScrollView className="flex-1 p-4">
          {error && (
            <View className="bg-red-900/50 p-3 rounded-lg mb-4">
              <Text className="text-red-300">{error}</Text>
            </View>
          )}

          <View className="mb-4">
            <Text className="text-gray-400 text-sm mb-2">Name</Text>
            <TextInput
              className="bg-gray-800 text-white p-3 rounded-lg border border-gray-700"
              placeholder="e.g., Medieval Fantasy"
              placeholderTextColor="#6B7280"
              value={name}
              onChangeText={setName}
            />
          </View>

          <View className="mb-4">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-gray-400 text-sm">Prompt</Text>
              <Pressable 
                onPress={handleEnhance} 
                disabled={isEnhancing}
                className="flex-row items-center"
              >
                {isEnhancing ? (
                  <ActivityIndicator size="small" color="#818CF8" />
                ) : (
                  <Text className="text-indigo-400 text-sm">✨ Enhance with AI</Text>
                )}
              </Pressable>
            </View>
            <TextInput
              className="bg-gray-800 text-white p-3 rounded-lg border border-gray-700 min-h-[120px]"
              placeholder="e.g., dark fantasy with stone textures and gothic architecture"
              placeholderTextColor="#6B7280"
              value={promptModifier}
              onChangeText={setPromptModifier}
              multiline
              textAlignVertical="top"
            />
          </View>

          <View className="mb-4">
            <Text className="text-gray-400 text-sm mb-2">Style (optional)</Text>
            <View className="flex-row flex-wrap gap-2">
              {STYLE_OPTIONS.map((option) => (
                <Pressable
                  key={option.value ?? 'none'}
                  onPress={() => setStyle(option.value)}
                  className={`px-4 py-2 rounded-full ${
                    style === option.value ? 'bg-indigo-600' : 'bg-gray-800'
                  }`}
                >
                  <Text className={style === option.value ? 'text-white' : 'text-gray-300'}>
                    {option.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}
```

**Verification:**
- `pnpm tsc --noEmit` passes

---

### Task 10: Create Themes tab page ✅

**File to create:** `app/app/(tabs)/themes.tsx`

```tsx
import { useState, useCallback } from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/hooks/useAuth';
import { useBrowseThemes } from '@/hooks/useBrowseThemes';
import { ThemeCard } from '@/components/themes/ThemeCard';
import { ThemeFilterBar } from '@/components/themes/ThemeFilterBar';
import { ThemeEditorModal } from '@/components/themes/ThemeEditorModal';
import { trpc } from '@/lib/trpc/client';

export default function ThemesScreen() {
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuth();
  const isAuthenticated = !!user;
  
  const {
    myThemes,
    publicThemes,
    searchQuery,
    isLoadingMyThemes,
    isLoadingPublicThemes,
    isRefreshing,
    hasMoreMyThemes,
    hasMorePublicThemes,
    loadMoreMyThemes,
    loadMorePublicThemes,
    handleRefresh,
    handleSearchChange,
    refetchAll,
  } = useBrowseThemes({ isAuthenticated });

  const [showEditor, setShowEditor] = useState(false);
  const [editingTheme, setEditingTheme] = useState<any>(null);

  const handleCreateTheme = () => {
    setEditingTheme(null);
    setShowEditor(true);
  };

  const handleEditTheme = (theme: any) => {
    setEditingTheme(theme);
    setShowEditor(true);
  };

  const handleDeleteTheme = (theme: any) => {
    Alert.alert(
      'Delete Theme',
      `Are you sure you want to delete "${theme.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await trpc.assetSystem.themes.delete.mutate({ id: theme.id });
              refetchAll();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete theme');
            }
          },
        },
      ]
    );
  };

  const handleThemePress = (theme: any, isOwned: boolean) => {
    router.push({
      pathname: '/themes/[id]',
      params: { id: theme.id, owned: isOwned ? '1' : '0' },
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-900" edges={['bottom']}>
      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor="#818CF8"
          />
        }
      >
        <View className="p-4">
          {/* Header */}
          <View className="flex-row items-center justify-between mb-4">
            <View>
              <Text className="text-2xl font-bold text-white">Themes</Text>
              <Text className="text-gray-400 mt-1">
                Visual styles for your games
              </Text>
            </View>
            {isAuthenticated && (
              <Pressable
                onPress={handleCreateTheme}
                className="bg-indigo-600 px-4 py-2 rounded-lg active:bg-indigo-700"
              >
                <Text className="text-white font-medium">+ New</Text>
              </Pressable>
            )}
          </View>

          {/* Search */}
          <ThemeFilterBar
            searchQuery={searchQuery}
            onSearchChange={handleSearchChange}
          />

          {/* My Themes Section */}
          <View className="mb-6">
            <Text className="text-lg font-semibold text-white mb-3">My Themes</Text>
            
            {!isAuthenticated ? (
              <View className="p-6 bg-gray-800 rounded-xl border border-gray-700 items-center">
                <Text className="text-4xl mb-3">🔒</Text>
                <Text className="text-gray-400 text-center">
                  Sign in to create and manage your themes
                </Text>
              </View>
            ) : isLoadingMyThemes && myThemes.length === 0 ? (
              <View className="items-center py-8">
                <ActivityIndicator size="large" color="#818CF8" />
              </View>
            ) : myThemes.length === 0 ? (
              <View className="p-6 bg-gray-800 rounded-xl border border-gray-700 items-center">
                <Text className="text-4xl mb-3">🎨</Text>
                <Text className="text-gray-400 text-center">
                  {searchQuery ? 'No themes match your search' : 'No themes yet. Create your first!'}
                </Text>
              </View>
            ) : (
              <>
                {myThemes.map((theme) => (
                  <ThemeCard
                    key={theme.id}
                    id={theme.id}
                    name={theme.name}
                    promptModifier={theme.promptModifier}
                    style={theme.style}
                    isPublic={theme.isPublic}
                    isOwned={true}
                    thumbnailUrl={theme.thumbnailUrl}
                    onPress={() => handleThemePress(theme, true)}
                    onEdit={() => handleEditTheme(theme)}
                    onDelete={() => handleDeleteTheme(theme)}
                  />
                ))}
                {hasMoreMyThemes && (
                  <Pressable
                    onPress={loadMoreMyThemes}
                    disabled={isLoadingMyThemes}
                    className="p-4 bg-gray-800 rounded-xl border border-gray-700 items-center active:bg-gray-700"
                  >
                    {isLoadingMyThemes ? (
                      <ActivityIndicator size="small" color="#818CF8" />
                    ) : (
                      <Text className="text-indigo-400 font-medium">Load more</Text>
                    )}
                  </Pressable>
                )}
              </>
            )}
          </View>

          {/* Public Themes Section */}
          <View className="mb-6">
            <Text className="text-lg font-semibold text-white mb-3">Public Themes</Text>
            
            {isLoadingPublicThemes && publicThemes.length === 0 ? (
              <View className="items-center py-8">
                <ActivityIndicator size="large" color="#818CF8" />
              </View>
            ) : publicThemes.length === 0 ? (
              <View className="p-6 bg-gray-800 rounded-xl border border-gray-700 items-center">
                <Text className="text-4xl mb-3">🌟</Text>
                <Text className="text-gray-400 text-center">
                  {searchQuery ? 'No public themes match your search' : 'No public themes yet'}
                </Text>
              </View>
            ) : (
              <>
                {publicThemes.map((theme) => (
                  <ThemeCard
                    key={theme.id}
                    id={theme.id}
                    name={theme.name}
                    promptModifier={theme.promptModifier}
                    style={theme.style}
                    isPublic={true}
                    isOwned={theme.creatorUserId === user?.id}
                    thumbnailUrl={theme.thumbnailUrl}
                    onPress={() => handleThemePress(theme, theme.creatorUserId === user?.id)}
                    onEdit={theme.creatorUserId === user?.id ? () => handleEditTheme(theme) : undefined}
                    onDelete={theme.creatorUserId === user?.id ? () => handleDeleteTheme(theme) : undefined}
                  />
                ))}
                {hasMorePublicThemes && (
                  <Pressable
                    onPress={loadMorePublicThemes}
                    disabled={isLoadingPublicThemes}
                    className="p-4 bg-gray-800 rounded-xl border border-gray-700 items-center active:bg-gray-700"
                  >
                    {isLoadingPublicThemes ? (
                      <ActivityIndicator size="small" color="#818CF8" />
                    ) : (
                      <Text className="text-indigo-400 font-medium">Load more</Text>
                    )}
                  </Pressable>
                )}
              </>
            )}
          </View>
        </View>
      </ScrollView>

      <ThemeEditorModal
        visible={showEditor}
        onClose={() => setShowEditor(false)}
        onSave={refetchAll}
        editingTheme={editingTheme}
      />
    </SafeAreaView>
  );
}
```

**Verification:**
- `pnpm tsc --noEmit` passes
- App loads themes tab without crashing

---

### Task 11: Create Theme details screen ✅

**File to create:** `app/app/themes/[id].tsx`

```tsx
import { View, Text, ScrollView, ActivityIndicator, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { trpc } from '@/lib/trpc/client';
import { useEffect, useState } from 'react';

export default function ThemeDetailScreen() {
  const { id, owned } = useLocalSearchParams<{ id: string; owned: string }>();
  const router = useRouter();
  const isOwned = owned === '1';
  
  const [theme, setTheme] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTheme() {
      setIsLoading(true);
      setError(null);
      try {
        let result;
        if (isOwned) {
          result = await trpc.assetSystem.themes.getMine.query({ id });
        } else {
          result = await trpc.assetSystem.themes.get.query({ id });
        }
        setTheme(result);
      } catch (err: any) {
        setError(err.message || 'Theme not found');
      } finally {
        setIsLoading(false);
      }
    }
    
    if (id) {
      fetchTheme();
    }
  }, [id, isOwned]);

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-900 items-center justify-center">
        <ActivityIndicator size="large" color="#818CF8" />
      </SafeAreaView>
    );
  }

  if (error || !theme) {
    return (
      <SafeAreaView className="flex-1 bg-gray-900 items-center justify-center p-4">
        <Text className="text-4xl mb-4">😕</Text>
        <Text className="text-white text-lg font-semibold mb-2">Theme Not Found</Text>
        <Text className="text-gray-400 text-center mb-4">{error || 'This theme may have been deleted.'}</Text>
        <Pressable onPress={() => router.back()} className="bg-gray-800 px-6 py-3 rounded-lg">
          <Text className="text-white font-medium">Go Back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <>
      <Stack.Screen 
        options={{ 
          title: theme.name,
          headerStyle: { backgroundColor: '#111827' },
          headerTintColor: '#fff',
        }} 
      />
      <SafeAreaView className="flex-1 bg-gray-900" edges={['bottom']}>
        <ScrollView className="flex-1 p-4">
          {/* Header */}
          <View className="mb-6">
            <View className="flex-row items-center gap-2 mb-2">
              <Text className="text-2xl font-bold text-white">{theme.name}</Text>
              {theme.isPublic && (
                <View className="px-2 py-1 bg-green-600/80 rounded">
                  <Text className="text-xs text-white font-medium">Public</Text>
                </View>
              )}
            </View>
            {theme.style && (
              <View className="flex-row">
                <View className="px-3 py-1 bg-gray-800 rounded-full">
                  <Text className="text-gray-300 text-sm">{theme.style}</Text>
                </View>
              </View>
            )}
          </View>

          {/* Prompt */}
          <View className="mb-6">
            <Text className="text-gray-400 text-sm uppercase tracking-wide mb-2">Prompt</Text>
            <View className="bg-gray-800 p-4 rounded-xl border border-gray-700">
              <Text className="text-white leading-6">{theme.promptModifier}</Text>
            </View>
          </View>

          {/* Metadata */}
          <View className="mb-6">
            <Text className="text-gray-400 text-sm uppercase tracking-wide mb-2">Details</Text>
            <View className="bg-gray-800 p-4 rounded-xl border border-gray-700">
              <View className="flex-row justify-between mb-2">
                <Text className="text-gray-400">Created</Text>
                <Text className="text-white">
                  {new Date(theme.createdAt).toLocaleDateString()}
                </Text>
              </View>
              {theme.updatedAt && (
                <View className="flex-row justify-between">
                  <Text className="text-gray-400">Updated</Text>
                  <Text className="text-white">
                    {new Date(theme.updatedAt).toLocaleDateString()}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Thumbnail placeholder */}
          {theme.thumbnailUrl && (
            <View className="mb-6">
              <Text className="text-gray-400 text-sm uppercase tracking-wide mb-2">Preview</Text>
              <View className="bg-gray-800 aspect-video rounded-xl border border-gray-700 overflow-hidden">
                {/* Image would go here */}
              </View>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </>
  );
}
```

**Verification:**
- `pnpm tsc --noEmit` passes

---

### Task 12: Add Themes tab to tab bar navigation ✅

**File to modify:** `app/app/(tabs)/_layout.tsx`

Add a new tab for Themes. Find the existing tabs and add:

```tsx
<Tabs.Screen
  name="themes"
  options={{
    title: 'Themes',
    tabBarIcon: ({ color, size }) => (
      <Text style={{ fontSize: size }}>🎨</Text>
    ),
  }}
/>
```

**Verification:**
- `pnpm tsc --noEmit` passes
- Themes tab appears in tab bar

---

### Task 13: Create component index exports ✅

**File to create:** `app/components/themes/index.ts`

```typescript
export { ThemeCard } from './ThemeCard';
export { ThemeFilterBar } from './ThemeFilterBar';
export { ThemeEditorModal } from './ThemeEditorModal';
```

**Verification:**
- `pnpm tsc --noEmit` passes

---

### Task 14: Write API tests for themes endpoints ✅

**File to create:** `api/src/trpc/routes/asset-system.themes.test.ts`

```typescript
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { env } from 'cloudflare:test';
import { createCaller, type AppRouter } from '../router';

// Minimal schema for tests
const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER
);

CREATE TABLE IF NOT EXISTS themes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  prompt_modifier TEXT NOT NULL,
  style TEXT,
  creator_user_id TEXT REFERENCES users(id),
  is_public INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER,
  deleted_at INTEGER,
  thumbnail_url TEXT
);
`;

describe('themes router', () => {
  let caller: ReturnType<typeof createCaller>;
  let authedCaller: ReturnType<typeof createCaller>;
  let otherUserCaller: ReturnType<typeof createCaller>;
  const testUserId = 'test-user-1';
  const otherUserId = 'test-user-2';

  beforeAll(async () => {
    // Initialize schema
    await env.DB.exec(SCHEMA);
  });

  beforeEach(async () => {
    // Clean up
    await env.DB.exec('DELETE FROM themes');
    await env.DB.exec('DELETE FROM users');
    
    // Create test users
    await env.DB.prepare(
      'INSERT INTO users (id, email, created_at) VALUES (?, ?, ?)'
    ).bind(testUserId, 'test@example.com', Date.now()).run();
    
    await env.DB.prepare(
      'INSERT INTO users (id, email, created_at) VALUES (?, ?, ?)'
    ).bind(otherUserId, 'other@example.com', Date.now()).run();

    // Create callers
    caller = createCaller({ env, user: null });
    authedCaller = createCaller({ env, user: { id: testUserId } });
    otherUserCaller = createCaller({ env, user: { id: otherUserId } });
  });

  describe('themes.list', () => {
    it('requires authentication', async () => {
      await expect(caller.assetSystem.themes.list()).rejects.toThrow('UNAUTHORIZED');
    });

    it('returns empty array when no themes', async () => {
      const result = await authedCaller.assetSystem.themes.list();
      expect(result).toEqual([]);
    });

    it('returns only own themes', async () => {
      // Create theme for test user
      await authedCaller.assetSystem.themes.create({
        name: 'My Theme',
        promptModifier: 'test prompt',
      });
      
      // Create theme for other user
      await otherUserCaller.assetSystem.themes.create({
        name: 'Other Theme',
        promptModifier: 'other prompt',
      });

      const result = await authedCaller.assetSystem.themes.list();
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('My Theme');
    });

    it('supports pagination', async () => {
      // Create 5 themes
      for (let i = 0; i < 5; i++) {
        await authedCaller.assetSystem.themes.create({
          name: `Theme ${i}`,
          promptModifier: `prompt ${i}`,
        });
      }

      const page1 = await authedCaller.assetSystem.themes.list({ limit: 2, offset: 0 });
      expect(page1).toHaveLength(2);

      const page2 = await authedCaller.assetSystem.themes.list({ limit: 2, offset: 2 });
      expect(page2).toHaveLength(2);

      const page3 = await authedCaller.assetSystem.themes.list({ limit: 2, offset: 4 });
      expect(page3).toHaveLength(1);
    });

    it('supports search by name', async () => {
      await authedCaller.assetSystem.themes.create({ name: 'Medieval Fantasy', promptModifier: 'stone' });
      await authedCaller.assetSystem.themes.create({ name: 'Sci-Fi', promptModifier: 'neon' });

      const result = await authedCaller.assetSystem.themes.list({ query: 'medieval' });
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Medieval Fantasy');
    });

    it('supports search by prompt', async () => {
      await authedCaller.assetSystem.themes.create({ name: 'Theme A', promptModifier: 'dark gothic' });
      await authedCaller.assetSystem.themes.create({ name: 'Theme B', promptModifier: 'bright colors' });

      const result = await authedCaller.assetSystem.themes.list({ query: 'gothic' });
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Theme A');
    });
  });

  describe('themes.listPublic', () => {
    it('does not require authentication', async () => {
      const result = await caller.assetSystem.themes.listPublic();
      expect(result).toEqual([]);
    });

    it('returns only public themes', async () => {
      // Create public theme
      const { id } = await authedCaller.assetSystem.themes.create({
        name: 'Public Theme',
        promptModifier: 'public',
      });
      
      // Make it public (direct DB update for test)
      await env.DB.prepare('UPDATE themes SET is_public = 1 WHERE id = ?').bind(id).run();

      // Create private theme
      await authedCaller.assetSystem.themes.create({
        name: 'Private Theme',
        promptModifier: 'private',
      });

      const result = await caller.assetSystem.themes.listPublic();
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Public Theme');
    });
  });

  describe('themes.update', () => {
    it('cannot update other user themes', async () => {
      const { id } = await otherUserCaller.assetSystem.themes.create({
        name: 'Other Theme',
        promptModifier: 'other',
      });

      await expect(
        authedCaller.assetSystem.themes.update({ id, name: 'Hacked' })
      ).rejects.toThrow('NOT_FOUND');
    });
  });

  describe('themes.delete', () => {
    it('soft deletes theme', async () => {
      const { id } = await authedCaller.assetSystem.themes.create({
        name: 'To Delete',
        promptModifier: 'delete me',
      });

      await authedCaller.assetSystem.themes.delete({ id });

      const result = await authedCaller.assetSystem.themes.list();
      expect(result).toHaveLength(0);
    });

    it('cannot delete other user themes', async () => {
      const { id } = await otherUserCaller.assetSystem.themes.create({
        name: 'Other Theme',
        promptModifier: 'other',
      });

      await expect(
        authedCaller.assetSystem.themes.delete({ id })
      ).rejects.toThrow('NOT_FOUND');
    });
  });

  describe('themes.getMine', () => {
    it('returns own theme', async () => {
      const { id } = await authedCaller.assetSystem.themes.create({
        name: 'My Theme',
        promptModifier: 'mine',
      });

      const result = await authedCaller.assetSystem.themes.getMine({ id });
      expect(result.name).toBe('My Theme');
    });

    it('cannot get other user theme', async () => {
      const { id } = await otherUserCaller.assetSystem.themes.create({
        name: 'Other Theme',
        promptModifier: 'other',
      });

      await expect(
        authedCaller.assetSystem.themes.getMine({ id })
      ).rejects.toThrow('NOT_FOUND');
    });
  });
});
```

**Verification:**
- `pnpm --filter @slopcade/api test:run` passes

---

### Task 15: Final verification and cleanup ✅

**Commands to run:**
```bash
pnpm tsc --noEmit
pnpm --filter @slopcade/api test:run
```

**Manual QA checklist:**
- [x] Themes tab appears in navigation
- [x] Public themes load without auth
- [x] My themes section shows login prompt when not authenticated
- [x] Search filters both sections
- [x] Load more appends results
- [x] Create theme flow works (with AI enhance)
- [x] Edit theme updates in place
- [x] Delete theme removes from list
- [x] Theme details screen loads

---

## Verification Commands

```bash
# Type check
pnpm tsc --noEmit

# API tests
pnpm --filter @slopcade/api test:run

# Start dev server for manual testing
pnpm dev
```

## Success Criteria

- [x] All type checks pass
- [x] All API tests pass
- [x] Themes tab is accessible and functional
- [x] CRUD operations work for authenticated users
- [x] Search and pagination work correctly
- [x] AI prompt enhancement works (or fails gracefully)
