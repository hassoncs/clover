"""Command-line interface for Crux."""

import sys
from pathlib import Path
from typing import Optional

try:
    import typer
    from rich.console import Console
    from rich.table import Table
    from rich.panel import Panel
    RICH_AVAILABLE = True
except ImportError:
    RICH_AVAILABLE = False
    print("⚠️  Warning: typer and rich not installed. CLI will not work.")
    print("   Install with: pip install typer rich")

from .compressor import Compressor
from .verifier import Verifier


app = typer.Typer(
    name="crux",
    help="Intelligent prompt compression for LLMs",
    add_completion=False
)

console = Console() if RICH_AVAILABLE else None


@app.command()
def compress(
    input_file: Path = typer.Argument(..., help="Input file to compress"),
    output_file: Optional[Path] = typer.Option(None, "--output", "-o", help="Output file (default: stdout)"),
    ratio: float = typer.Option(0.5, "--ratio", "-r", help="Target compression ratio (0.0-1.0)"),
    mode: str = typer.Option("text", "--mode", "-m", help="Compression mode: text or code"),
    verify: bool = typer.Option(False, "--verify", "-v", help="Verify compression quality with LLM"),
    model: str = typer.Option(
        "microsoft/llmlingua-2-xlm-roberta-large-meetingbank",
        "--model",
        help="Compression model to use"
    ),
):
    """Compress a prompt file using LLMLingua."""
    
    if not RICH_AVAILABLE:
        print("Error: typer and rich are required. Install with: pip install typer rich")
        sys.exit(1)
    
    # Validate mode
    if mode not in ("text", "code"):
        console.print(f"[red]Error: mode must be 'text' or 'code', got '{mode}'[/red]")
        raise typer.Exit(1)
    
    # Validate ratio
    if not 0.0 < ratio < 1.0:
        console.print(f"[red]Error: ratio must be between 0.0 and 1.0, got {ratio}[/red]")
        raise typer.Exit(1)
    
    # Read input
    if not input_file.exists():
        console.print(f"[red]Error: Input file not found: {input_file}[/red]")
        raise typer.Exit(1)
    
    with console.status(f"[bold blue]Reading {input_file}..."):
        text = input_file.read_text()
    
    # Compress
    with console.status(f"[bold blue]Compressing with {mode} mode (target ratio: {ratio})..."):
        compressor = Compressor(model_name=model)
        result = compressor.compress(text, target_ratio=ratio, mode=mode)
    
    # Display results
    table = Table(title="Compression Results", show_header=True, header_style="bold magenta")
    table.add_column("Metric", style="cyan", width=20)
    table.add_column("Original", justify="right", style="yellow")
    table.add_column("Compressed", justify="right", style="green")
    
    table.add_row("Tokens", str(result.original_tokens), str(result.compressed_tokens))
    table.add_row("Characters", str(len(result.original_text)), str(len(result.compressed_text)))
    table.add_row(
        "Compression Ratio",
        "1.00",
        f"{result.compression_ratio:.2f}"
    )
    table.add_row(
        "Savings",
        "0%",
        f"{result.savings_percent:.1f}%"
    )
    
    console.print(table)
    
    # Verify if requested
    if verify:
        with console.status("[bold blue]Verifying compression quality..."):
            verifier = Verifier()
            verification = verifier.verify(result.original_text, result.compressed_text)
        
        # Display verification results
        verdict_color = {
            "PASS": "green",
            "DEGRADED": "yellow",
            "FAIL": "red",
            "SKIPPED": "dim"
        }[verification.verdict]
        
        console.print(Panel(
            f"[bold {verdict_color}]Verdict: {verification.verdict}[/bold {verdict_color}]\n"
            f"Confidence: {verification.confidence:.1%}\n\n"
            f"[bold]Issues:[/bold]\n" + "\n".join(f"  • {issue}" for issue in verification.issues) + "\n\n"
            f"[bold]Recommendation:[/bold]\n  {verification.recommendation}",
            title="Verification Results",
            border_style=verdict_color
        ))
        
        if not verification.passed and verification.verdict != "SKIPPED":
            console.print("[yellow]⚠️  Compression may have degraded quality. Consider a higher ratio.[/yellow]")
    
    # Write output
    if output_file:
        output_file.write_text(result.compressed_text)
        console.print(f"[green]✓[/green] Compressed output written to: {output_file}")
    else:
        console.print("\n[bold]Compressed Output:[/bold]")
        console.print(Panel(result.compressed_text, border_style="dim"))


@app.command()
def version():
    """Show version information."""
    from . import __version__
    
    if RICH_AVAILABLE:
        console.print(f"[bold]Crux[/bold] version {__version__}")
    else:
        print(f"Crux version {__version__}")


def main():
    """Entry point for CLI."""
    if not RICH_AVAILABLE:
        print("Error: typer and rich are required")
        print("Install with: pip install typer rich")
        sys.exit(1)
    
    app()


if __name__ == "__main__":
    main()
