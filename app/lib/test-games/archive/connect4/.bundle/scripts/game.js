const COLS = 7;
const ROWS = 6;

const grid = [];
for (let r = 0; r < ROWS; r++) {
  grid[r] = [];
  for (let c = 0; c < COLS; c++) {
    grid[r][c] = 0;
  }
}

export function handleColumnTap(ctx, args) {
  const col = args.column;
  const currentPlayer = ctx.getVariable('currentPlayer');
  
  let row = -1;
  for (let r = ROWS - 1; r >= 0; r--) {
    if (grid[r][col] === 0) {
      row = r;
      break;
    }
  }
  
  if (row === -1) return;
  
  grid[row][col] = currentPlayer;
  
  ctx.setVariable('col' + col + 'Height', ctx.getVariable('col' + col + 'Height') + 1);
  ctx.setVariable('moveCount', ctx.getVariable('moveCount') + 1);
  
  ctx.spawn(currentPlayer === 1 ? 'redDisc' : 'yellowDisc', {
    x: -3.3 + col * 1.1,
    y: -1.65 - row * 1.1
  });
  
  ctx.emit('disc_dropped');
  
  if (checkWinInternal(currentPlayer)) {
    ctx.emit('game_ended');
    ctx.win();
  } else if (ctx.getVariable('moveCount') >= 42) {
    ctx.emit('game_ended');
    ctx.lose();
  } else {
    ctx.setVariable('currentPlayer', currentPlayer === 1 ? 2 : 1);
  }
}

export function checkWin(ctx) {
  const currentPlayer = ctx.getVariable('currentPlayer');
  
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (grid[r][c] !== currentPlayer) continue;
      
      if (c + 3 < COLS) {
        if (grid[r][c+1] === currentPlayer && 
            grid[r][c+2] === currentPlayer && 
            grid[r][c+3] === currentPlayer) {
          return true;
        }
      }
      
      if (r + 3 < ROWS) {
        if (grid[r+1][c] === currentPlayer && 
            grid[r+2][c] === currentPlayer && 
            grid[r+3][c] === currentPlayer) {
          return true;
        }
      }
      
      if (r + 3 < ROWS && c + 3 < COLS) {
        if (grid[r+1][c+1] === currentPlayer && 
            grid[r+2][c+2] === currentPlayer && 
            grid[r+3][c+3] === currentPlayer) {
          return true;
        }
      }
      
      if (r + 3 < ROWS && c - 3 >= 0) {
        if (grid[r+1][c-1] === currentPlayer && 
            grid[r+2][c-2] === currentPlayer && 
            grid[r+3][c-3] === currentPlayer) {
          return true;
        }
      }
    }
  }
  
  return false;
}

function checkWinInternal(player) {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (grid[r][c] !== player) continue;
      
      if (c + 3 < COLS && 
          grid[r][c+1] === player && 
          grid[r][c+2] === player && 
          grid[r][c+3] === player) return true;
      
      if (r + 3 < ROWS && 
          grid[r+1][c] === player && 
          grid[r+2][c] === player && 
          grid[r+3][c] === player) return true;
      
      if (r + 3 < ROWS && c + 3 < COLS && 
          grid[r+1][c+1] === player && 
          grid[r+2][c+2] === player && 
          grid[r+3][c+3] === player) return true;
      
      if (r + 3 < ROWS && c - 3 >= 0 && 
          grid[r+1][c-1] === player && 
          grid[r+2][c-2] === player && 
          grid[r+3][c-3] === player) return true;
    }
  }
  return false;
}
