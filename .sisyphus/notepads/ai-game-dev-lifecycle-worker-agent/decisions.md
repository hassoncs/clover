# Decisions

## OpenRouter as Primary Provider
- **Decision**: Use OpenRouter as the primary provider for all tiers in the initial implementation.
- **Rationale**: Simplifies routing and allows for easy model swapping without changing provider logic. Fallbacks to direct providers (OpenAI, Anthropic) are configured for higher tiers.
