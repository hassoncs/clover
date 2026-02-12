# Crux Quick Start

## Installation

```bash
cd crux
python3 -m venv .venv
source .venv/bin/activate
pip install -e .
```

## Basic Usage

### Compress AGENTS.md (Text Mode)

```bash
# Activate venv
cd crux && source .venv/bin/activate

# Compress with 50% target ratio
python -c "
import sys
sys.path.insert(0, '..')
from crux.cli import main
sys.argv = ['crux', 'compress', '../AGENTS.md', '-o', 'AGENTS.compressed.md', '--ratio', '0.5']
main()
"
```

### Compress Source Code (Code Mode)

```bash
# Compress Python file
python -c "
import sys
sys.path.insert(0, '..')
from crux.cli import main
sys.argv = ['crux', 'compress', '../api/src/game_engine.py', '-o', 'game_engine.compressed.py', '--mode', 'code', '--ratio', '0.6']
main()
"
```

### With Verification

```bash
# Set API key
export OPENAI_API_KEY=your-key-here

# Compress with verification
python -c "
import sys
sys.path.insert(0, '..')
from crux.cli import main
sys.argv = ['crux', 'compress', 'test_input.txt', '-o', 'test_output.txt', '--verify']
main()
"
```

## Programmatic Usage

```python
import sys
sys.path.insert(0, '..')

from crux import Compressor, Verifier

# Read input
with open('../AGENTS.md') as f:
    text = f.read()

# Compress
compressor = Compressor()
result = compressor.compress(text, target_ratio=0.5, mode='text')

print(f"Original: {result.original_tokens} tokens")
print(f"Compressed: {result.compressed_tokens} tokens")
print(f"Savings: {result.savings_percent:.1f}%")

# Verify (optional)
verifier = Verifier()
verification = verifier.verify(result.original_text, result.compressed_text)
print(f"Verdict: {verification.verdict}")

# Save output
with open('AGENTS.compressed.md', 'w') as f:
    f.write(result.compressed_text)
```

## Expected Output

```
┏━━━━━━━━━━━━━━━━━━━━┳━━━━━━━━━━┳━━━━━━━━━━━━┓
┃ Metric             ┃ Original ┃ Compressed ┃
┡━━━━━━━━━━━━━━━━━━━━╇━━━━━━━━━━╇━━━━━━━━━━━━┩
│ Tokens             │     1234 │        617 │
│ Characters         │     5678 │       2839 │
│ Compression Ratio  │     1.00 │       0.50 │
│ Savings            │       0% │      50.0% │
└────────────────────┴──────────┴────────────┘
```

## Troubleshooting

### Model Download

On first run, LLMLingua will download the model (~500MB):
```
Downloading microsoft/llmlingua-2-xlm-roberta-large-meetingbank...
```

This is normal and only happens once.

### Import Errors

If you see `ModuleNotFoundError: No module named 'crux'`:
- Make sure you're in the `crux/` directory
- Activate the venv: `source .venv/bin/activate`
- Use `sys.path.insert(0, '..')` in scripts

### API Key for Verification

Verification requires an API key:
```bash
export OPENAI_API_KEY=sk-...
# or
export ANTHROPIC_API_KEY=sk-ant-...
```

Without a key, verification will be skipped (verdict: SKIPPED).

## Next Steps

1. Test with your AGENTS.md: `crux compress ../AGENTS.md -o AGENTS.compressed.md`
2. Compare original vs compressed for quality
3. Adjust `--ratio` to find optimal compression
4. Use `--verify` to audit quality with LLM
