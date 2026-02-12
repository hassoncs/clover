"""File type detection for automatic mode selection."""

from pathlib import Path
from typing import Literal


# Extension-to-mode mapping
EXTENSION_MAP = {
    # Text/Documentation
    ".md": "text",
    ".txt": "text",
    ".rst": "text",
    ".adoc": "text",
    ".org": "text",
    
    # Code - Python
    ".py": "code",
    ".pyi": "code",
    
    # Code - JavaScript/TypeScript
    ".js": "code",
    ".jsx": "code",
    ".ts": "code",
    ".tsx": "code",
    ".mjs": "code",
    ".cjs": "code",
    
    # Code - Web
    ".html": "code",
    ".htm": "code",
    ".css": "code",
    ".scss": "code",
    ".sass": "code",
    ".less": "code",
    
    # Code - Systems
    ".c": "code",
    ".cpp": "code",
    ".cc": "code",
    ".cxx": "code",
    ".h": "code",
    ".hpp": "code",
    ".rs": "code",
    ".go": "code",
    ".java": "code",
    ".kt": "code",
    ".swift": "code",
    
    # Code - Scripting
    ".sh": "code",
    ".bash": "code",
    ".zsh": "code",
    ".fish": "code",
    ".rb": "code",
    ".pl": "code",
    ".php": "code",
    
    # Structured Data
    ".json": "structured",
    ".yaml": "structured",
    ".yml": "structured",
    ".toml": "structured",
    ".xml": "structured",
    ".csv": "structured",
    
    # Config files (often structured)
    ".ini": "structured",
    ".conf": "structured",
    ".config": "structured",
}


def detect_mode(path: Path) -> Literal["text", "code", "structured"]:
    """Detect compression mode based on file extension and content.
    
    Args:
        path: Path to file to analyze
        
    Returns:
        Detected mode: "text", "code", or "structured"
    """
    # Check extension first
    ext = path.suffix.lower()
    if ext in EXTENSION_MAP:
        return EXTENSION_MAP[ext]
    
    # Unknown extension - use heuristics
    try:
        content = path.read_text(encoding="utf-8", errors="ignore")
        return _detect_from_content(content)
    except Exception:
        # If we can't read the file, default to text
        return "text"


def _detect_from_content(content: str) -> Literal["text", "code", "structured"]:
    """Detect mode from file content using simple heuristics.
    
    Args:
        content: File content to analyze
        
    Returns:
        Detected mode based on content patterns
    """
    # Sample first 1000 chars for performance
    sample = content[:1000]
    
    # Check for structured data patterns
    if _looks_like_json(sample) or _looks_like_yaml(sample):
        return "structured"
    
    # Check for code patterns
    if _looks_like_code(sample):
        return "code"
    
    # Default to text
    return "text"


def _looks_like_json(sample: str) -> bool:
    """Check if content looks like JSON."""
    stripped = sample.strip()
    return (
        (stripped.startswith("{") and ":" in sample and "}" in sample) or
        (stripped.startswith("[") and "]" in sample)
    )


def _looks_like_yaml(sample: str) -> bool:
    """Check if content looks like YAML."""
    lines = sample.split("\n")[:20]  # Check first 20 lines
    yaml_indicators = 0
    
    for line in lines:
        stripped = line.strip()
        # YAML key-value pairs
        if ":" in stripped and not stripped.startswith("#"):
            yaml_indicators += 1
        # YAML list items
        if stripped.startswith("- "):
            yaml_indicators += 1
    
    return yaml_indicators >= 3


def _looks_like_code(sample: str) -> bool:
    """Check if content looks like source code."""
    # Count code-like patterns
    code_indicators = 0
    
    # Common code patterns
    patterns = [
        "{", "}", "(", ")", ";", "=", "==", "!=",
        "function", "def ", "class ", "import ", "const ", "let ", "var ",
        "if ", "else", "for ", "while ", "return"
    ]
    
    for pattern in patterns:
        if pattern in sample:
            code_indicators += 1
    
    # If we see multiple code patterns, it's likely code
    return code_indicators >= 5
