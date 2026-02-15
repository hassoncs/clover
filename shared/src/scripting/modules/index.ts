const GRID_MODULE_SOURCE = `
function worldToGrid(x, y, cellSize) {
  return {
    col: Math.floor(x / cellSize),
    row: Math.floor(y / cellSize),
  };
}

function gridToWorld(col, row, cellSize) {
  return {
    x: col * cellSize + cellSize / 2,
    y: row * cellSize + cellSize / 2,
  };
}

function neighbors(col, row, opts) {
  var includeDiagonals = opts && opts.diagonals ? true : false;
  var result = [];
  var i;
  var directions = [
    { col: 0, row: -1 },
    { col: 1, row: 0 },
    { col: 0, row: 1 },
    { col: -1, row: 0 },
  ];
  if (includeDiagonals) {
    directions.push(
      { col: 1, row: -1 },
      { col: 1, row: 1 },
      { col: -1, row: 1 },
      { col: -1, row: -1 }
    );
  }
  for (i = 0; i < directions.length; i++) {
    result.push({ col: col + directions[i].col, row: row + directions[i].row });
  }
  return result;
}

function cellKey(row, col) {
  return row + "," + col;
}

function isValidCell(grid, row, col) {
  if (row < 0 || row >= grid.length) return false;
  var rowCells = grid[row];
  if (!rowCells || col < 0 || col >= rowCells.length) return false;
  return true;
}

function floodFill(grid, row, col, matchFn) {
  var rows = grid.length;
  var startCell, matched, visited, queue, current, key, cell, nbrs, i, nKey;
  if (rows === 0) return [];
  startCell = grid[row] && grid[row][col];
  if (startCell === undefined) return [];

  matched = [];
  visited = {};
  queue = [{ row: row, col: col }];

  while (queue.length > 0) {
    current = queue.shift();
    key = cellKey(current.row, current.col);
    if (visited[key]) continue;
    visited[key] = true;

    if (!isValidCell(grid, current.row, current.col)) continue;

    cell = grid[current.row][current.col];
    if (cell === undefined || !matchFn(cell, startCell)) continue;

    matched.push({ row: current.row, col: current.col });

    nbrs = neighbors(current.col, current.row);
    for (i = 0; i < nbrs.length; i++) {
      nKey = cellKey(nbrs[i].row, nbrs[i].col);
      if (!visited[nKey]) {
        queue.push({ row: nbrs[i].row, col: nbrs[i].col });
      }
    }
  }

  return matched;
}

function findConnectedGroups(grid, matchFn, minSize) {
  var rows = grid.length;
  var visited, groups, row, col, key, cell, group, i;
  var min = minSize !== undefined ? minSize : 1;
  if (rows === 0) return [];

  visited = {};
  groups = [];

  for (row = 0; row < rows; row++) {
    if (!grid[row]) continue;
    for (col = 0; col < grid[row].length; col++) {
      key = cellKey(row, col);
      if (visited[key]) continue;

      cell = grid[row][col];
      if (cell === undefined) continue;

      group = floodFill(grid, row, col, matchFn);
      for (i = 0; i < group.length; i++) {
        visited[cellKey(group[i].row, group[i].col)] = true;
      }

      if (group.length >= min) {
        groups.push(group);
      }
    }
  }

  return groups;
}

function checkLine(grid, startRow, startCol, dRow, dCol, minLength, matchFn) {
  var cells, i, r, c, cell;
  cells = [{ row: startRow, col: startCol }];

  for (i = 1; i < minLength; i++) {
    r = startRow + dRow * i;
    c = startCol + dCol * i;
    if (!isValidCell(grid, r, c)) return null;
    cell = grid[r][c];
    if (cell === undefined || !matchFn(cell)) return null;
    cells.push({ row: r, col: c });
  }

  r = startRow + dRow * minLength;
  c = startCol + dCol * minLength;
  while (isValidCell(grid, r, c)) {
    cell = grid[r][c];
    if (cell === undefined || !matchFn(cell)) break;
    cells.push({ row: r, col: c });
    r = r + dRow;
    c = c + dCol;
  }

  return cells;
}

function findLineMatches(grid, minLength, matchFn) {
  var rows = grid.length;
  var directions, matches, foundLines, row, col, cell, d, line, lineKey, i, keys;
  if (rows === 0) return [];

  directions = [
    { dRow: 0, dCol: 1 },
    { dRow: 1, dCol: 0 },
    { dRow: 1, dCol: 1 },
    { dRow: 1, dCol: -1 },
  ];
  matches = [];
  foundLines = {};

  for (row = 0; row < rows; row++) {
    if (!grid[row]) continue;
    for (col = 0; col < grid[row].length; col++) {
      cell = grid[row][col];
      if (cell === undefined || !matchFn(cell)) continue;

      for (d = 0; d < directions.length; d++) {
        line = checkLine(grid, row, col, directions[d].dRow, directions[d].dCol, minLength, matchFn);
        if (line) {
          keys = [];
          for (i = 0; i < line.length; i++) {
            keys.push(cellKey(line[i].row, line[i].col));
          }
          keys.sort();
          lineKey = keys.join("|");
          if (!foundLines[lineKey]) {
            foundLines[lineKey] = true;
            matches.push({ cells: line, direction: directions[d] });
          }
        }
      }
    }
  }

  return matches;
}

module.exports = {
  worldToGrid: worldToGrid,
  gridToWorld: gridToWorld,
  neighbors: neighbors,
  cellKey: cellKey,
  isValidCell: isValidCell,
  floodFill: floodFill,
  findConnectedGroups: findConnectedGroups,
  findLineMatches: findLineMatches,
};
`;

