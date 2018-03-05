function setUpGuides() {
  let el = document.createElement('table');
  el.className = 'guides';
  for (let i = 0; i < 6; i++) {
    let tr = document.createElement('tr');
    el.appendChild(tr);
    for (let j = 0; j < 7; j++) {
      let td = document.createElement('td');
      tr.appendChild(td);
      let div = document.createElement('div');
      td.appendChild(div);
    }
  }
  return el;
}

function setUpPieces() {
  let el = document.createElement('table');
  el.className = 'pieces';
  for (let i = 0; i < 6; i++) {
    let tr = document.createElement('tr');
    el.appendChild(tr);
    for (let j = 0; j < 7; j++) {
      let td = document.createElement('td');
      tr.appendChild(td);
      let div = document.createElement('div');
      td.appendChild(div);
      div.addEventListener("transitionend", (e) => {
        if (!e.target.classList.contains('above')) {
          div.classList.add('shake');
        }
      }, false);
    }
  }
  return el;
}

function setUpBoard() {
  let el = document.createElement('table');
  el.className = 'board';
  for (let i = 0; i < 6; i++) {
    let tr = document.createElement('tr');
    el.appendChild(tr);
    for (let j = 0; j < 7; j++) {
      let td = document.createElement('td');
      tr.appendChild(td);
      let div = document.createElement('div');
      td.appendChild(div);
    }
  }
  return el;
}

function showBoard(piecesEl, guidesEl, board, moveFinder) {
  let nextColor = board.next ? 'red' : 'yellow';
  for (let [r, c, yellow, red, wins, winMove] of board) {
    let pieceEl = piecesEl.rows[r].cells[c].firstChild;
    let animDuration = Math.sqrt(r+1) * 150 + 'ms';
    pieceEl.style.transitionDuration = animDuration;
    if (yellow) {
      pieceEl.className = 'yellow';
      pieceEl.style.transform = '';
    } else if (red) {
      pieceEl.className = 'red';
      pieceEl.style.transform = '';

    } else {
      let y = -r * 74 - 100;
      pieceEl.style.transform = `translateY(${y}px)`;
      pieceEl.className = 'above ' + nextColor;
    }
    if (wins) {
      pieceEl.classList.add('win');
    }

    let guideEl = guidesEl.rows[r].cells[c].firstChild;
    guideEl.className = 'empty';
    if (winMove) {
      guideEl.className = nextColor + ' winMove';
    }
    if (moveFinder.calculating) {
      guideEl.classList.add('calculating');
      guideEl.style.animationDelay = (r+c) / 13 * 500 + 100 + 'ms';
    } else if (c == moveFinder.bestMove) {
      if (moveFinder.value > 0) {
        guideEl.classList.add('winCol');
      } else if (moveFinder.value == 0) {
        guideEl.classList.add('tieCol');
      }
    }
  }
}