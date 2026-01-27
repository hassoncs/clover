
import * as fs from 'fs';
import * as path from 'path';

export interface ExperimentRun {
  id: string;
  params: {
    theme: string;
    strength: number;
    promptModifiers: string[];
    controlType: string;
  };
  paths: {
    silhouette: string;
    prompt: string;
    generated: string;
    final: string;
  };
  timestamp: number;
}

export function generateComparisonReport(outputDir: string, runs: ExperimentRun[]) {
  const reportPath = path.join(outputDir, 'comparison.html');
  
  const themes = [...new Set(runs.map(r => r.params.theme))];
  const strengths = [...new Set(runs.map(r => r.params.strength))];

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>UI Generation Experiment Report</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
      background-color: #1a1a1a;
      color: #f0f0f0;
      margin: 0;
      padding: 20px;
    }
    h1 { margin-bottom: 20px; }
    
    /* Filter Styles */
    .filter-section {
      margin-bottom: 15px;
      width: 100%;
    }
    .filter-section h3 {
      font-size: 0.9em;
      margin-bottom: 8px;
      color: #aaa;
      margin-top: 0;
    }
    .filter-buttons {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }
    .filter-btn {
      padding: 6px 12px;
      background: #333;
      border: 2px solid #555;
      border-radius: 4px;
      color: #f0f0f0;
      cursor: pointer;
      font-size: 0.85em;
      transition: all 0.2s;
    }
    .filter-btn:hover {
      background: #444;
    }
    .filter-btn.active {
      background: #4CAF50;
      border-color: #4CAF50;
    }
    .card.hidden {
      display: none;
    }

    .controls {
      background: #2a2a2a;
      padding: 15px;
      border-radius: 8px;
      margin-bottom: 20px;
      display: flex;
      gap: 20px;
      flex-wrap: wrap;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 20px;
    }
    .card {
      background: #2a2a2a;
      border-radius: 8px;
      overflow: hidden;
      border: 1px solid #333;
      transition: transform 0.2s;
    }
    .card:hover {
      transform: translateY(-2px);
      border-color: #555;
    }
    .card-header {
      padding: 10px;
      background: #333;
      font-size: 0.9em;
      border-bottom: 1px solid #444;
    }
    .card-body {
      padding: 10px;
    }
    .images {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 5px;
      margin-bottom: 10px;
    }
    .image-container {
      position: relative;
      aspect-ratio: 1;
      background: #111;
      border-radius: 4px;
      overflow: hidden;
    }
    .image-container img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      cursor: pointer;
    }
    .image-label {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      background: rgba(0,0,0,0.7);
      color: #fff;
      font-size: 0.7em;
      padding: 2px 5px;
      text-align: center;
    }
    .params {
      font-size: 0.8em;
      color: #aaa;
    }
    .param-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 4px;
    }
    .prompt-details {
      margin-top: 10px;
      font-size: 0.8em;
    }
    details summary {
      cursor: pointer;
      color: #888;
    }
    details summary:hover {
      color: #fff;
    }
    pre {
      white-space: pre-wrap;
      background: #111;
      padding: 8px;
      border-radius: 4px;
      margin-top: 5px;
      color: #ccc;
    }
    /* Modal for zoom */
    .modal {
      display: none;
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0,0,0,0.9);
      z-index: 1000;
      justify-content: center;
      align-items: center;
      padding: 20px;
    }
    .modal.active { display: flex; }
    .modal img {
      max-width: 90%;
      max-height: 90%;
      object-fit: contain;
    }
    
    /* Comparison Controls */
    .comparison-controls {
      margin-bottom: 10px;
      display: flex;
      gap: 15px;
      justify-content: center;
      background: #222;
      padding: 8px;
      border-radius: 4px;
    }
    .comparison-controls label {
      cursor: pointer;
      user-select: none;
      display: flex;
      align-items: center;
      gap: 5px;
      font-size: 0.9em;
    }
    
    /* Overlay Container */
    .image-overlay-container {
      position: relative;
      width: 100%;
      aspect-ratio: 1;
      background: #111;
      border-radius: 4px;
      overflow: hidden;
      cursor: default;
      border: 2px solid transparent;
      transition: border-color 0.2s;
    }
    .image-overlay-container[data-mode="click"] {
      cursor: pointer;
      border-color: #4CAF50;
    }
    
    /* Layers */
    .silhouette-layer, .generated-layer {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      object-fit: contain;
      pointer-events: none;
      transition: opacity 0.15s ease-in-out;
    }
    .generated-layer {
      opacity: 0;
    }
    
    /* Mode: Generated */
    .image-overlay-container[data-mode="generated"] .generated-layer {
      opacity: 1;
    }
    
    /* Mode: Click (Active state) */
    .image-overlay-container[data-mode="click"]:active .generated-layer {
      opacity: 1;
    }
  </style>
