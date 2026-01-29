const GRID_SIZE = 3;

// Grid state: 0 = empty, 1 = X, 2 = O
const grid = [
  [0, 0, 0],
  [0, 0, 0],
  [0, 0, 0]
];

// Cell positions (world coordinates)
const cellPositions = {
  'cell00': { x: -1.6, y: 1.6 },
  'cell01': { x: 0, y: 1.6 },
  'cell02': { x: 1.6, y: 1.6 },
  'cell10': { x: -1.6, y: 0 },
  'cell11': { x: 0, y: 0 },
  'cell12': { x: 1.6, y: 0 },
  'cell20': { x: -1.6, y: -1.6 },
  'cell21': { x: 0, y: -1.6 },
  'cell22': { x: 1.6, y: -1.6 }
};

// Parse cell ID to get row and col
function parseCellId(cellId) {
  const match = cellId.match(/cell(\d)(\d)/);
  if (!match) return null;
  return {
    row: parseInt(match[1]),
    col: parseInt(match[2])
  };
}

export function handleCellTap(ctx, args) {
  const cellId = args.targetId;
  const pos = parseCellId(cellId);
  
  if (!pos) return;
  
  const { row, col } = pos;
  
  // Check if cell is already occupied
  if (grid[row][col] !== 0) return;
  
  const currentPlayer = ctx.getVariable('currentPlayer');
  
  // Place the piece
  grid[row][col] = currentPlayer;
  
  // Update variables
  ctx.setVariable(cellId, currentPlayer);
  ctx.setVariable('lastPlayer', currentPlayer);
  ctx.setVariable('moveCount', ctx.getVariable('moveCount') + 1);
  
  // Spawn the piece entity
  const position = cellPositions[cellId];
  ctx.spawn(currentPlayer === 1 ? 'pieceX' : 'pieceO', position);
  
  // Emit move committed event
  ctx.emit('move_committed');
}

export function checkWin(ctx) {
  const lastPlayer = ctx.getVariable('lastPlayer');
  
  if (lastPlayer === 0) return;
  
  // Check all win conditions
  if (checkWinForPlayer(lastPlayer)) {
    ctx.setVariable('winner', lastPlayer);
    ctx.setVariable('statusText', lastPlayer === 1 ? 'Player X wins!' : 'Player O wins!');
    ctx.emit('game_ended');
    ctx.win();
    return;
  }
  
  // Check for tie
  const moveCount = ctx.getVariable('moveCount');
  if (moveCount >= 9) {
    ctx.setVariable('statusText', "It's a tie!");
    ctx.emit('game_ended');
    ctx.lose();
    return;
  }
  
  // Switch player
  const nextPlayer = lastPlayer === 1 ? 2 : 1;
  ctx.setVariable('currentPlayer', nextPlayer);
  ctx.setVariable('statusText', nextPlayer === 1 ? "Player X's turn" : "Player O's turn");
}

function checkWinForPlayer(player) {
  // Check rows
  for (let row = 0; row < GRID_SIZE; row++) {
    if (grid[row][0] === player && grid[row][1] === player && grid[row][2] === player) {
      return true;
    }
  }
  
  // Check columns
  for (let col = 0; col < GRID_SIZE; col++) {
    if (grid[0][col] === player && grid[1][col] === player && grid[2][col] === player) {
      return true;
    }
  }
  
  // Check diagonals
  if (grid[0][0] === player && grid[1][1] === player && grid[2][2] === player) {
    return true;
  }
  if (grid[0][2] === player && grid[1][1] === player && grid[2][0] === player) {
    return true;
  }
  
  return false;
}

export function resetGame(ctx) {
  // Clear the grid
  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      grid[row][col] = 0;
    }
  }
  
  // Reset all cell variables
  ctx.setVariable('cell00', 0);
  ctx.setVariable('cell01', 0);
  ctx.setVariable('cell02', 0);
  ctx.setVariable('cell10', 0);
  ctx.setVariable('cell11', 0);
  ctx.setVariable('cell12', 0);
  ctx.setVariable('cell20', 0);
  ctx.setVariable('cell21', 0);
  ctx.setVariable('cell22', 0);
  
  // Reset game state
  ctx.setVariable('moveCount', 0);
  ctx.setVariable('lastPlayer', 0);
  ctx.setVariable('winner', 0);
  ctx.setVariable('currentPlayer', 1);
  ctx.setVariable('statusText', "Player X's turn");
  
  // Destroy all pieces
  ctx.destroyByTag('piece');
  
  // Reset state machine
  ctx.transitionState('turnFlow', 'player1Turn');
}
