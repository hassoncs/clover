"""Verification of compressed prompts using LLM auditing."""

import os
from dataclasses import dataclass
from typing import Literal, Optional

try:
    from litellm import completion
    LITELLM_AVAILABLE = True
except ImportError:
    LITELLM_AVAILABLE = False


AUDITOR_SYSTEM_PROMPT = """You are an expert prompt compression auditor. Your task is to verify that a compressed prompt preserves the essential meaning and instructions of the original.

Evaluate the compressed version on these criteria:
1. **Semantic Preservation**: Does it retain the core meaning and intent?
2. **Instruction Completeness**: Are all critical instructions present?
3. **Context Integrity**: Is necessary context maintained?
4. **Usability**: Can an LLM understand and follow the compressed version?

Respond with a JSON object:
{
  "verdict": "PASS" | "FAIL" | "DEGRADED",
  "confidence": 0.0-1.0,
  "issues": ["list of any problems found"],
  "recommendation": "brief recommendation"
}

- PASS: Compression is excellent, no significant loss
- DEGRADED: Minor loss acceptable for the compression ratio
- FAIL: Critical information lost, compression too aggressive
"""


@dataclass
class VerificationResult:
    """Result of compression verification."""
    
    verdict: Literal["PASS", "FAIL", "DEGRADED", "SKIPPED"]
    confidence: float
    issues: list[str]
    recommendation: str
    
    @property
    def passed(self) -> bool:
        """Check if verification passed."""
        return self.verdict in ("PASS", "DEGRADED")


class Verifier:
    """LLM-based verification of compressed prompts."""
    
    def __init__(self, model: str = "gpt-4o-mini"):
        """Initialize verifier with specified model.
        
        Args:
            model: LiteLLM model identifier (e.g., 'gpt-4o-mini', 'claude-3-haiku-20240307')
        """
        self.model = model
        
        if not LITELLM_AVAILABLE:
            print("⚠️  Warning: litellm not installed. Verification will be skipped.")
            print("   Install with: pip install litellm")
    
    def verify(self, original: str, compressed: str) -> VerificationResult:
        """Verify that compressed prompt preserves essential meaning.
        
        Args:
            original: Original uncompressed text
            compressed: Compressed version to verify
            
        Returns:
            VerificationResult with verdict and analysis
        """
        # Check for API key
        api_key = os.getenv("OPENAI_API_KEY") or os.getenv("LLM_API_KEY") or os.getenv("ANTHROPIC_API_KEY")
        
        if not LITELLM_AVAILABLE or not api_key:
            return VerificationResult(
                verdict="SKIPPED",
                confidence=0.0,
                issues=["Verification skipped: litellm not available or API key missing"],
                recommendation="Install litellm and set OPENAI_API_KEY or LLM_API_KEY to enable verification"
            )
        
        try:
            # Call LLM for verification
            response = completion(
                model=self.model,
                messages=[
                    {"role": "system", "content": AUDITOR_SYSTEM_PROMPT},
                    {"role": "user", "content": f"""Original prompt:
{original}

---

Compressed prompt:
{compressed}

---

Please verify the compression quality."""}
                ],
                response_format={"type": "json_object"}
            )
            
            # Parse response
            import json
            result = json.loads(response.choices[0].message.content)
            
            return VerificationResult(
                verdict=result.get("verdict", "FAIL"),
                confidence=result.get("confidence", 0.0),
                issues=result.get("issues", []),
                recommendation=result.get("recommendation", "")
            )
            
        except Exception as e:
            return VerificationResult(
                verdict="SKIPPED",
                confidence=0.0,
                issues=[f"Verification error: {str(e)}"],
                recommendation="Check API credentials and try again"
            )
