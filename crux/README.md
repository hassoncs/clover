# Crux

Intelligent prompt compression for LLMs using LLMLingua.

## Features

- **Smart Auto-Detection**: Automatically detects file type (text, code, structured) based on extension
- **Text Mode**: Optimized for prose, documentation, and natural language
- **Code Mode**: Preserves syntax tokens for source code compression
- **Structured Mode**: Optimized for JSON, YAML, TOML, and other structured data
- **Batch Processing**: Compress entire directories with structure mirroring
- **Query-Aware Compression**: Focus compression on content relevant to a specific query
- **LLM Verification**: Optional quality auditing using GPT-4 or Claude
- **Rich CLI**: Beautiful terminal output with compression statistics

## Installation

```bash
pip install -e .
```

## Usage

### Basic Compression

```bash
# Auto-detect mode and compress to stdout
crux compress AGENTS.md

# Auto-detect mode and save to file
crux compress src/main.py -o src/main.compressed.py

# Override auto-detection
crux compress config.txt --mode structured -o config.compressed.txt

# Adjust compression ratio (lower = more aggressive)
crux compress prompt.txt -o prompt.compressed.txt --ratio 0.3
```

### Batch Processing

```bash
# Compress entire directory (outputs to .crux/compressed/)
crux compress ./docs/

# Compress directory to custom output location
crux compress ./docs/ -o ./compressed-docs/
```

### Query-Aware Compression

```bash
# Focus compression on content relevant to a query
crux compress AGENTS.md --query "How do I set up authentication?" -o auth-guide.md
```

### With Verification

```bash
# Verify compression quality with LLM
export OPENAI_API_KEY=your-key-here
crux compress AGENTS.md -o AGENTS.compressed.md --verify
```

### Options

- `--ratio, -r`: Target compression ratio (0.0-1.0, default: 0.5)
- `--mode, -m`: Compression mode (`text`, `code`, or `structured`, default: auto-detect)
- `--query, -q`: Query for query-aware compression
- `--verify, -v`: Verify compression quality with LLM
- `--output, -o`: Output file or directory (default: stdout for files, `.crux/compressed/` for directories)
- `--model`: Compression model (default: `microsoft/llmlingua-2-xlm-roberta-large-meetingbank`)

## How It Works

Crux uses [LLMLingua](https://github.com/microsoft/LLMLingua) to intelligently compress prompts while preserving semantic meaning:

1. **Smart Detection**: Analyzes file extension and content to choose optimal compression mode
2. **Token-Level Filtering**: Removes less important tokens based on perplexity
3. **Context-Level Filtering**: Preserves document structure and key information
4. **Mode-Specific Protection**: 
   - Text mode: Protects sentence boundaries and punctuation
   - Code mode: Protects syntax tokens (braces, semicolons, operators) using LongLLMLingua ranking
   - Structured mode: Protects JSON/YAML structure tokens (braces, brackets, colons)

## Verification

When `--verify` is enabled, Crux uses an LLM to audit the compression:

- **PASS**: Excellent compression, no significant loss
- **DEGRADED**: Minor loss acceptable for the compression ratio
- **FAIL**: Critical information lost, try a higher ratio
- **SKIPPED**: Verification unavailable (missing API key or litellm)

## Examples

### Compress AGENTS.md

```bash
crux compress AGENTS.md -o AGENTS.compressed.md --ratio 0.4 --verify
```

### Compress Python Source

```bash
crux compress game_engine.py -o game_engine.compressed.py --mode code --ratio 0.6
```

## Requirements

- Python 3.10+
- PyTorch (CPU or GPU)
- Transformers
- LLMLingua

Optional:
- LiteLLM (for verification)
- OpenAI or Anthropic API key (for verification)