const CONTAINERS_MODULE_SOURCE = `
function createStack(capacity) {
  var items = [];
  var maxCapacity = capacity !== undefined ? capacity : Infinity;

  return {
    push: function(item) {
      if (items.length >= maxCapacity) return false;
      items.push(item);
      return true;
    },
    pop: function() {
      return items.pop();
    },
    peek: function() {
      return items[items.length - 1];
    },
    isFull: function() {
      return items.length >= maxCapacity;
    },
    isEmpty: function() {
      return items.length === 0;
    },
    get items() {
      return items.slice();
    },
    get length() {
      return items.length;
    },
  };
}

function transfer(from, to) {
  var item = from.pop();
  if (item === undefined) return false;
  if (!to.push(item)) {
    from.push(item);
    return false;
  }
  return true;
}

module.exports = { createStack: createStack, transfer: transfer };
`;

const STATE_MACHINE_MODULE_SOURCE = `
function create(config) {
  var currentState = config.initial;
  var transitions = config.transitions || [];
  var enterCallbacks = {};
  var exitCallbacks = {};

  function findTransition(event) {
    var i, t;
    for (i = 0; i < transitions.length; i++) {
      t = transitions[i];
      if (t.event === event && (t.from === currentState || t.from === '*')) {
        return t;
      }
    }
    return null;
  }

  return {
    send: function(event) {
      var t = findTransition(event);
      var prevState, nextState, exitFns, enterFns, i;
      if (!t) return null;
      prevState = currentState;
      nextState = t.to;
      exitFns = exitCallbacks[prevState];
      if (exitFns) {
        for (i = 0; i < exitFns.length; i++) {
          exitFns[i](prevState, nextState);
        }
      }
      currentState = nextState;
      enterFns = enterCallbacks[nextState];
      if (enterFns) {
        for (i = 0; i < enterFns.length; i++) {
          enterFns[i](nextState, prevState);
        }
      }
      return currentState;
    },
    current: function() {
      return currentState;
    },
    canSend: function(event) {
      return findTransition(event) !== null;
    },
    is: function(state) {
      return currentState === state;
    },
    onEnter: function(state, fn) {
      if (!enterCallbacks[state]) enterCallbacks[state] = [];
      enterCallbacks[state].push(fn);
    },
    onExit: function(state, fn) {
      if (!exitCallbacks[state]) exitCallbacks[state] = [];
      exitCallbacks[state].push(fn);
    },
  };
}

module.exports = { create: create };
`;

