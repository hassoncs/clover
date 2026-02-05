import type { GameDefinition } from "@slopcade/shared";

export const metadata = {
  title: "Chess",
  description: "Classic chess game with simplified rules",
};

const WORLD_WIDTH = 16;
const WORLD_HEIGHT = 16;
const BOARD_SIZE = 8;
const SQUARE_SIZE = 1.8;
const PIECE_SIZE = 1.4;

const game: GameDefinition = {
  metadata: {
    id: "chess",
    title: "Chess",
    description: "Classic chess game - capture the opponent's king to win!",
    instructions: "Tap a piece to select it, tap a highlighted square to move. White moves first.",
    version: "1.0.0",
  },
  assetSystem: { activePackId: "default" },
  background: {
    type: "static",
    color: "#312e2b",
  },
  world: {
    gravity: { x: 0, y: 0 },
    pixelsPerMeter: 40,
    bounds: { width: WORLD_WIDTH, height: WORLD_HEIGHT },
  },
  camera: { type: "fixed", zoom: 1 },
  ui: {
    showTimer: false,
    backgroundColor: "#312e2b",
    variableDisplays: [
      { name: 'currentTurn', label: 'Turn', position: 'top-center' },
      { name: 'moveCount', label: 'Moves', position: 'top-right' },
    ],
  },
  winCondition: {
    expr: "gameOver == 1",
  },
  variables: {
    currentTurn: 0,
    selectedPiece: 0,
    moveCount: 0,
    gameOver: 0,
    winner: 0,
  },
  templates: {
    board_square_light: {
      id: "board_square_light",
      tags: ["board_square", "light"],
      visual: {
        type: "rect",
        width: SQUARE_SIZE,
        height: SQUARE_SIZE,
        color: "#f0d9b5",
      },
      physics: {
        bodyType: "static",
        density: 0,
      },
      collider: {
        shape: "box",
        width: SQUARE_SIZE,
        height: SQUARE_SIZE,
        isSensor: true,
      },
    },
    board_square_dark: {
      id: "board_square_dark",
      tags: ["board_square", "dark"],
      visual: {
        type: "rect",
        width: SQUARE_SIZE,
        height: SQUARE_SIZE,
        color: "#b58863",
      },
      physics: {
        bodyType: "static",
        density: 0,
      },
      collider: {
        shape: "box",
        width: SQUARE_SIZE,
        height: SQUARE_SIZE,
        isSensor: true,
      },
    },
    highlight: {
      id: "highlight",
      tags: ["highlight"],
      visual: {
        type: "circle",
        radius: SQUARE_SIZE * 0.2,
        color: "#7cb342",
        opacity: 0.6,
      },
      physics: {
        bodyType: "static",
        density: 0,
      },
      collider: {
        shape: "circle",
        radius: SQUARE_SIZE * 0.3,
        isSensor: true,
      },
    },
    white_king: {
      id: "white_king",
      tags: ["piece", "white", "king"],
      visual: {
        type: "circle",
        radius: PIECE_SIZE / 2,
        color: "#ffffff",
      },
      physics: {
        bodyType: "static",
        density: 0,
      },
      collider: {
        shape: "circle",
        radius: PIECE_SIZE / 2,
        isSensor: true,
      },
    },
    white_queen: {
      id: "white_queen",
      tags: ["piece", "white", "queen"],
      visual: {
        type: "circle",
        radius: PIECE_SIZE / 2,
        color: "#eeeeee",
      },
      physics: {
        bodyType: "static",
        density: 0,
      },
      collider: {
        shape: "circle",
        radius: PIECE_SIZE / 2,
        isSensor: true,
      },
    },
    white_rook: {
      id: "white_rook",
      tags: ["piece", "white", "rook"],
      visual: {
        type: "rect",
        width: PIECE_SIZE * 0.8,
        height: PIECE_SIZE * 0.8,
        color: "#eeeeee",
      },
      physics: {
        bodyType: "static",
        density: 0,
      },
      collider: {
        shape: "box",
        width: PIECE_SIZE * 0.8,
        height: PIECE_SIZE * 0.8,
        isSensor: true,
      },
    },
    white_bishop: {
      id: "white_bishop",
      tags: ["piece", "white", "bishop"],
      visual: {
        type: "circle",
        radius: PIECE_SIZE / 2.2,
        color: "#dddddd",
      },
      physics: {
        bodyType: "static",
        density: 0,
      },
      collider: {
        shape: "circle",
        radius: PIECE_SIZE / 2.2,
        isSensor: true,
      },
    },
    white_knight: {
      id: "white_knight",
      tags: ["piece", "white", "knight"],
      visual: {
        type: "rect",
        width: PIECE_SIZE * 0.7,
        height: PIECE_SIZE * 0.9,
        color: "#dddddd",
      },
      physics: {
        bodyType: "static",
        density: 0,
      },
      collider: {
        shape: "box",
        width: PIECE_SIZE * 0.7,
        height: PIECE_SIZE * 0.9,
        isSensor: true,
      },
    },
    white_pawn: {
      id: "white_pawn",
      tags: ["piece", "white", "pawn"],
      visual: {
        type: "circle",
        radius: PIECE_SIZE / 2.5,
        color: "#cccccc",
      },
      physics: {
        bodyType: "static",
        density: 0,
      },
      collider: {
        shape: "circle",
        radius: PIECE_SIZE / 2.5,
        isSensor: true,
      },
    },
    black_king: {
      id: "black_king",
      tags: ["piece", "black", "king"],
      visual: {
        type: "circle",
        radius: PIECE_SIZE / 2,
        color: "#111111",
      },
      physics: {
        bodyType: "static",
        density: 0,
      },
      collider: {
        shape: "circle",
        radius: PIECE_SIZE / 2,
        isSensor: true,
      },
    },
    black_queen: {
      id: "black_queen",
      tags: ["piece", "black", "queen"],
      visual: {
        type: "circle",
        radius: PIECE_SIZE / 2,
        color: "#222222",
      },
      physics: {
        bodyType: "static",
        density: 0,
      },
      collider: {
        shape: "circle",
        radius: PIECE_SIZE / 2,
        isSensor: true,
      },
    },
    black_rook: {
      id: "black_rook",
      tags: ["piece", "black", "rook"],
      visual: {
        type: "rect",
        width: PIECE_SIZE * 0.8,
        height: PIECE_SIZE * 0.8,
        color: "#222222",
      },
      physics: {
        bodyType: "static",
        density: 0,
      },
      collider: {
        shape: "box",
        width: PIECE_SIZE * 0.8,
        height: PIECE_SIZE * 0.8,
        isSensor: true,
      },
    },
    black_bishop: {
      id: "black_bishop",
      tags: ["piece", "black", "bishop"],
      visual: {
        type: "circle",
        radius: PIECE_SIZE / 2.2,
        color: "#333333",
      },
      physics: {
        bodyType: "static",
        density: 0,
      },
      collider: {
        shape: "circle",
        radius: PIECE_SIZE / 2.2,
        isSensor: true,
      },
    },
    black_knight: {
      id: "black_knight",
      tags: ["piece", "black", "knight"],
      visual: {
        type: "rect",
        width: PIECE_SIZE * 0.7,
        height: PIECE_SIZE * 0.9,
        color: "#333333",
      },
      physics: {
        bodyType: "static",
        density: 0,
      },
      collider: {
        shape: "box",
        width: PIECE_SIZE * 0.7,
        height: PIECE_SIZE * 0.9,
        isSensor: true,
      },
    },
    black_pawn: {
      id: "black_pawn",
      tags: ["piece", "black", "pawn"],
      visual: {
        type: "circle",
        radius: PIECE_SIZE / 2.5,
        color: "#444444",
      },
      physics: {
        bodyType: "static",
        density: 0,
      },
      collider: {
        shape: "circle",
        radius: PIECE_SIZE / 2.5,
        isSensor: true,
      },
    },
  },
  entities: [],
  rules: [],
  script: `
const BOARD_SIZE = 8;
const SQUARE_SIZE = 1.8;
const PIECE_SIZE = 1.4;
const WORLD_WIDTH = 16;
const WORLD_HEIGHT = 16;

// Convert board coordinates to world coordinates
function boardToWorld(col, row) {
  const offsetX = -(BOARD_SIZE * SQUARE_SIZE) / 2 + SQUARE_SIZE / 2;
  const offsetY = -(BOARD_SIZE * SQUARE_SIZE) / 2 + SQUARE_SIZE / 2;
  return {
    x: offsetX + col * SQUARE_SIZE,
    y: offsetY + row * SQUARE_SIZE,
  };
}

// Convert world coordinates to board coordinates
function worldToBoard(x, y) {
  const offsetX = -(BOARD_SIZE * SQUARE_SIZE) / 2 + SQUARE_SIZE / 2;
  const offsetY = -(BOARD_SIZE * SQUARE_SIZE) / 2 + SQUARE_SIZE / 2;
  const col = Math.floor((x - offsetX + SQUARE_SIZE / 2) / SQUARE_SIZE);
  const row = Math.floor((y - offsetY + SQUARE_SIZE / 2) / SQUARE_SIZE);
  return { col, row };
}

// Game state
let board = [];
let selectedPiece = null;
let validMoves = [];

// Initialize the board
function initBoard(ctx) {
  board = [];
  for (let row = 0; row < BOARD_SIZE; row++) {
    board[row] = [];
    for (let col = 0; col < BOARD_SIZE; col++) {
      board[row][col] = null;
    }
  }
  
  // Create board squares
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      const isLight = (row + col) % 2 === 0;
      const template = isLight ? 'board_square_light' : 'board_square_dark';
      const pos = boardToWorld(col, row);
      const squareId = 'square-' + col + '-' + row;
      
      ctx.spawnEntity(template, pos, { id: squareId });
    }
  }
  
  // Setup pieces - white pieces (rows 0-1)
  const whitePieces = [
    { row: 0, col: 0, type: 'rook', color: 'white' },
    { row: 0, col: 1, type: 'knight', color: 'white' },
    { row: 0, col: 2, type: 'bishop', color: 'white' },
    { row: 0, col: 3, type: 'queen', color: 'white' },
    { row: 0, col: 4, type: 'king', color: 'white' },
    { row: 0, col: 5, type: 'bishop', color: 'white' },
    { row: 0, col: 6, type: 'knight', color: 'white' },
    { row: 0, col: 7, type: 'rook', color: 'white' },
  ];
  
  // White pawns
  for (let col = 0; col < BOARD_SIZE; col++) {
    whitePieces.push({ row: 1, col, type: 'pawn', color: 'white' });
  }
  
  // Black pieces (rows 6-7)
  const blackPieces = [
    { row: 7, col: 0, type: 'rook', color: 'black' },
    { row: 7, col: 1, type: 'knight', color: 'black' },
    { row: 7, col: 2, type: 'bishop', color: 'black' },
    { row: 7, col: 3, type: 'queen', color: 'black' },
    { row: 7, col: 4, type: 'king', color: 'black' },
    { row: 7, col: 5, type: 'bishop', color: 'black' },
    { row: 7, col: 6, type: 'knight', color: 'black' },
    { row: 7, col: 7, type: 'rook', color: 'black' },
  ];
  
  // Black pawns
  for (let col = 0; col < BOARD_SIZE; col++) {
    blackPieces.push({ row: 6, col, type: 'pawn', color: 'black' });
  }
  
  // Spawn all pieces
  const allPieces = [...whitePieces, ...blackPieces];
  for (const piece of allPieces) {
    spawnPiece(ctx, piece.row, piece.col, piece.type, piece.color);
  }
  
  ctx.setVariable('currentTurn', 0);
  ctx.setVariable('moveCount', 0);
  ctx.setVariable('gameOver', 0);
}

function spawnPiece(ctx, row, col, type, color) {
  const template = color + '_' + type;
  const pos = boardToWorld(col, row);
  const pieceId = 'piece-' + col + '-' + row;
  
  ctx.spawnEntity(template, pos, { id: pieceId });
  
  board[row][col] = {
    id: pieceId,
    type: type,
    color: color,
    row: row,
    col: col,
  };
}

function getValidMoves(piece) {
  const moves = [];
  const { row, col, type, color } = piece;
  
  if (type === 'pawn') {
    const direction = color === 'white' ? 1 : -1;
    const newRow = row + direction;
    
    // Forward move
    if (newRow >= 0 && newRow < BOARD_SIZE && !board[newRow][col]) {
      moves.push({ row: newRow, col });
    }
    
    // Capture diagonally
    for (const dc of [-1, 1]) {
      const newCol = col + dc;
      if (newCol >= 0 && newCol < BOARD_SIZE && newRow >= 0 && newRow < BOARD_SIZE) {
        const target = board[newRow][newCol];
        if (target && target.color !== color) {
          moves.push({ row: newRow, col: newCol });
        }
      }
    }
  } else if (type === 'rook') {
    // Horizontal and vertical
    const directions = [[0, 1], [0, -1], [1, 0], [-1, 0]];
    for (const [dr, dc] of directions) {
      for (let i = 1; i < BOARD_SIZE; i++) {
        const newRow = row + dr * i;
        const newCol = col + dc * i;
        if (newRow < 0 || newRow >= BOARD_SIZE || newCol < 0 || newCol >= BOARD_SIZE) break;
        
        const target = board[newRow][newCol];
        if (!target) {
          moves.push({ row: newRow, col: newCol });
        } else {
          if (target.color !== color) {
            moves.push({ row: newRow, col: newCol });
          }
          break;
        }
      }
    }
  } else if (type === 'bishop') {
    // Diagonals
    const directions = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
    for (const [dr, dc] of directions) {
      for (let i = 1; i < BOARD_SIZE; i++) {
        const newRow = row + dr * i;
        const newCol = col + dc * i;
        if (newRow < 0 || newRow >= BOARD_SIZE || newCol < 0 || newCol >= BOARD_SIZE) break;
        
        const target = board[newRow][newCol];
        if (!target) {
          moves.push({ row: newRow, col: newCol });
        } else {
          if (target.color !== color) {
            moves.push({ row: newRow, col: newCol });
          }
          break;
        }
      }
    }
  } else if (type === 'queen') {
    // Combination of rook and bishop
    const directions = [[0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [1, -1], [-1, 1], [-1, -1]];
    for (const [dr, dc] of directions) {
      for (let i = 1; i < BOARD_SIZE; i++) {
        const newRow = row + dr * i;
        const newCol = col + dc * i;
        if (newRow < 0 || newRow >= BOARD_SIZE || newCol < 0 || newCol >= BOARD_SIZE) break;
        
        const target = board[newRow][newCol];
        if (!target) {
          moves.push({ row: newRow, col: newCol });
        } else {
          if (target.color !== color) {
            moves.push({ row: newRow, col: newCol });
          }
          break;
        }
      }
    }
  } else if (type === 'king') {
    // One square in any direction
    const directions = [[0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [1, -1], [-1, 1], [-1, -1]];
    for (const [dr, dc] of directions) {
      const newRow = row + dr;
      const newCol = col + dc;
      if (newRow >= 0 && newRow < BOARD_SIZE && newCol >= 0 && newCol < BOARD_SIZE) {
        const target = board[newRow][newCol];
        if (!target || target.color !== color) {
          moves.push({ row: newRow, col: newCol });
        }
      }
    }
  } else if (type === 'knight') {
    // L-shaped moves
    const offsets = [[2, 1], [2, -1], [-2, 1], [-2, -1], [1, 2], [1, -2], [-1, 2], [-1, -2]];
    for (const [dr, dc] of offsets) {
      const newRow = row + dr;
      const newCol = col + dc;
      if (newRow >= 0 && newRow < BOARD_SIZE && newCol >= 0 && newCol < BOARD_SIZE) {
        const target = board[newRow][newCol];
        if (!target || target.color !== color) {
          moves.push({ row: newRow, col: newCol });
        }
      }
    }
  }
  
  return moves;
}

function showValidMoves(ctx, moves) {
  // Clear existing highlights
  clearHighlights(ctx);
  
  validMoves = moves;
  for (let i = 0; i < moves.length; i++) {
    const move = moves[i];
    const pos = boardToWorld(move.col, move.row);
    const highlightId = 'highlight-' + i;
    ctx.spawnEntity('highlight', pos, { id: highlightId });
  }
}

function clearHighlights(ctx) {
  for (let i = 0; i < validMoves.length; i++) {
    const highlightId = 'highlight-' + i;
    ctx.destroyEntity(highlightId);
  }
  validMoves = [];
}

function movePiece(ctx, fromRow, fromCol, toRow, toCol) {
  const piece = board[fromRow][fromCol];
  if (!piece) return false;
  
  // Check if move is valid
  const moves = getValidMoves(piece);
  const isValid = moves.some(m => m.row === toRow && m.col === toCol);
  if (!isValid) return false;
  
  // Capture piece if exists
  const targetPiece = board[toRow][toCol];
  if (targetPiece) {
    ctx.destroyEntity(targetPiece.id);
    
    // Check for king capture (win condition)
    if (targetPiece.type === 'king') {
      ctx.setVariable('gameOver', 1);
      ctx.setVariable('winner', piece.color === 'white' ? 1 : 2);
    }
  }
  
  // Move piece
  const newPos = boardToWorld(toCol, toRow);
  const entities = ctx.query('.piece');
  for (const entity of entities) {
    if (entity.id === piece.id) {
      ctx.setEntityProperty(entity.id, 'transform.x', newPos.x);
      ctx.setEntityProperty(entity.id, 'transform.y', newPos.y);
      break;
    }
  }
  
  // Update board state
  board[toRow][toCol] = {
    ...piece,
    row: toRow,
    col: toCol,
  };
  board[fromRow][fromCol] = null;
  
  // Switch turn
  const currentTurn = ctx.getVariable('currentTurn');
  ctx.setVariable('currentTurn', currentTurn === 0 ? 1 : 0);
  ctx.setVariable('moveCount', ctx.getVariable('moveCount') + 1);
  
  return true;
}

exports.onStart = function(ctx) {
  initBoard(ctx);
  selectedPiece = null;
  validMoves = [];
};

exports.onInput = function(ctx, event) {
  if (ctx.getVariable('gameOver') === 1) return;
  
  if (event.type === 'tap') {
    const { worldX, worldY } = event;
    const { col, row } = worldToBoard(worldX, worldY);
    
    // Check if valid board position
    if (row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE) return;
    
    // Check if clicking on a valid move
    if (selectedPiece) {
      const isValidMove = validMoves.some(m => m.row === row && m.col === col);
      if (isValidMove) {
        const moved = movePiece(ctx, selectedPiece.row, selectedPiece.col, row, col);
        if (moved) {
          selectedPiece = null;
          clearHighlights(ctx);
        }
        return;
      }
    }
    
    // Select a piece
    const piece = board[row][col];
    if (piece) {
      const currentTurn = ctx.getVariable('currentTurn');
      const isWhiteTurn = currentTurn === 0;
      const isPieceWhite = piece.color === 'white';
      
      // Check if it's the right player's turn
      if ((isWhiteTurn && isPieceWhite) || (!isWhiteTurn && !isPieceWhite)) {
        selectedPiece = piece;
        const moves = getValidMoves(piece);
        showValidMoves(ctx, moves);
      }
    } else {
      // Clicked on empty square - deselect
      selectedPiece = null;
      clearHighlights(ctx);
    }
  }
};
`,
};

export default game;
