# Crux

Intelligent prompt compression for LLMs using LLMLingua.

## Features

- **Text Mode**: Optimized for prose, documentation, and natural language
- **Code Mode**: Preserves syntax tokens for source code compression
- **LLM Verification**: Optional quality auditing using GPT-4 or Claude
- **Rich CLI**: Beautiful terminal output with compression statistics

## Installation

```bash
pip install -e .
```

## Usage

### Basic Compression

```bash
# Compress a text file (default mode)
crux compress AGENTS.md -o AGENTS.compressed.md

# Compress source code
crux compress src/main.py -o src/main.compressed.py --mode code

# Adjust compression ratio (lower = more aggressive)
crux compress prompt.txt -o prompt.compressed.txt --ratio 0.3
```

### With Verification

```bash
# Verify compression quality with LLM
export OPENAI_API_KEY=your-key-here
crux compress AGENTS.md -o AGENTS.compressed.md --verify
```

### Options

- `--ratio, -r`: Target compression ratio (0.0-1.0, default: 0.5)
- `--mode, -m`: Compression mode (`text` or `code`, default: `text`)
- `--verify, -v`: Verify compression quality with LLM
- `--output, -o`: Output file (default: stdout)
- `--model`: Compression model (default: `microsoft/llmlingua-2-xlm-roberta-large-meetingbank`)

## How It Works

Crux uses [LLMLingua](https://github.com/microsoft/LLMLingua) to intelligently compress prompts while preserving semantic meaning:

1. **Token-Level Filtering**: Removes less important tokens based on perplexity
2. **Context-Level Filtering**: Preserves document structure and key information
3. **Mode-Specific Protection**: 
   - Text mode: Protects sentence boundaries and punctuation
   - Code mode: Protects syntax tokens (braces, semicolons, operators)

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