const TIMER_MODULE_SOURCE = `
function createCooldown(duration) {
  var elapsed = duration;

  return {
    update: function(dt) {
      elapsed = elapsed + dt;
    },
    ready: function() {
      return elapsed >= duration;
    },
    reset: function() {
      elapsed = 0;
    },
    get elapsed() {
      return elapsed;
    },
  };
}

function createRepeating(interval) {
  var elapsed = 0;
  var didFire = false;
  var fireCount = 0;

  return {
    update: function(dt) {
      elapsed = elapsed + dt;
      if (elapsed >= interval) {
        didFire = true;
        fireCount = fireCount + 1;
        elapsed = elapsed - interval;
      } else {
        didFire = false;
      }
    },
    fired: function() {
      return didFire;
    },
    reset: function() {
      elapsed = 0;
      didFire = false;
    },
    get count() {
      return fireCount;
    },
  };
}

function createDelay(duration) {
  var elapsed = 0;
  var done = false;

  return {
    update: function(dt) {
      if (done) return;
      elapsed = elapsed + dt;
      if (elapsed >= duration) {
        done = true;
      }
    },
    elapsed: function() {
      return done;
    },
    reset: function() {
      elapsed = 0;
      done = false;
    },
    progress: function() {
      if (duration <= 0) return 1;
      var p = elapsed / duration;
      return p > 1 ? 1 : p;
    },
  };
}

module.exports = {
  createCooldown: createCooldown,
  createRepeating: createRepeating,
  createDelay: createDelay,
};
`;

const MATH_MODULE_SOURCE = `
function add(a, b) {
  return { x: a.x + b.x, y: a.y + b.y };
}

function sub(a, b) {
  return { x: a.x - b.x, y: a.y - b.y };
}

function scale(v, s) {
  return { x: v.x * s, y: v.y * s };
}

function length(v) {
  return Math.sqrt(v.x * v.x + v.y * v.y);
}

function normalize(v) {
  var len = length(v);
  if (len === 0) return { x: 0, y: 0 };
  return { x: v.x / len, y: v.y / len };
}

function distance(a, b) {
  var dx = b.x - a.x;
  var dy = b.y - a.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function dot(a, b) {
  return a.x * b.x + a.y * b.y;
}

function lerp(a, b, t) {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
  };
}

function clamp(val, min, max) {
  if (val < min) return min;
  if (val > max) return max;
  return val;
}

function remap(val, inMin, inMax, outMin, outMax) {
  var t = (val - inMin) / (inMax - inMin);
  return outMin + t * (outMax - outMin);
}

function randomRange(min, max) {
  return min + Math.random() * (max - min);
}

function randomInCircle(radius) {
  var angle = Math.random() * Math.PI * 2;
  var r = Math.sqrt(Math.random()) * radius;
  return { x: Math.cos(angle) * r, y: Math.sin(angle) * r };
}

function angle(v) {
  return Math.atan2(v.y, v.x);
}

function fromAngle(radians, len) {
  var l = len !== undefined ? len : 1;
  return { x: Math.cos(radians) * l, y: Math.sin(radians) * l };
}

module.exports = {
  add: add,
  sub: sub,
  scale: scale,
  length: length,
  normalize: normalize,
  distance: distance,
  dot: dot,
  lerp: lerp,
  clamp: clamp,
  remap: remap,
  randomRange: randomRange,
  randomInCircle: randomInCircle,
  angle: angle,
  fromAngle: fromAngle,
};
`;

