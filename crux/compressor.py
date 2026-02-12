"""Core compression logic using LLMLingua."""

from dataclasses import dataclass
from typing import Literal
from llmlingua import PromptCompressor


@dataclass
class CompressionResult:
    """Result of compression operation."""
    
    original_text: str
    compressed_text: str
    original_tokens: int
    compressed_tokens: int
    compression_ratio: float
    mode: Literal["text", "code"]
    
    @property
    def savings_percent(self) -> float:
        """Calculate percentage of tokens saved."""
        return (1 - self.compression_ratio) * 100


class Compressor:
    """Intelligent prompt compressor with text/code mode support."""
    
    def __init__(self, model_name: str = "microsoft/llmlingua-2-xlm-roberta-large-meetingbank"):
        """Initialize compressor with specified model.
        
        Args:
            model_name: HuggingFace model identifier. Default is the faster LLMLingua-2 model.
        """
        self.compressor = PromptCompressor(
            model_name=model_name,
            use_llmlingua2=True,
            device_map="cpu"  # Use CPU for compatibility
        )
    
    def compress(
        self,
        text: str,
        target_ratio: float = 0.5,
        mode: Literal["text", "code"] = "text"
    ) -> CompressionResult:
        """Compress text with mode-specific optimizations.
        
        Args:
            text: Input text to compress
            target_ratio: Target compression ratio (0.0-1.0, lower = more compression)
            mode: Compression mode - 'text' for prose, 'code' for source code
            
        Returns:
            CompressionResult with original, compressed text and statistics
        """
        # Mode-specific configuration
        if mode == "code":
            # Protect syntax tokens for code
            force_tokens = ["\n", "\t", "{", "}", "(", ")", ";", ",", "[", "]", ".", ":", "="]
        else:
            # Default force tokens for text
            force_tokens = ["\n", ".", "!", "?", ","]
        
        # Perform compression
        # LLMLingua expects context as a list of strings
        result = self.compressor.compress_prompt(
            context=[text],
            rate=target_ratio,
            force_tokens=force_tokens,
            use_context_level_filter=True,
            use_token_level_filter=True,
        )
        
        return CompressionResult(
            original_text=text,
            compressed_text=result["compressed_prompt"],
            original_tokens=result["origin_tokens"],
            compressed_tokens=result["compressed_tokens"],
            compression_ratio=result["ratio"],
            mode=mode
        )
