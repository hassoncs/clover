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
from .detector import detect_mode


app = typer.Typer(
    name="crux",
    help="Intelligent prompt compression for LLMs",
    add_completion=False
)

console = Console() if RICH_AVAILABLE else None


@app.command()
def compress(
    input_path: Path = typer.Argument(..., help="Input file or directory to compress"),
    output: Optional[Path] = typer.Option(None, "--output", "-o", help="Output file or directory"),
    ratio: float = typer.Option(0.5, "--ratio", "-r", help="Target compression ratio (0.0-1.0)"),
    mode: Optional[str] = typer.Option(None, "--mode", "-m", help="Compression mode: text, code, or structured (auto-detected if not specified)"),
    query: Optional[str] = typer.Option(None, "--query", "-q", help="Query for query-aware compression"),
    verify: bool = typer.Option(False, "--verify", "-v", help="Verify compression quality with LLM"),
    model: str = typer.Option(
        "microsoft/llmlingua-2-xlm-roberta-large-meetingbank",
        "--model",
        help="Compression model to use"
    ),
):
    """Compress a prompt file or directory using LLMLingua."""
    
    if not RICH_AVAILABLE:
        print("Error: typer and rich are required. Install with: pip install typer rich")
        sys.exit(1)
    
    if not input_path.exists():
        console.print(f"[red]Error: Input path not found: {input_path}[/red]")
        raise typer.Exit(1)
    
    if input_path.is_dir():
        _compress_directory(input_path, output, ratio, mode, query, verify, model)
    else:
        _compress_file(input_path, output, ratio, mode, query, verify, model)


def _compress_file(
    input_file: Path,
    output_file: Optional[Path],
    ratio: float,
    mode: Optional[str],
    query: Optional[str],
    verify: bool,
    model: str
):
    if mode and mode not in ("text", "code", "structured"):
        console.print(f"[red]Error: mode must be 'text', 'code', or 'structured', got '{mode}'[/red]")
        raise typer.Exit(1)
    
    if not 0.0 < ratio < 1.0:
        console.print(f"[red]Error: ratio must be between 0.0 and 1.0, got {ratio}[/red]")
        raise typer.Exit(1)
    
    detected_mode = mode or detect_mode(input_file)
    
    with console.status(f"[bold blue]Reading {input_file}..."):
        text = input_file.read_text()
    
    with console.status(f"[bold blue]Compressing with {detected_mode} mode (target ratio: {ratio})..."):
        compressor = Compressor(model_name=model)
        result = compressor.compress(text, target_ratio=ratio, mode=detected_mode, query=query)
    
    _display_results(result, verify)
    
    if output_file:
        output_file.parent.mkdir(parents=True, exist_ok=True)
        output_file.write_text(result.compressed_text)
        console.print(f"[green]✓[/green] Compressed output written to: {output_file}")
    else:
        console.print("\n[bold]Compressed Output:[/bold]")
        console.print(Panel(result.compressed_text, border_style="dim"))


def _compress_directory(
    input_dir: Path,
    output_dir: Optional[Path],
    ratio: float,
    mode: Optional[str],
    query: Optional[str],
    verify: bool,
    model: str
):
    if mode and mode not in ("text", "code", "structured"):
        console.print(f"[red]Error: mode must be 'text', 'code', or 'structured', got '{mode}'[/red]")
        raise typer.Exit(1)
    
    if not 0.0 < ratio < 1.0:
        console.print(f"[red]Error: ratio must be between 0.0 and 1.0, got {ratio}[/red]")
        raise typer.Exit(1)
    
    crux_dir = input_dir / ".crux" / "compressed"
    target_dir = output_dir or crux_dir
    target_dir.mkdir(parents=True, exist_ok=True)
    
    files = list(input_dir.rglob("*"))
    text_files = [f for f in files if f.is_file() and not f.name.startswith(".")]
    
    console.print(f"[bold blue]Processing {len(text_files)} files from {input_dir}...[/bold blue]")
    
    compressor = Compressor(model_name=model)
    processed = 0
    
    for file_path in text_files:
        try:
            relative_path = file_path.relative_to(input_dir)
            output_path = target_dir / relative_path
            
            detected_mode = mode or detect_mode(file_path)
            
            text = file_path.read_text()
            result = compressor.compress(text, target_ratio=ratio, mode=detected_mode, query=query)
            
            output_path.parent.mkdir(parents=True, exist_ok=True)
            output_path.write_text(result.compressed_text)
            
            console.print(f"[green]✓[/green] {relative_path} ({detected_mode}, {result.savings_percent:.1f}% saved)")
            processed += 1
            
        except Exception as e:
            console.print(f"[yellow]⚠[/yellow] Skipped {file_path.name}: {e}")
    
    console.print(f"\n[bold green]Processed {processed}/{len(text_files)} files[/bold green]")
    console.print(f"Output directory: {target_dir}")


def _display_results(result, verify: bool):
    table = Table(title="Compression Results", show_header=True, header_style="bold magenta")
    table.add_column("Metric", style="cyan", width=20)
    table.add_column("Original", justify="right", style="yellow")
    table.add_column("Compressed", justify="right", style="green")
    
    table.add_row("Mode", result.mode, result.mode)
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
    
    if verify:
        with console.status("[bold blue]Verifying compression quality..."):
            verifier = Verifier()
            verification = verifier.verify(result.original_text, result.compressed_text)
        
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
