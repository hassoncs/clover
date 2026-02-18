# Future Moderation Roadmap

> **Status**: Documented for future implementation  
> **Current State**: MVP keyword/regex filter (see `api/src/services/moderation-service.ts`)  
> **Priority**: Low - upgrade when real abuse patterns emerge

---

## Current Implementation (MVP)

**What we have**: Keyword/regex pre-filter at all user-facing AI ingress points.

**Cost**: Free (local string matching, no external API calls)

**What it catches**:
- Accidental violations
- Lazy bad actors using obvious terms
- Basic leetspeak variants (`pr0n`, `s3x`)

**What it misses**:
- Different languages ("nackt" = nude in German)
- Sophisticated leetspeak we didn't enumerate
- Unicode tricks (zero-width spaces, homoglyphs)
- Contextual phrasing ("show me naked people")
- Encoded prompts (base64, etc.)
- Image generation workarounds ("draw a person without clothes")

**Assessment**: Speed bump, not a wall. Fine for MVP with zero users.

---

## Bypass Methods (Known)

| Method | Current Filter | ML Filter |
|--------|---------------|-----------|
| Different language | ❌ Bypasses | ✅ Catches most |
| Leetspeak variants | ⚠️ Partial | ✅ Catches |
| Unicode tricks | ❌ Bypasses | ✅ Catches |
| Contextual phrasing | ❌ Bypasses | ✅ Catches most |
| Encoded prompts | ❌ Bypasses | ⚠️ Partial |
| Image prompt workarounds | ❌ Bypasses | ⚠️ Partial |

---

## Industry Standard Tiers

### Tier 1: Keyword/Regex (Current)
- **Cost**: Free
- **Who uses it**: Every platform starts here
- **Implementation**: What we have now

### Tier 2: ML-Based Pre-Filter
- **Cost**: ~$0.001-0.002 per request
- **Who uses it**: Mid-size platforms, apps with any budget
- **Options**:
  - **OpenAI Moderation API** - Free tier, then $0.002/request
  - **Perspective API** (Google/Jigsaw) - Free tier available
  - **AWS Rekognition** (images) - Pay per use
- **Catches**: Contextual abuse, most evasion, multiple languages

### Tier 3: Output Filtering + Human Review
- **Cost**: $$$ (infrastructure + human reviewers)
- **Who uses it**: Large platforms (Instagram, TikTok)
- **Components**:
  1. ML filter on input
  2. ML filter on AI output
  3. Human review queue for edge cases
  4. User reporting system

### Tier 4: Enterprise/Regulated
- **Cost**: $$$$$
- **Who uses it**: Banks, healthcare, regulated industries
- **Components**: Full audit trails, compliance certifications, dedicated moderation teams

---

## When to Upgrade

| Trigger | Action | Effort |
|---------|--------|--------|
| First abuse attempts in audit logs | Add OpenAI Moderation API | ~4 hours |
| Paying customers / revenue | Add output filtering | ~1-2 days |
| Media attention / viral growth | Add user reporting + review queue | ~1 week |
| Regulatory requirements | Full compliance audit | Variable |

---

## Implementation Path (When Needed)

### Phase 1: Add ML Pre-Filter

```typescript
// api/src/services/moderation-service.ts

async function checkModeration(prompt: string) {
  // 1. Quick keyword check (free, catches obvious)
  const keywordResult = this.checkKeywords(prompt);
  if (!keywordResult.allowed) return keywordResult;
  
  // 2. ML check (costs money, catches evasion)
  const mlResult = await this.checkWithML(prompt);
  if (!mlResult.allowed) return mlResult;
  
  return { allowed: true };
}

async function checkWithML(prompt: string) {
  const response = await fetch('https://api.openai.com/v1/moderations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({ input: prompt })
  });
  
  const result = await response.json();
  const flagged = result.results[0].flagged;
  const categories = Object.entries(result.results[0].categories)
    .filter(([_, flagged]) => flagged)
    .map(([category]) => category);
  
  return {
    allowed: !flagged,
    reason: flagged ? 'Content policy violation' : undefined,
    category: categories[0]?.toUpperCase()
  };
}
```

### Phase 2: Add Output Filtering

For image generation, run generated images through content moderation before returning to user.

### Phase 3: Age-Based Filtering (If Needed)

```typescript
// Add to user profile
interface UserProfile {
  birthYear?: number;
  ageVerified: boolean;
  preferences: {
    allowAdultContent: boolean;
  };
}

// Age-aware moderation
const result = moderationService.check(prompt, { 
  allowNSFW: user.ageVerified && user.preferences.allowAdultContent 
});
```

**Note**: Real age verification (ID scanning, credit card) has legal complexity (COPPA, etc.). Self-reported birth year is fine for MVP content gating.

---

## Cost Estimates

| Solution | Cost per 1K requests | Monthly (10K users, 10 req/user) |
|----------|---------------------|----------------------------------|
| Current (keyword) | $0 | $0 |
| OpenAI Moderation | $2 | $200 |
| Perspective API | Free tier | $0-50 |
| Human review queue | $$$ | Variable |

---

## Recommendations

1. **Ship MVP as-is** - keyword filter is industry standard for launch
2. **Monitor audit logs** - watch for `moderation.reject` events to see abuse patterns
3. **Upgrade when triggered** - add ML filter when you see real bypass attempts
4. **Defer age-gating** - add `birthYear` field to profile, but don't build full age verification until users ask for adult content

---

## Related Files

- `api/src/services/moderation-service.ts` - Current implementation
- `api/src/services/__tests__/moderation-service.test.ts` - Tests
- `.sisyphus/notepads/security-admin-mvp/moderation-policy.md` - Blocked categories
- `.sisyphus/notepads/security-admin-mvp/ingress-inventory.md` - AI ingress points

---

*Last Updated: 2026-02-15*
