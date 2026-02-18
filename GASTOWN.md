# Gastown Setup - Quick Reference

## ✅ What's Configured

### Gastown Workspace
- **Location:** `~/gt/`
- **Rig:** `~/gt/slopcade/` (linked to this repo)
- **Crew:** `~/gt/slopcade/crew/hassoncs/`

### Dual-Runtime Agents

| Agent | Runtime | Model | Use Case |
|-------|---------|-------|----------|
| `opencode-glm5` | OpenCode | GLM-5 | General coding (default) |
| `claude-opus` | Claude Code | Opus 4.6 | Complex architecture (1M context) |
| `claude-sonnet` | Claude Code | Sonnet 4.6 | Analysis/review (1M context) |
| `opencode` | OpenCode | default | Fallback |

### Config Files

1. **Runtime Config:** `~/gt/slopcade/settings/config.json`
   - Sets OpenCode as default runtime

2. **Agent Config:** `~/gt/settings/config.json`
   - Defines custom agent aliases with model flags

3. **OpenCode Hooks:** `.opencode/plugins/gastown.js`
   - Enables Gastown to coordinate OpenCode agents

4. **Skill Doc:** `~/.config/opencode/skills/gastown/skill.md`
   - Full documentation for future reference

## 🚀 Quick Start

```bash
# Enter your crew workspace
cd ~/gt/slopcade/crew/hassoncs

# Start the Mayor (coordinator)
gt mayor attach

# In another terminal - create a convoy
gt convoy create "Implement new feature"

# Work on beads (assigned by Mayor)
gt slurp                    # Next available bead
gt slurp --agent claude-opus  # Force specific agent
```

## 📊 Monitoring

```bash
# List active convoys
gt convoy list

# Show convoy details
gt convoy show <id>

# List beads
gt bead list

# Check agent status
gt mayor status
```

## 🔄 Workflow

1. **Mayor** (gt mayor attach) - Coordinates work
2. **Convoy** - Bundle of related tasks
3. **Bead** - Individual task (git-backed)
4. **Polecat** - Worker agent (you, or spawned agents)

## 🎯 Model Selection Strategy

Based on your oh-my-opencode.json:

| Task | Agent | Why |
|------|-------|-----|
| Sisyphus/Atlas/Metis | `opencode-glm5` | GLM-5 via OpenCode |
| Oracle/Ultrabrain | `claude-opus` | 1M context via Claude Code |
| Compaction | `claude-sonnet` | 1M context via Claude Code |
| Librarian/Explore | `opencode` + flags | Gemini Flash via OpenCode |

## 🔧 Troubleshooting

**Beads not found:**
```bash
cd ~/gt/slopcade
bd init --prefix sl
```

**Switch runtime for specific convoy:**
```bash
gt slurp --agent claude-opus
```

**Check config:**
```bash
cat ~/gt/settings/config.json
cat ~/gt/slopcade/settings/config.json
```

## 📝 Notes

- **Claude Code** = Anthropic models with 1M context window
- **OpenCode** = Everything else (GLM-5, Kimi, GPT-5.3, Gemini)
- **Work persists** in git beads - survives crashes/restarts
- **Mayor** can spawn 10-20 agents simultaneously vs 4-10 manually
