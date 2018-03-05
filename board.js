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

COLOR_SHIFT = [
  Math.pow(64, 0),
  Math.pow(64, 1),
  Math.pow(64, 2),
  Math.pow(64, 3),
  Math.pow(64, 4),
  Math.pow(64, 5),
  Math.pow(64, 6),
]

class Board {
  constructor(bits, yellows, reds, stones) {
    // TODO: ByteArray for bits
    this.bits = bits;
    this.yellows = yellows;
    this.reds = reds;
    this.stones = stones;
    this.next = stones % 2;
  }

  move(column, isRed) {
    let shift = BITS_SHIFT[column];
    let col = (this.bits / shift) & 127;
    if (col > 63) {
      return false;
    }
    let row = 1 << nextRow(col);
    let newCol = col << 1 | isRed;
    if (isRed) {
      this.reds += row * COLOR_SHIFT[column];
    } else {
      this.yellows += row * COLOR_SHIFT[column];
    }
    this.bits += (newCol - col) * shift;
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
    let row = 1 << nextRow(newCol);
    if (isRed) {
      this.reds -= row * COLOR_SHIFT[column];
    } else {
      this.yellows -= row * COLOR_SHIFT[column];
    }
    this.bits += (newCol - col) * shift;
    this.stones--;
    this.next = 1 - this.next;
    return true;
  }

  get id() {
    return this.bits;
  }

  get hash() {
    return this.bits;
  }

  get value() {
    let y0 = this.yellows & 0x3fffffff;
    let y1 = (this.yellows / 0x1000) & 0x3fffffff;
    let r0 = this.reds & 0x3fffffff;
    let r1 = (this.reds / 0x1000) & 0x3fffffff;

    if (hasFour(y0) || hasFour(y1)) {
      return 1;
    }

    if (hasFour(r0) || hasFour(r1)) {
      return -1;
    }

    return 0;
  }

  get wins() {
    let y0 = this.yellows & 0x3fffffff;
    let y1 = (this.yellows / 0x1000) & 0x3fffffff;
    let r0 = this.reds & 0x3fffffff;
    let r1 = (this.reds / 0x1000) & 0x3fffffff;

    let m0 = getFour(y0) | getFour(r0);
    let m1 = getFour(y1) | getFour(r1);

    let w0 = m0 & 0xfff;
    let w1 = m1 | (m0 >> 12);

    return w0 + w1 * 0x1000;
  }

  get winMoves() {
    let next = nextRows(this.bits);
    let n0 = next & 0x3fffffff;
    let n1 = (next / 0x1000) & 0x3fffffff;
    let p0, p1;
    if (this.next) {
      let r0 = this.reds & 0x3fffffff;
      let r1 = (this.reds / 0x1000) & 0x3fffffff;

      p0 = getPotentialFour(r0) & n0;
      p1 = getPotentialFour(r1) & n1;
    } else {
      let y0 = this.yellows & 0x3fffffff;
      let y1 = (this.yellows / 0x1000) & 0x3fffffff;

      p0 = getPotentialFour(y0) & n0;
      p1 = getPotentialFour(y1) & n1;
    }

    let w0 = p0 & 0xfff;
    let w1 = p1 | (p0 >> 12);
    return w0 + w1 * 0x1000;
  }

  hasWinMoves() {
    let next = nextRows(this.bits);
    let n0 = next & 0x3fffffff;
    let n1 = (next / 0x1000) & 0x3fffffff;
    let p0, p1;
    if (this.next) {
      let r0 = this.reds & 0x3fffffff;
      let r1 = (this.reds / 0x1000) & 0x3fffffff;

      p0 = getPotentialFour(r0) & n0;
      p1 = getPotentialFour(r1) & n1;
    } else {
      let y0 = this.yellows & 0x3fffffff;
      let y1 = (this.yellows / 0x1000) & 0x3fffffff;

      p0 = getPotentialFour(y0) & n0;
      p1 = getPotentialFour(y1) & n1;
    }
    return p0 || p1;
  }

  getPotentialCount(p) {
    let r0 = this.reds & 0x3fffffff;
    let r1 = (this.reds / 0x1000) & 0x3fffffff;
    let y0 = this.yellows & 0x3fffffff;
    let y1 = (this.yellows / 0x1000) & 0x3fffffff;
    let p0, p1;
    if (p) {
      p0 = getPotentialFour(r0) & ~y0;
      p1 = getPotentialFour(r1) & ~y1;
    } else {
      p0 = getPotentialFour(y0) & ~r0;
      p1 = getPotentialFour(y1) & ~r1;
    }

    let w0 = p0 & 0xfff;
    let w1 = p1 | (p0 >> 12);

    return popCount32(w0) + popCount32(w1);
  }

  clone() {
    return new Board(this.bits, this.yellows, this.reds, this.stones);
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

function nextRows(bits) {
  let b = bits;
  let next = 0;
  for (let i = 0; i < 7; i++) {
    let c = b & 127;
    next *= 64;
    let n = nextRow(c);
    if (n >= 0) {
      next += 1 << n;
    }
    b = b / 128
  }
  return next;
}

Board.parse = function(bits) {
  let yellows = 0;
  let reds = 0;
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

    b = b / 128
  }
  return new Board(bits, yellows, reds, stones);
}

function splitBinary(bits, n) {
  return bits.toString(2).split('').reverse().join('').match(new RegExp(`.{1,${n}}`, 'g')).join(' ').split('').reverse().join('');
}

Board.empty = function() {
  return new Board(4432676798593, 0, 0, 0);
}

return Board;
})();