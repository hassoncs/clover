"""Core compression logic using LLMLingua."""

from dataclasses import dataclass
from typing import Literal, Optional
from llmlingua import PromptCompressor


def _parse_ratio(ratio_str: str) -> float:
    """Parse LLMLingua ratio string (e.g., '1.7x') to float.
    
    Args:
        ratio_str: Ratio string from LLMLingua (e.g., '1.7x', '2.0x')
        
    Returns:
        Float ratio value
    """
    if isinstance(ratio_str, (int, float)):
        return float(ratio_str)
    
    return float(ratio_str.rstrip('x'))


@dataclass
class CompressionResult:
    """Result of compression operation."""
    
    original_text: str
    compressed_text: str
    original_tokens: int
    compressed_tokens: int
    compression_ratio: float
    mode: Literal["text", "code", "structured"]
    
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
        mode: Literal["text", "code", "structured"] = "text",
        query: Optional[str] = None
    ) -> CompressionResult:
        """Compress text with mode-specific optimizations.
        
        Args:
            text: Input text to compress
            target_ratio: Target compression ratio (0.0-1.0, lower = more compression)
            mode: Compression mode - 'text', 'code', or 'structured'
            query: Optional query for query-aware compression
            
        Returns:
            CompressionResult with original, compressed text and statistics
        """
        if mode == "structured":
            return self._compress_structured(text, target_ratio, query)
        elif mode == "code":
            return self._compress_code(text, target_ratio, query)
        else:
            return self._compress_text(text, target_ratio, query)
    
    def _compress_text(
        self,
        text: str,
        target_ratio: float,
        query: Optional[str] = None
    ) -> CompressionResult:
        force_tokens = ["\n", ".", "!", "?", ","]
        
        kwargs = {
            "context": [text],
            "rate": target_ratio,
            "force_tokens": force_tokens,
            "use_context_level_filter": True,
            "use_token_level_filter": True,
        }
        
        if query:
            kwargs["instruction"] = query
        
        result = self.compressor.compress_prompt(**kwargs)
        
        return CompressionResult(
            original_text=text,
            compressed_text=result["compressed_prompt"],
            original_tokens=result["origin_tokens"],
            compressed_tokens=result["compressed_tokens"],
            compression_ratio=_parse_ratio(result["ratio"]),
            mode="text"
        )
    
    def _compress_code(
        self,
        text: str,
        target_ratio: float,
        query: Optional[str] = None
    ) -> CompressionResult:
        force_tokens = ["\n", "\t", "{", "}", "(", ")", ";", ",", "[", "]", ".", ":", "="]
        
        kwargs = {
            "context": [text],
            "rate": target_ratio,
            "force_tokens": force_tokens,
            "use_context_level_filter": True,
            "use_token_level_filter": True,
            "rank_method": "longllmlingua",
            "reorder_context": "sort",
        }
        
        if query:
            kwargs["instruction"] = query
        
        result = self.compressor.compress_prompt(**kwargs)
        
        return CompressionResult(
            original_text=text,
            compressed_text=result["compressed_prompt"],
            original_tokens=result["origin_tokens"],
            compressed_tokens=result["compressed_tokens"],
            compression_ratio=_parse_ratio(result["ratio"]),
            mode="code"
        )
    
    def _compress_structured(
        self,
        text: str,
        target_ratio: float,
        query: Optional[str] = None
    ) -> CompressionResult:
        force_tokens = ["\n", "{", "}", "[", "]", ":", ",", '"']
        
        kwargs = {
            "context": [text],
            "rate": target_ratio,
            "force_tokens": force_tokens,
            "use_context_level_filter": True,
            "use_token_level_filter": True,
            "rank_method": "longllmlingua",
            "reorder_context": "sort",
        }
        
        if query:
            kwargs["instruction"] = query
        
        result = self.compressor.compress_prompt(**kwargs)
        
        return CompressionResult(
            original_text=text,
            compressed_text=result["compressed_prompt"],
            original_tokens=result["origin_tokens"],
            compressed_tokens=result["compressed_tokens"],
            compression_ratio=_parse_ratio(result["ratio"]),
            mode="structured"
        )
