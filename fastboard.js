let Board = (function() {
BITS_SHIFT = [
  Math.pow(128, 6),
  Math.pow(128, 5),
  Math.pow(128, 4),
  Math.pow(128, 3),
  Math.pow(128, 2),
  Math.pow(128, 1),
  Math.pow(128, 0),
];

class Board {
  constructor(bits, y0, y1, r0, r1, t0, t1, stones) {
    this.bits = bits;
    this.y0 = y0 | 0;
    this.y1 = y1 | 0;
    this.r0 = r0 | 0;
    this.r1 = r1 | 0;
    this.t0 = t0 | 0;
    this.t1 = t1 | 0;
    this.stones = stones;
    this.next = stones % 2;
  }

  move(column, isRed) {
    let shift = BITS_SHIFT[column];
    let col = (this.bits / shift) & 127;
    if (col > 63) {
      return false;
    }
    let newCol = col << 1 | isRed;
    this.bits += (newCol - col) * shift;

    let s = 6 * column;
    let a0 = s > 24 ? 0 : (63 << s);
    let a1 = s < 12 ? 0 : (63 << (s - 12));
    let m0 = a0 & this.t0;
    let m1 = a1 & this.t1;
    this.t0 = (this.t0 & ~m0) | ((m0 >> 1) & a0);
    this.t1 = (this.t1 & ~m1) | ((m1 >> 1) & a1);

    if (isRed) {
      this.r0 |= m0;
      this.r1 |= m1;
    } else {
      this.y0 |= m0;
      this.y1 |= m1;
    }

    this.stones++;
    this.next = 1 - this.next;
    return true;
  }

  remove(column) {
    let shift = BITS_SHIFT[column];
    let col = (this.bits / shift) & 127;
    if (col == 1) {
      return false;
    }
    let isRed = col & 1;
    let newCol = col >> 1;
    this.bits += (newCol - col) * shift;

    let s = 6 * column;
    let m0 = s > 24 ? 0 : (63 << s) & this.t0;
    let m1 = s < 12 ? 0 : (63 << (s - 12)) & this.t1;
    let n0 = (m0 << 1) || (s > 24 ? 0 : (1 << s));
    let n1 = (m1 << 1) || (s < 12 ? 0 : (1 << (s - 12)));

    this.t0 = (this.t0 & ~m0) | n0;
    this.t1 = (this.t1 & ~m1) | n1;
    if (isRed) {
      this.r0 &= ~n0;
      this.r1 &= ~n1;
    } else {
      this.y0 &= ~n0;
      this.y1 &= ~n1;
    }
    this.stones--;
    this.next = 1 - this.next;
    return true;
  }

  get yellows() {
    return (this.y0 & 0xfff) + (this.y1 * 0x1000);
  }

  get reds() {
    return (this.r0 & 0xfff) + (this.r1 * 0x1000);
  }

  get value() {
    if (hasFour(this.y0) || hasFour(this.y1)) {
      return 1;
    }

    if (hasFour(this.r0) || hasFour(this.r1)) {
      return -1;
    }

    return 0;
  }

  get wins() {
    let m0 = getFour(this.y0) | getFour(this.r0);
    let m1 = getFour(this.y1) | getFour(this.r1);

    let w0 = m0 & 0xfff;
    let w1 = m1 | (m0 >> 12);

    return w0 + w1 * 0x1000;
  }

  get winMoves() {
    let p0, p1;
    if (this.next) {
      p0 = getPotentialFour(this.r0) & this.t0;
      p1 = getPotentialFour(this.r1) & this.t1;
    } else {
      p0 = getPotentialFour(this.y0) & this.t0;
      p1 = getPotentialFour(this.y1) & this.t1;
    }

    let w0 = p0 & 0xfff;
    let w1 = p1 | (p0 >> 12);
    return w0 + w1 * 0x1000;
  }

  hasWinMoves() {
    if (this.next) {
      return (getPotentialFour(this.r0) & this.t0) || (getPotentialFour(this.r1) & this.t1);
    } else {
      return (getPotentialFour(this.y0) & this.t0) || (getPotentialFour(this.y1) & this.t1);
    }
  }

  getPotentialCount(p) {
    let p0, p1;
    if (p) {
      p0 = getPotentialFour(this.r0) & ~this.y0;
      p1 = getPotentialFour(this.r1) & ~this.y1;
    } else {
      p0 = getPotentialFour(this.y0) & ~this.r0;
      p1 = getPotentialFour(this.y1) & ~this.r1;
    }

    let w0 = p0 & 0xfff;
    let w1 = p1 | (p0 >> 12);

    return popCount32(w0) + popCount32(w1);
  }

  clone() {
    return new Board(this.bits, this.y0, this.y1, this.r0, this.r1, this.t0, this.t1, this.stones);
  }

  toString() {
    var g = [];
    for (let [r,c,y,b] of this) {
      g[r] = g[r] || [];
      g[r][c] = y ? 'o' : b ? '*' : ' ';
    }
    return g.map(row => row.join('')).join('\n');
  }

  *[Symbol.iterator]() {
    let reds = this.reds;
    let yellows = this.yellows;
    let wins = this.wins;
    let winMoves = this.winMoves;
    for (let c = 0; c < 7; c++) {
      for (let r = 0; r < 6; r++) {
        let b = 1 << r;
        yield [r, c, yellows & b, reds & b, wins & b, winMoves & b];
      }
      reds /= 64;
      yellows /= 64;
      wins /= 64;
      winMoves /= 64;
    }
  }
}

function popCount32(i) {
  i = i - ((i >>> 1) & 0x55555555);
  i = (i & 0x33333333) + ((i >>> 2) & 0x33333333);
  return (((i + (i >>> 4)) & 0x0F0F0F0F) * 0x01010101) >> 24;
}

function hasFour(s) {
  if ((s & (s >> 1) & (s >> 2) & (s >> 3) & 0b000111000111000111000111000111) != 0) {
    return true;
  }
  if ((s & (s >> 6) & (s >> 12) & (s >> 18)) != 0) {
    return true;
  }
  if ((s & (s >> 7) & (s >> 14) & (s >> 21) & 0b000111000111000111000111000111) != 0) {
    return true;
  }
  if ((s & (s >> 5) & (s >> 10) & (s >> 15) & 0b111000111000111000111000111000) != 0) {
    return true;
  }
}

function getFour(s) {
  let m = s & (s >> 1) & (s >> 2) & (s >> 3) & 0b000111000111000111000111000111;
  let f = m | (m << 1) | (m << 2) | (m << 3);

  m = s & (s >> 6) & (s >> 12) & (s >> 18);
  f |= m | (m << 6) | (m << 12) | (m << 18);

  m = s & (s >> 7) & (s >> 14) & (s >> 21) & 0b000111000111000111000111000111;
  f |= m | (m << 7) | (m << 14) | (m << 21);

  m = s & (s >> 5) & (s >> 10) & (s >> 15) & 0b111000111000111000111000111000;
  f |= m | (m << 5) | (m << 10) | (m << 15);
  return f;
}

function getPotentialFour(s) {
  let f = (s >> 1) & (s >> 2) & (s >> 3) & 0b000111000111000111000111000111;

  f |= (s >> 6) & (s >> 12) & (s >> 18);
  f |= (s >> 6) & (s >> 12) & (s << 6);
  f |= (s << 6) & (s << 12) & (s >> 6);
  f |= (s << 6) & (s << 12) & (s << 18);
  f &= 0b111111111111111111111111111111;

  f |= (s >> 7) & (s >> 14) & (s >> 21) & 0b000111000111000111000111000111;
  f |= (s >> 7) & (s >> 14) & (s << 7)  & 0b001110001110001110001110001110;
  f |= (s << 7) & (s << 14) & (s >> 7)  & 0b011100011100011100011100011100;
  f |= (s << 7) & (s << 14) & (s << 21) & 0b111000111000111000111000111000;

  f |= (s >> 5) & (s >> 10) & (s >> 15) & 0b111000111000111000111000111000;
  f |= (s >> 5) & (s >> 10) & (s << 5)  & 0b011100011100011100011100011100;
  f |= (s << 5) & (s << 10) & (s >> 5)  & 0b001110001110001110001110001110;
  f |= (s << 5) & (s << 10) & (s << 15) & 0b000111000111000111000111000111;

  return f;
}

function nextRow(col) {
  let row = 5;
  while (col > 1) {
    col = col >> 1;
    row--;
  }
  return row;
}

Board.parse = function(bits) {
  let yellows = 0;
  let reds = 0;
  let tops = 0;
  let stones = 0;
  let b = bits;
  for (let i = 0; i < 7; i++) {
    let c = b & 127;
    let d = ~c;
    let s = nextRow(c) + 1;
    stones += (6 - s);

    d = d << s;
    yellows *= 64;
    yellows += d & 63;

    c = c << s;
    reds *= 64;
    reds += c & 63;

    t = (1 << s) >> 1;
    tops *= 64;
    tops += t;

    b = b / 128
  }
  let y0 = yellows & 0x3fffffff;
  let y1 = (yellows / 0x1000) & 0x3fffffff;
  let r0 = reds & 0x3fffffff;
  let r1 = (reds / 0x1000) & 0x3fffffff;
  let t0 = tops & 0x3fffffff;
  let t1 = (tops / 0x1000) & 0x3fffffff;
  return new Board(bits, y0, y1, r0, r1, t0, t1, stones);
}

Board.empty = function() {
  return Board.parse(4432676798593);
}

return Board;
})();