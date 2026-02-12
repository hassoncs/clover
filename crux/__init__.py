"""Crux - Intelligent prompt compression for LLMs."""

from .compressor import Compressor, CompressionResult
from .verifier import Verifier, VerificationResult

__version__ = "0.1.0"
__all__ = ["Compressor", "CompressionResult", "Verifier", "VerificationResult"]
