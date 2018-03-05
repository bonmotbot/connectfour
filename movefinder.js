let MoveFinder = (function() {
class MoveFinder {
  constructor(worker) {
    this.moveWorker = worker;
    this.resolve = null;
    this.reject = null;
    this.moveWorker.onmessage = (e) => {
      if (this.bits == e.data[0]) {
        this.bestMove = e.data[2];
        this.value = e.data[1];
        this.calculating = false;
        if (this.resolve) {
          this.resolve();
        }
      }
    };
    this.bestMove = null;
    this.value = 0;
    this.calculating = false;
  }

  calculate(board) {
    if (this.calculating) {
      this.reject();
    }
    if (board.value != 0) {
      this.bestMove = null;
      this.value = board.value;
      this.calculating = false;
      return Promise.resolve();
    } else if (board.hasWinMoves()) {
      this.bestMove = null;
      this.value = board.next ? -1 : 1;
      this.calculating = false;
      return Promise.resolve();
    } else if (board.stones < 8) {
      let bits = board.bits;
      let mBits = mirrorBits(bits);
      if (bits in EARLY_MAP) {
        this.bestMove = EARLY_MAP[bits][1];
        this.value = EARLY_MAP[bits][0];
      } else if (mBits in EARLY_MAP) {
        this.bestMove = 6 - EARLY_MAP[mBits][1];
        this.value = EARLY_MAP[mBits][0];
      } else {
        this.bestMove = null;
        this.value = -1;
      }
      this.calculating = false;
      return Promise.resolve();
    } else {
      this.calculating = true;
      this.bits = board.bits;
      this.moveWorker.postMessage({bits: this.bits});
      return new Promise((resolve, reject) => {
        this.resolve = resolve;
        this.reject = reject;
      });
    }
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

return MoveFinder;
})();