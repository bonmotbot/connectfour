function printBoard(b) {
  let board = boardToArray(b);
  let cols = [];
  for (let c of board) {
    let col = [];
    while (c > 1) {
      col.unshift(c % 2);
      c = c >> 1;
    }
    cols.push(col);
  }
  let x = '';
  for (let i = 5; i >= 0; i--) {
    x += '|';
    for (let j = 0; j < board.length; j++) {
      switch (cols[j][i]) {
        case undefined:
          x += '\t';
          break;
        case 0:
          x += '🔴\t';
          break;
        case 1:
          x += '🔵\t';
          break;
      }
    }
    x += '|\n';
  }
  x += '|';
  for (let j = 0; j < board.length; j++) {
    x += '--\t';
  }
  x += '|\n';
  console.log(x);
}

function boardToArray(b) {
  let a = [];
  while (b >= 1) {
    a.unshift(b & 0b1111111);
    b = b / 128;
  }
  return a;
}

function arrayToBoard(a) {
  let b = 0;
  for (c of a) {
    b = 128 * b + c;
  }
  return b;
}

function mirrorBoard(b) {
  let m = 0;
  while (b >= 1) {
    m = 128 * m + (b & 0b1111111)
    b = b / 128;
  }
  return m;
}

function countOnes(b) {
  let count = 0;
  while (b >= 1) {
    let c = b & 0b1111111;
    c = (c & 0b01010101) + ((c >> 1) & 0b01010101);
    c = (c & 0b00110011) + ((c >> 2) & 0b00110011);
    c = (c & 0b00001111) + ((c >> 4) & 0b00001111);
    count += c - 1;
    b = b / 128;
  }
}

function countMoves(b) {
  let count = 0;
  while (b >= 1) {
    let c = b & 0b1111111;
    while (c > 1) {
      count++;
      c = c >> 1;
    }
    b = b / 128;
  }
  return count;
}

function nextMoves(b, p) {
  let moves = [];
  let x = 1;
  for (let i = 6; i >= 0; i--) {
    let c = (b / x) & 0b1111111;
    if (c < 0b1000000) {
      moves.push(b + ((c << 1) + p - c) * x);
    }
    x *= 128;
  }
  return moves;
}

function hasMoves(b) {
  let count = 0;
  while (b >= 1) {
    let c = b & 0b1111111;
    if (c < 0b1000000) {
      return true;
    }
    b = b / 128;
  }
  return false;
}

function nextBoard(b, p, col) {
  let x = Math.pow(128, 6 - col);
  let c = (b / x) & 0b1111111;
  if (c < 0b1000000) {
    return b + ((c << 1) + p - c) * x;
  }
  return b;
}

function move(b, col) {
  return nextBoard(b, countMoves(b) % 2, col);
}

const o = new Uint8Array(7);
const z = new Uint8Array(7);
function evalBoard(b) {
  let i = 6;
  while (b >= 1) {
    let c = b & 0b1111111;
    switch (c) {
      case 0b11111:
      case 0b111111:
      case 0b111110:
      case 0b101111:
      case 0b1111111:
      case 0b1111110:
      case 0b1111101:
      case 0b1111100:
      case 0b1101111:
      case 0b1011111:
      case 0b1011110:
      case 0b1001111:
        return -1;
      case 0b10000:
      case 0b100000:
      case 0b100001:
      case 0b110000:
      case 0b1000000:
      case 0b1000001:
      case 0b1000010:
      case 0b1000011:
      case 0b1010000:
      case 0b1100000:
      case 0b1100001:
      case 0b1110000:
        return 1;
    }

    let d = ~c;

    while (c < 0b1000000) {
      c = c << 1;
    }
    o[i] = c & 0b111111;

    while (d > -65) {
      d = d << 1;
    }
    z[i] = d & 0b111111;

    b = b / 128;
    i--;
  }
  if (evalAcross(o)) {
    return -1;
  }
  if (evalAcross(z)) {
    return 1;
  }
  return 0;
}

function evalAcross(w) {
  for (let i = 0; i < 4; i++) {
    if ((w[i] & w[i + 1] & w[i + 2] & w[i + 3]) > 0) {
      return true;
    }
    if ((w[i] & (w[i + 1] >> 1) & (w[i + 2] >> 2) & (w[i + 3] >> 3)) > 0) {
      return true;
    }
    if (((w[i] >> 3) & (w[i + 1] >> 2) & (w[i + 2] >> 1) & w[i + 3]) > 0) {
      return true;
    }
  }
  return false;
}

