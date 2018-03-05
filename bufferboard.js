let Board = (function() {
class Board {
  constructor() {
    this.mask = new BitBoard();
    this.tops = new BitBoard();
    this.yellows = new BitBoard();
    this.reds = new BitBoard();
    this.stones = 0;
    this.next = 0;
  }

  get bits() {
    let b = 0;
    for (let i = 0; i < 7; i++) {
      b *= 128;
      b += this.mask.bytes[i];
    }
    return b;
  }

  get id() {
    return this.mask.view.getFloat64(0);
  }

  get hash() {
    return this.bits;
  }

  move(column, isRed) {
    let top = this.tops.bytes[column];
    if (top == 0) {
      return false;
    }
    if (isRed) {
      this.reds.bytes[column] |= top;
    } else {
      this.yellows.bytes[column] |= top;
    }
    this.tops.bytes[column] = top >> 1;
    this.mask.bytes[column] = (this.mask.bytes[column] << 1) | isRed;
    this.stones++;
    this.next = 1 - this.next;
    return true;
  }

  remove(column) {
    let top = this.tops.bytes[column];
    if (top == 32) {
      return false;
    }
    top = top << 1 || 1;
    this.reds.bytes[column] &= ~top;
    this.yellows.bytes[column] &= ~top;
    this.tops.bytes[column] = top;
    this.mask.bytes[column] = this.mask.bytes[column] >> 1;
    this.stones--;
    this.next = 1 - this.next;
    return true;
  }

  get value() {
    if (hasFour(this.yellows)) {
      return 1;
    }

    if (hasFour(this.reds)) {
      return -1;
    }

    return 0;
  }

  getWins(out) {
    getFour(this.yellows, out);
    getFour(this.reds, out);
  }

  getWinMoves(out) {
    if (this.next) {
      getPotentialFour(this.reds, this.tops, out);
    } else {
      getPotentialFour(this.yellows, this.tops, out);
    }
  }

  hasWinMoves() {
    if (this.next) {
      return hasPotentialFour(this.reds, this.tops);
    } else {
      return hasPotentialFour(this.yellows, this.tops);
    }
  }

  getPotentialCount(p) {
    return 0;
    // let p0, p1;
    // if (p) {
    //   p0 = getPotentialFour(this.r0) & ~this.y0;
    //   p1 = getPotentialFour(this.r1) & ~this.y1;
    // } else {
    //   p0 = getPotentialFour(this.y0) & ~this.r0;
    //   p1 = getPotentialFour(this.y1) & ~this.r1;
    // }

    // let w0 = p0 & 0xfff;
    // let w1 = p1 | (p0 >> 12);

    // return popCount32(w0) + popCount32(w1);
  }

  clone() {
    let c = new Board();
    c.mask.double = this.mask.double;
    c.tops.double = this.tops.double;
    c.yellows.double = this.yellows.double;
    c.reds.double = this.reds.double;
    c.stones = this.stones;
    c.next = this.next;
    return c;
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
    let wins = new BitBoard();
    this.getWins(wins);
    let winMoves = new BitBoard();
    this.getWinMoves(winMoves);

    for (let c = 0; c < 7; c++) {
      for (let r = 0; r < 6; r++) {
        let b = 1 << r;
        yield [
          r, c,
          yellows.bytes[c] & b,
          reds.bytes[c] & b,
          wins.bytes[c] & b,
          winMoves.bytes[c] & b
        ];
      }
    }
  }
}

class BitBoard {
  constructor() {
    let buffer = new ArrayBuffer(8);
    this.view = new DataView(buffer);
    this.bytes = new Uint8Array(buffer);
    // this.ints = {
    //   *[Symbol.iterator]() {
    //     for (let i = 0; i < 5; i++) {
    //       yield this[i];
    //     }
    //   }
    // };
    // for (let i = 0; i < 5; i++) {
    //   Object.defineProperty(this.ints, i, {
    //     get: () => { return view.getUint32(i); },
    //     set: (x) => { view.setUint32(i, x); },
    //   });
    // }
    let doubleArray = new Float64Array(buffer);
    Object.defineProperty(this, 'double', {
        get: () => { return doubleArray[0] },
        set: (x) => { doubleArray[0] = x; },
    });
  }

  toString() {
    let byteStrings = [];
    for (let byte of this.bytes) {
      let byteString = byte.toString(2);
      while (byteString.length < 8) {
        byteString = '0' + byteString;
      }
      byteStrings.push(byteString);
    }
    return byteStrings.join(' ');
  }
}

function popCount32(i) {
  i = i - ((i >>> 1) & 0x55555555);
  i = (i & 0x33333333) + ((i >>> 2) & 0x33333333);
  return (((i + (i >>> 4)) & 0x0F0F0F0F) * 0x01010101) >> 24;
}

function hasFour(b) {
  let s0 = b.view.getUint32(0);
  let s1 = b.view.getUint32(1);
  let s2 = b.view.getUint32(2);
  let s3 = b.view.getUint32(3);

  return (s0 & (s0 >> 1) & (s0 >> 2) & (s0 >> 3))
      || (s3 & (s3 >> 1) & (s3 >> 2) & (s3 >> 3))
      || (s0 & s1 & s2 & s3)
      || (s0 & (s1 >> 1) & (s2 >> 2) & (s3 >> 3))
      || (s0 & (s1 << 1) & (s2 << 2) & (s3 << 3));
}

function getFour(b, out) {
  let b0 = b.view.getUint32(0);
  let b1 = b.view.getUint32(1);
  let b2 = b.view.getUint32(2);
  let b3 = b.view.getUint32(3);

  let o0 = out.view.getUint32(0);
  let o1 = out.view.getUint32(1);
  let o2 = out.view.getUint32(2);
  let o3 = out.view.getUint32(3);

  m = b0 & (b0 >> 1) & (b0 >> 2) & (b0 >> 3);
  o0 |= m | (m << 1) | (m << 2) | (m << 3);

  m = b3 & (b3 >> 1) & (b3 >> 2) & (b3 >> 3);
  o3 |= m | (m << 1) | (m << 2) | (m << 3);

  m = b0 & b1 & b2 & b3;
  o0 |= m;
  o1 |= m;
  o2 |= m;
  o3 |= m;

  m = b0 & (b1 >> 1) & (b2 >> 2) & (b3 >> 3);
  o0 |= m;
  o1 |= m << 1;
  o2 |= m << 2;
  o3 |= m << 3;

  m = b0 & (b1 << 1) & (b2 << 2) & (b3 << 3);
  o0 |= m;
  o1 |= m >> 1;
  o2 |= m >> 2;
  o3 |= m >> 3;

  out.view.setUint32(0, o0);
  out.view.setUint32(1, o1);
  out.view.setUint32(2, o2);
  out.view.setUint32(3, o3);
}

function getPotentialFour(b, m, out) {
  let b0 = b.view.getUint32(0);
  let b1 = b.view.getUint32(1);
  let b2 = b.view.getUint32(2);
  let b3 = b.view.getUint32(3);

  let m0 = m.view.getUint32(0);
  let m1 = m.view.getUint32(1);
  let m2 = m.view.getUint32(2);
  let m3 = m.view.getUint32(3);

  let o0 = out.view.getUint32(0);
  let o1 = out.view.getUint32(1);
  let o2 = out.view.getUint32(2);
  let o3 = out.view.getUint32(3);

  o0 |= m0 & (b0 >> 1) & (b0 >> 2) & (b0 >> 3);
  o3 |= m3 & (b3 >> 1) & (b3 >> 2) & (b3 >> 3);

  o0 |= m0 & b1 & b2 & b3;
  o1 |= b0 & m1 & b2 & b3;
  o2 |= b0 & b1 & m2 & b3;
  o3 |= b0 & b1 & b2 & m3;

  o0 |= m0 & (b1 >> 1) & (b2 >> 2) & (b3 >> 3);
  o1 |= (b0 << 1) & m1 & (b2 >> 1) & (b3 >> 2);
  o2 |= (b0 << 2) & (b1 << 1) & m2 & (b3 >> 1);
  o3 |= (b0 << 3) & (b1 << 2) & (b2 << 1) & m3;

  o0 |= m0 & (b1 << 1) & (b2 << 2) & (b3 << 3);
  o1 |= (b0 >> 1) & m1 & (b2 << 1) & (b3 << 2);
  o2 |= (b0 >> 2) & (b1 >> 1) & m2 & (b3 << 1);
  o3 |= (b0 >> 3) & (b1 >> 2) & (b2 >> 1) & m3;

  out.view.setUint32(0, o0);
  out.view.setUint32(1, o1);
  out.view.setUint32(2, o2);
  out.view.setUint32(3, o3);
}

function hasPotentialFour(b, m) {
  let b0 = b.view.getUint32(0);
  let b1 = b.view.getUint32(1);
  let b2 = b.view.getUint32(2);
  let b3 = b.view.getUint32(3);

  let m0 = m.view.getUint32(0);
  let m1 = m.view.getUint32(1);
  let m2 = m.view.getUint32(2);
  let m3 = m.view.getUint32(3);

  return (m0 & (b0 >> 1) & (b0 >> 2) & (b0 >> 3))
      || (m3 & (b3 >> 1) & (b3 >> 2) & (b3 >> 3))

      || (m0 & b1 & b2 & b3)
      || (b0 & m1 & b2 & b3)
      || (b0 & b1 & m2 & b3)
      || (b0 & b1 & b2 & m3)

      || (m0 & (b1 >> 1) & (b2 >> 2) & (b3 >> 3))
      || ((b0 << 1) & m1 & (b2 >> 1) & (b3 >> 2))
      || ((b0 << 2) & (b1 << 1) & m2 & (b3 >> 1))
      || ((b0 << 3) & (b1 << 2) & (b2 << 1) & m3)

      || (m0 & (b1 << 1) & (b2 << 2) & (b3 << 3))
      || ((b0 >> 1) & m1 & (b2 << 1) & (b3 << 2))
      || ((b0 >> 2) & (b1 >> 1) & m2 & (b3 << 1))
      || ((b0 >> 3) & (b1 >> 2) & (b2 >> 1) & m3);
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
  let b = new Board();
  for (let i = 6; i >= 0; i--) {
    let c = bits & 127;
    let d = ~c;
    let next = nextRow(c);
    let s = next + 1;
    b.stones += (6 - s);

    b.tops.bytes[i] = 1 << next;
    b.mask.bytes[i] = c;

    d = d << s;
    b.yellows.bytes[i] = d & 63;

    c = c << s;
    b.reds.bytes[i] = c & 63;

    bits = bits / 128;
  }
  b.next = b.stones & 1;
  return b;
}

Board.empty = function() {
  let b = new Board();
  for (let i = 0; i < 7; i++) {
    b.mask.bytes[i] = 1;
    b.tops.bytes[i] = 32;
  }
  return b;
}

return Board;
})();