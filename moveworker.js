importScripts('fastboard.js');

class NegamaxCache {
  constructor(size) {
    this.size = size;
    this.usedSize = 0;
    this.collisions = 0;
    this.boards = new Float64Array(size);
    this.moves = new Uint8Array(size);
    this.values = new Int8Array(size);
    this.alphas = new Int8Array(size);
    this.betas = new Int8Array(size);
  }

  put(board, col, val, alpha, beta) {
    let h = hash(board, alpha, beta) % this.size;
    if (!this.boards[h]) {
      this.usedSize++;
    } else {
      this.collisions++;
    }
    this.boards[h] = board.bits;
    this.moves[h] = col;
    this.values[h] = val;
    this.alphas[h] = alpha;
    this.betas[h] = beta;
  }

  getValue(board, alpha, beta) {
    let h = hash(board, alpha, beta) % this.size;
    if (this.boards[h] != board.bits || this.alphas[h] != alpha || this.betas[h] != beta) {
      return null;
    }
    return this.values[h];
  }

  getMove(board, alpha, beta) {
    let h = hash(board, alpha, beta) % this.size;
    if (this.boards[h] != board.bits || this.alphas[h] != alpha || this.betas[h] != beta) {
      return null;
    }
    return this.moves[h];
  }
}

function hash(board, alpha, beta) {
  return board.bits + 13 * (alpha + 1) + 17 * (beta + 1);
}

function negamax(board, alpha, beta, cache, stats) {
  stats.nodes++;
  if (stats.nodes % 1e6 == 0) {
    console.log(stats.nodes / 1e6 + 'M boards evaluated');
  }
  if (board.stones == 42) {
    return 0;
  }
  let cachedValue = cache.getValue(board, alpha, beta);
  if (cachedValue != null) {
    return cachedValue;
  }

  let initialAlpha = alpha;
  let max = -1;
  let maxCol = null;
  let moveOrder = getMoveOrder(board);
  while (moveOrder > 7) {
    let col = moveOrder & 0b111;
    board.move(col, board.next);
    let v = -negamax(board, -beta, -alpha, cache, stats);
    board.remove(col);
    if (v > max) {
      max = v;
      maxCol = col;
    }
    alpha = Math.max(alpha, v);
    if (alpha >= beta) {
      break;
    }
    moveOrder = moveOrder >> 4;
  }
  cache.put(board, maxCol, max, initialAlpha, beta);
  return max;
}

const ORDER = [3, 2, 4, 1, 5, 0, 6].reduce((a, c) => (a << 4) | c);

function getMoveOrder(board, print) {
  let order = 0b111;
  let moveVals = 0;
  for (let o = ORDER; o > 0; o = o >> 4) {
    let col = o & 0b1111;
    if (!board.move(col, board.next)) {
      continue;
    }
    if (!board.hasWinMoves()) {
      order = order << 4;
      order |= col;
      moveVals = moveVals << 4;
      moveVals |= board.getPotentialCount(1 - board.next) & 0b1111;
    }
    board.remove(col);
  }
  if (order == 0b111) {
    return order;
  }
  for (let i = 0b11110000; i > 0; i = i << 4) {
    let col = order & i;
    if (col == 0b111) {
      break;
    }
    let moveVal = moveVals & i;
    let k = ~i;
    let j = i >> 4;
    while (j > 0) {
      let nextVal = (moveVals & j) << 4;
      if (nextVal >= moveVal) {
        break;
      }
      let nextCol = (order & j) << 4;
      order &= k;
      order |= nextCol;
      moveVals &= k;
      moveVals |= nextVal;
      k = k >> 4;
      j = j >> 4;
      moveVal = moveVal >> 4;
      col = col >> 4;
    }
    order &= k;
    order |= col;
    moveVals &= k;
    moveVals |= moveVal;
  }

  return order;
}


const cache = new NegamaxCache(49979687);
onmessage = function(e) {
  let bits = e.data.bits;
  let board = Board.parse(bits);
  let stats = {nodes: 0};
  console.time('negamax');
  negamax(board, -1, 1, cache, stats);
  console.timeEnd('negamax');
  console.log(`${stats.nodes} board evals`);
  console.log(`${cache.usedSize} boards cached, ${cache.collisions} collisions`);
  let bestMove = cache.getMove(board, -1, 1);
  let value = cache.getValue(board, -1, 1);
  postMessage([bits, value, bestMove]);
}