function minimax(b, p, d, alpha, beta, cache) {
  if (cache.has(b)) {
    return (cache.get(b) & 0b11) - 1;
  }
  let m = mirrorBoard(b);
  if (cache.has(m)) {
     return (cache.get(m) & 0b11) - 1;
  }
  let val = evalBoard(b);
  if (val != 0) {
    return val;
  }
  if (!hasMoves(b)) {
    return 0;
  }

  let parity = p ? 1 : -1;
  let min = Infinity;
  let optMove = null;
  let opt;
  for (let i = 6; i >= 0; i--) {
    let move = nextBoard(b, p, i);
    let moveVal = evalBoard(move);
    if (moveVal != 0) {
      opt = moveVal;
      optMove = move;
      break;
    }
  }

  if (opt == undefined) {
    for (let i = 6; i >= 0; i--) {
      let opMove = nextBoard(b, 1 - p, i);
      let opMoveVal = evalBoard(opMove);
      if (opMoveVal != 0) {
        optMove = nextBoard(b, p, i);
        opt = minimax(optMove, 1 - p, d++, alpha, beta, cache);
        break;
      }
    }
  }

  if (opt == undefined) {
    let min = Infinity;
    for (let i = 0; i < 7; i++) {
      let move = nextBoard(b, p, [3,2,4,1,5,0,6][i]);
      if (move == b) {
        continue;
      }
      let moveVal = minimax(move, 1 - p, d++, alpha, beta, cache);
      let parityVal = parity * moveVal;
      if (parityVal < min) {
        optMove = move;
        min = parityVal;
      }
      if (p && moveVal <= beta) {
        beta = moveVal;
      }
      if (!p && moveVal >= alpha) {
        alpha = moveVal;
      }
      if (beta <= alpha) {
        break;
      }
      if (min == -1) {
        break;
      }
    }
    opt = min * parity;
  }

//  if (d < 30) {
    cache.set(b, optMove * 4 + opt + 1);
    if (cache.size % 50000 == 0) {
      console.log(cache.size);
    }
//  }
  return opt;
}

function getMoveMap(b) {
  let moveMap = new Map();
  minimax(b, countMoves(b) % 2, 0, -Infinity, Infinity, moveMap);
  return moveMap;
}

function getMove(b, moveMap) {
  return Math.floor(moveMap.get(b) / 4);
}

// console.time('moves');
// let b = arrayToBoard([0b1, 0b1, 0b1, 0b1, 0b1, 0b101010, 0b1010101]);
// console.log(evalBoard(b));
// let moveMap = getMoveMap(b);
// console.timeEnd('moves');

// console.log(moveMap.size);
// while (b) {
//   printBoard(b);
//   console.log(b);
//   b = getMove(b, moveMap);
// }
// for (let key of moveMap.keys()) {
//   let b = Number(key);
//   if (moveMap.has(mirrorBoard(b))) {
//     console.log('has mirrors');
//   }
// }
// (function work() {
// let remaining = [
//   arrayToBoard([0b1,0b1,0b1,0b1,0b1,0b1,0b1]),
// ];

// let boards = [];
// let visited = new Set();

// while (boards.length < 500 && remaining.length > 0) {
//   let b = remaining.pop();
//   if (evalBoard(b) != 0) {
//     boards.push(b);
//   } else {
//     let moves = nextMoves(b, countMoves(b) % 2);
//     for (move of moves) {
//       if (move && !visited.has(move)) {
//         visited.add(move);
//         remaining.push(move);
//       }
//     }
//   }
// }

// console.log(visited.size);

// boards.forEach((board) => {
//   printBoard(board);
//   console.log(board);
//   console.log(evalBoard(board));
// });
// })();

// Rendering

function setUpBoard() {
  let el = document.createElement('table');
  for (let i = 0; i < 6; i++) {
    let tr = document.createElement('tr');
    el.appendChild(tr);
    for (let j = 0; j < 7; j++) {
      let td = document.createElement('td');
      tr.appendChild(td);
      let div = document.createElement('div');
      td.appendChild(div);
      div.className = 'empty';
    }
  }
  return el;
}

function showBoard(el, b) {
  let board = boardToArray(b);
  let cols = [];
  for (let c of board) {
    let col = [];
    while (c > 1) {
      col.unshift(c % 2);
      c = c >> 1;
    }
    cols.push(col);
  }
  for (let i = 0; i < 6; i++) {
    for (let j = 0; j < 7; j++) {
      let divEl = el.rows[5 - i].cells[j].firstChild;
      switch (cols[j][i]) {
        case undefined:
          divEl.className = 'empty';
          break;
        case 0:
          divEl.className = 'yellow';
          break;
        case 1:
          divEl.className = 'red';
          break;
      }
    }
  }
}