const PARTY_MODULE_SOURCE = `
function createScoreboard(scores, playerNames) {
  var entries = [];
  var playerId;
  for (playerId in scores) {
    if (scores.hasOwnProperty(playerId)) {
      entries.push({
        playerId: playerId,
        playerName: playerNames[playerId] || playerId,
        score: scores[playerId],
      });
    }
  }
  entries.sort(function(a, b) {
    return b.score - a.score;
  });
  return entries;
}

function createMatchups(playerIds, items) {
  var n = playerIds.length;
  var matchups = [];
  var i;
  for (i = 0; i < n; i++) {
    var playerA = playerIds[i];
    var playerB = playerIds[(i + 1) % n];
    var item = items[i];
    matchups.push({
      playerA: playerA,
      playerB: playerB,
      item: item,
    });
  }
  return matchups;
}

function tallyVotes(responses, excludeSelf, authorMap) {
  var counts = {};
  var voterId;
  for (voterId in responses) {
    if (responses.hasOwnProperty(voterId)) {
      var response = responses[voterId];
      var choiceId = response.value;
      if (excludeSelf) {
        var author = authorMap[choiceId];
        if (author === voterId) {
          continue;
        }
      }
      if (!counts[choiceId]) {
        counts[choiceId] = 0;
      }
      counts[choiceId] = counts[choiceId] + 1;
    }
  }
  return counts;
}

function calculatePoints(voteCounts, opts) {
  var basePoints = opts.basePoints || 100;
  var roundMultiplier = opts.roundMultiplier || 1;
  var cleanSweepMultiplier = opts.cleanSweepMultiplier || 1.25;
  var points = {};
  var totalVotes = 0;
  var choiceId;
  for (choiceId in voteCounts) {
    if (voteCounts.hasOwnProperty(choiceId)) {
      totalVotes = totalVotes + voteCounts[choiceId];
    }
  }
  for (choiceId in voteCounts) {
    if (voteCounts.hasOwnProperty(choiceId)) {
      var count = voteCounts[choiceId];
      var earned = 0;
      if (totalVotes > 0) {
        earned = Math.round((count / totalVotes) * basePoints * roundMultiplier);
        if (count === totalVotes) {
          earned = Math.round(earned * cleanSweepMultiplier);
        }
      }
      points[choiceId] = earned;
    }
  }
  return points;
}

module.exports = {
  createScoreboard: createScoreboard,
  createMatchups: createMatchups,
  tallyVotes: tallyVotes,
  calculatePoints: calculatePoints,
};
`;

const CONTENT_MODULE_SOURCE = `
function shuffle(arr) {
  var result = [];
  var i;
  for (i = 0; i < arr.length; i++) {
    result.push(arr[i]);
  }
  for (i = result.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var temp = result[i];
    result[i] = result[j];
    result[j] = temp;
  }
  return result;
}

function selectForRound(pool, count, usedIds) {
  var available = [];
  var i;
  for (i = 0; i < pool.length; i++) {
    var item = pool[i];
    var id = item.id;
    if (!usedIds[id]) {
      available.push(item);
    }
  }
  var selected = [];
  for (i = 0; i < count && i < available.length; i++) {
    selected.push(available[i]);
  }
  return selected;
}

function markUsed(usedIds, items) {
  var i;
  for (i = 0; i < items.length; i++) {
    var item = items[i];
    if (item.id) {
      usedIds[item.id] = true;
    }
  }
}

module.exports = {
  shuffle: shuffle,
  selectForRound: selectForRound,
  markUsed: markUsed,
};
`;

export const SLOPCADE_MODULES: Record<string, string> = {
	"slopcade/grid": GRID_MODULE_SOURCE,
	"slopcade/containers": CONTAINERS_MODULE_SOURCE,
	"slopcade/state-machine": STATE_MACHINE_MODULE_SOURCE,
	"slopcade/timer": TIMER_MODULE_SOURCE,
	"slopcade/math": MATH_MODULE_SOURCE,
	"slopcade/party": PARTY_MODULE_SOURCE,
	"slopcade/content": CONTENT_MODULE_SOURCE,
};