</head>
<body>
  <h1>UI Generation Experiments</h1>
  
  <div class="controls">
    <div class="filter-section">
      <h3>Filter by Theme:</h3>
      <div class="filter-buttons">
        <button class="filter-btn active" data-filter-type="theme" data-filter-value="all">All</button>
        ${themes.map(theme => `
          <button class="filter-btn active" data-filter-type="theme" data-filter-value="${theme}">${theme}</button>
        `).join('')}
      </div>
    </div>

    <div class="filter-section">
      <h3>Filter by Strength:</h3>
      <div class="filter-buttons">
        <button class="filter-btn active" data-filter-type="strength" data-filter-value="all">All</button>
        ${strengths.map(strength => `
          <button class="filter-btn active" data-filter-type="strength" data-filter-value="${strength}">${strength}</button>
        `).join('')}
      </div>
    </div>

    <div style="width: 100%; border-top: 1px solid #444; margin-top: 10px; padding-top: 10px; display: flex; gap: 20px;">
      <div>
        <strong>Total Runs:</strong> ${runs.length}
      </div>
      <div>
        <strong>Generated:</strong> ${new Date().toLocaleString()}
      </div>
    </div>
  </div>

  <div class="grid">
    ${runs.map(run => renderRunCard(run)).join('')}
  </div>

  <div class="modal" id="imageModal" onclick="this.classList.remove('active')">
    <img id="modalImage" src="" alt="Zoomed view">
  </div>

  <script>
    const filterState = {
      themes: new Set(['all']),
      strengths: new Set(['all'])
    };

    function updateFilters() {
      const cards = document.querySelectorAll('.card');
      
      cards.forEach(card => {
        const theme = card.dataset.theme;
        const strength = card.dataset.strength;
        
        const themeMatch = filterState.themes.has('all') || filterState.themes.has(theme);
        const strengthMatch = filterState.strengths.has('all') || filterState.strengths.has(strength);
        
        if (themeMatch && strengthMatch) {
          card.classList.remove('hidden');
        } else {
          card.classList.add('hidden');
        }
      });
    }

    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const filterType = btn.dataset.filterType;
        const filterValue = btn.dataset.filterValue;
        
        if (filterValue === 'all') {
          if (btn.classList.contains('active')) {
            btn.classList.remove('active');
            filterState[filterType + 's'].delete('all');
          } else {
            btn.classList.add('active');
            filterState[filterType + 's'].add('all');
            document.querySelectorAll(\`[data-filter-type="\${filterType}"]:not([data-filter-value="all"])\`).forEach(b => {
              b.classList.remove('active');
              filterState[filterType + 's'].delete(b.dataset.filterValue);
            });
          }
        } else {
          btn.classList.toggle('active');
          
          if (btn.classList.contains('active')) {
            filterState[filterType + 's'].add(filterValue);
            const allBtn = document.querySelector(\`[data-filter-type="\${filterType}"][data-filter-value="all"]\`);
            if (allBtn) {
              allBtn.classList.remove('active');
              filterState[filterType + 's'].delete('all');
            }
          } else {
            filterState[filterType + 's'].delete(filterValue);
            if (filterState[filterType + 's'].size === 0) {
              const allBtn = document.querySelector(\`[data-filter-type="\${filterType}"][data-filter-value="all"]\`);
              if (allBtn) {
                allBtn.classList.add('active');
                filterState[filterType + 's'].add('all');
              }
            }
          }
        }
        
        updateFilters();
      });
    });

    function showImage(src) {
      const modal = document.getElementById('imageModal');
      const img = document.getElementById('modalImage');
      img.src = src;
      modal.classList.add('active');
    }

    function updateMode(runId, mode) {
      const container = document.getElementById('overlay-' + runId);
      if (container) {
        container.setAttribute('data-mode', mode);
      }
    }
  </script>
</body>
</html>
  `;

  fs.writeFileSync(reportPath, html);
  console.log(`Report generated at: ${reportPath}`);
}

function renderRunCard(run: ExperimentRun): string {
  // Helper to read prompt file content if it exists
  let promptContent = 'Prompt file not found';
  try {
    if (fs.existsSync(run.paths.prompt)) {
      promptContent = fs.readFileSync(run.paths.prompt, 'utf-8');
    }
  } catch (e) {
    promptContent = 'Error reading prompt';
  }

  // Make paths relative for HTML
  const relPath = (p: string) => {
    const parts = p.split(path.sep);
    // Find the part that starts with 'run-'
    const runIndex = parts.findIndex(part => part.startsWith('run-'));
    if (runIndex !== -1) {
      return parts.slice(runIndex).join('/');
    }
    return path.basename(p);
  };

  const runIdClean = run.id.replace(/[^a-zA-Z0-9]/g, '-');

  return `
    <div class="card" data-theme="${run.params.theme}" data-strength="${run.params.strength}">
      <div class="card-header">
        Run: ${run.id}
      </div>
      <div class="card-body">
        
        <div class="comparison-controls">
          <label>
            <input type="radio" name="mode-${runIdClean}" value="silhouette" checked 
                   onchange="updateMode('${runIdClean}', 'silhouette')"> 
            Silhouette
          </label>
          <label>
            <input type="radio" name="mode-${runIdClean}" value="generated"
                   onchange="updateMode('${runIdClean}', 'generated')"> 
            Generated
          </label>
          <label>
            <input type="radio" name="mode-${runIdClean}" value="click"
                   onchange="updateMode('${runIdClean}', 'click')"> 
            Click to Switch
          </label>
        </div>

        <div id="overlay-${runIdClean}" class="image-overlay-container" data-mode="silhouette">
          <img class="silhouette-layer" src="${relPath(run.paths.silhouette)}" alt="Silhouette">
          <img class="generated-layer" src="${relPath(run.paths.generated)}" alt="Generated">
        </div>
        
        <div class="params" style="margin-top: 15px;">
          <div class="param-row">
            <span>Theme:</span>
            <span title="${run.params.theme}">${run.params.theme.substring(0, 20)}${run.params.theme.length > 20 ? '...' : ''}</span>
          </div>
          <div class="param-row">
            <span>Strength:</span>
            <span>${run.params.strength}</span>
          </div>
          <div class="param-row">
            <span>Modifiers:</span>
            <span>${run.params.promptModifiers.length}</span>
          </div>
        </div>

        <div class="prompt-details">
          <details>
            <summary>View Prompt</summary>
            <pre>${promptContent}</pre>
          </details>
        </div>
      </div>
    </div>
  `;
}
