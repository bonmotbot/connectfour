let board = Board.empty();
let moveFinder = new MoveFinder(board);
let allBoards = {};
let mirrorCount = 0;
let todoCount = 0;
let lossCount = 0;
function check(board, depth) {
  let bits = board.bits;
  let mBits = mirrorBits(bits);
  if (allBoards[bits] || allBoards[mBits] || board.hasWinMoves()) {
    return;
  }
  allBoards[board.bits] = true;
  if (bits != mBits && EARLY_MAP[bits] && EARLY_MAP[mBits]) {
    if (EARLY_MAP[bits][0] != EARLY_MAP[mBits][0]) {
      throw Error('inconsistent values');
    }
    mirrorCount++;
  }
  if (!EARLY_MAP[bits] && !EARLY_MAP[mBits]) {
    todoCount++;
    // console.log(board.toString());
    // console.log(board.bits);
    // moveFinder.calculate();
  } else {
    let move = EARLY_MAP[bits] || EARLY_MAP[mBits];
    if (move[0] == -1) {
      lossCount++;
    }
  }
  for (var i = 0; i < 7; i++) {
    if (!board.move(i, board.next)) {
      continue;
    }
    if (depth > 0) {
      check(board, depth - 1);
    }
    board.remove(i);
  }
}
function mirrorBits(b) {
  let m = 0;
  while (b >= 1) {
    m = 128 * m + (b & 0b1111111)
    b = b / 128;
  }
  return m;
}

function toJson(map) {
  let s = '{\n';
  for (key in map) {
    s += '  ' + key + ':' + JSON.stringify(map[key]) + ',\n';
  }
  s += '}';
  return s;
}
check(board, 7);
console.log(Object.keys(allBoards).length);
console.log(Object.keys(EARLY_MAP).length);
console.log(`${todoCount} todos`);
console.log(`${mirrorCount} mirrors`);
console.log(`${lossCount} losses`);