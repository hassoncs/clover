# Crux Quick Reference

## Installation

```bash
cd /Users/hassoncs/Workspaces/Personal/slopcade/crux
python3 -m venv .venv
source .venv/bin/activate
pip install -e .
```

## Basic Usage

```bash
# Auto-detect and compress to stdout
crux compress file.md

# Auto-detect and save to file
crux compress file.py -o file.compressed.py

# Compress with specific ratio
crux compress file.txt --ratio 0.3 -o file.compressed.txt
```

## Modes

### Auto-Detection (Default)
```bash
crux compress file.md        # → text mode
crux compress file.py        # → code mode
crux compress file.json      # → structured mode
```

### Manual Override
```bash
crux compress file.txt --mode code
crux compress file.txt --mode structured
crux compress file.txt --mode text
```

## Batch Processing

```bash
# Compress directory to .crux/compressed/
crux compress ./docs/

# Compress to custom output directory
crux compress ./docs/ -o ./compressed-docs/

# With custom ratio
crux compress ./docs/ --ratio 0.4
```

## Query-Aware Compression

```bash
# Focus on specific topic
crux compress AGENTS.md --query "authentication setup" -o auth.md

# With custom ratio
crux compress AGENTS.md --query "deployment" --ratio 0.3 -o deploy.md
```

## Verification

```bash
# Verify compression quality with LLM
export OPENAI_API_KEY=your-key
crux compress file.md --verify -o file.compressed.md
```

## Options Reference

| Option | Short | Description | Default |
|--------|-------|-------------|---------|
| `--output` | `-o` | Output file or directory | stdout (files), `.crux/compressed/` (dirs) |
| `--ratio` | `-r` | Compression ratio (0.0-1.0) | 0.5 |
| `--mode` | `-m` | Mode: text, code, structured | auto-detect |
| `--query` | `-q` | Query for focused compression | none |
| `--verify` | `-v` | Verify with LLM | false |
| `--model` | | Compression model | llmlingua-2 |

## File Type Detection

### Text Mode
`.md`, `.txt`, `.rst`, `.adoc`, `.org`

### Code Mode
`.py`, `.js`, `.ts`, `.tsx`, `.jsx`, `.go`, `.rs`, `.java`, `.cpp`, `.c`, `.h`, `.sh`, `.bash`, `.rb`, `.php`, `.swift`, `.kt`

### Structured Mode
`.json`, `.yaml`, `.yml`, `.toml`, `.xml`, `.csv`, `.ini`, `.conf`

## Global Access

```bash
# Use wrapper from anywhere
~/.local/bin/crux-wrapper compress file.md

# Or create alias in ~/.zshrc
alias crux='~/.local/bin/crux-wrapper'
```

## Examples

### Compress Documentation
```bash
crux compress README.md -o README.compressed.md --ratio 0.4
```

### Compress Source Code
```bash
crux compress src/main.py -o src/main.compressed.py --ratio 0.6
```

### Compress Config Files
```bash
crux compress config.json -o config.compressed.json --ratio 0.5
```

### Compress Entire Codebase
```bash
crux compress ./src/ -o ./compressed-src/ --ratio 0.5
```

### Query-Aware Documentation
```bash
crux compress AGENTS.md \
  --query "How do I set up authentication?" \
  --ratio 0.4 \
  -o auth-guide.md
```

## Troubleshooting

### Model Download
First run downloads ~500MB model. This is normal and happens once.

### Import Errors
```bash
cd /Users/hassoncs/Workspaces/Personal/slopcade/crux
pip uninstall -y crux
pip install -e .
```

### Wrapper Not Found
```bash
# Check PATH
echo $PATH | grep ".local/bin"

# Add to PATH if missing (add to ~/.zshrc)
export PATH="$HOME/.local/bin:$PATH"
```

## Performance Tips

1. **Ratio Selection:**
   - 0.7-0.9: Light compression, high quality
   - 0.4-0.6: Balanced compression
   - 0.2-0.3: Aggressive compression

2. **Batch Processing:**
   - Process large directories in chunks
   - Use `--ratio 0.5` as starting point
   - Test on sample files first

3. **Query-Aware:**
   - Use specific queries for better results
   - Combine with higher ratios (0.6-0.8)
   - Good for extracting specific information
