// App Controller — 万船齐发 Chess
// Touch/mouse handling, game state, promotion dialog, UI sync

class NavalChessApp {
  constructor() {
    this.engine   = new ChessEngine();
    this.renderer = null;
    this.selected  = null;
    this.legalMoves = [];
    this.promoPending = null;

    this.init();
  }

  init() {
    const canvas = document.getElementById('chess-board');
    if (!canvas) return;

    this.renderer = new WoodblockRenderer(canvas, this.engine);
    this.bindEvents(canvas);
    this.updateUI();

    window.addEventListener('resize', () => this.renderer.initCanvas());
    window.addEventListener('orientationchange', () =>
      setTimeout(() => this.renderer.initCanvas(), 280));
  }

  bindEvents(canvas) {
    canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.handleTap(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: false });

    canvas.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });

    canvas.addEventListener('click', (e) =>
      this.handleTap(e.clientX, e.clientY));

    document.getElementById('btn-new-game')?.addEventListener('click', () => this.newGame());
    document.getElementById('btn-flip')?.addEventListener('click',     () => this.flipBoard());
    document.getElementById('btn-undo')?.addEventListener('click',     () => this.undoMove());

    document.querySelectorAll('.promo-option').forEach(el => {
      el.addEventListener('click', (e) => {
        const type = e.currentTarget.dataset.piece;
        if (this.promoPending && type) this.finishPromotion(type);
      });
    });
  }

  handleTap(clientX, clientY) {
    if (this.engine.gameOver || this.promoPending) return;

    const canvas = this.renderer.canvas;
    const rect   = canvas.getBoundingClientRect();
    const scale  = canvas.width / (rect.width * (window.devicePixelRatio || 1));
    const px = (clientX - rect.left) * scale;
    const py = (clientY - rect.top)  * scale;

    const sq = this.renderer.getSquareFromPixel(px, py);
    if (!sq) { this.clearSelection(); return; }

    this.handleSquare(sq.row, sq.col);
  }

  handleSquare(row, col) {
    if (this.selected) {
      const move = this.legalMoves.find(m => m.toRow === row && m.toCol === col);
      if (move) {
        if (move.promotion) {
          this.promoPending = move;
          this.showPromoDialog(move);
        } else {
          this.executeMove(move);
        }
      } else {
        const p = this.engine.board[row][col];
        if (p && p.color === this.engine.currentTurn) this.selectPiece(row, col);
        else this.clearSelection();
      }
    } else {
      const p = this.engine.board[row][col];
      if (p && p.color === this.engine.currentTurn) this.selectPiece(row, col);
    }
  }

  selectPiece(row, col) {
    this.selected   = { row, col };
    this.legalMoves = this.engine.getLegalMoves(row, col);
    this.renderer.setSelected(row, col);
    this.renderer.setLegalMoves(this.legalMoves);
    this.showMoveHints();
  }

  clearSelection() {
    this.selected   = null;
    this.legalMoves = [];
    this.renderer.setSelected(null, null);
    this.renderer.setLegalMoves([]);
    document.getElementById('move-hints').innerHTML = '';
  }

  executeMove(move) {
    this.engine.makeMove(move);
    this.renderer.setLastMove(move);
    this.clearSelection();
    this.updateUI();
    if (this.engine.gameOver) this.onGameOver();
  }

  showPromoDialog(move) {
    const dlg = document.getElementById('promotion-dialog');
    if (!dlg) return;
    dlg.classList.add('active');

    const canvas = this.renderer.canvas;
    const rect = canvas.getBoundingClientRect();
    const ss = this.renderer.squareSize;
    const bx = this.renderer.boardOffsetX;
    const by = this.renderer.boardOffsetY;
    const scale = rect.width / this.renderer.displaySize;

    const x = rect.left + (bx + move.toCol * ss) * scale;
    const y = rect.top  + (by + move.toRow * ss) * scale;

    dlg.style.left = Math.min(x, window.innerWidth - 210) + 'px';
    dlg.style.top  = Math.max(y - 170, 8) + 'px';
  }

  finishPromotion(type) {
    if (!this.promoPending) return;
    this.promoPending.promoteTo = type;
    this.executeMove(this.promoPending);
    this.promoPending = null;
    document.getElementById('promotion-dialog')?.classList.remove('active');
  }

  updateUI() {
    const turn = document.getElementById('turn-indicator');
    if (turn) {
      const w = this.engine.currentTurn === 'white';
      turn.textContent = w ? '白方行棋' : '黑方行棋';
      turn.className = 'turn ' + this.engine.currentTurn;
    }

    const cw = document.getElementById('check-warning');
    if (cw) cw.style.display = this.engine.inCheck ? 'block' : 'none';

    const st = document.getElementById('game-status');
    if (st) {
      if (this.engine.gameOver) {
        st.textContent = this.engine.checkmateInfo || '对局结束';
        st.className = 'status over';
      } else {
        st.textContent = this.engine.inCheck ? '将军！' : '';
        st.className = 'status';
      }
    }

    this.syncHistory();
    this.syncCaptures();
  }

  syncHistory() {
    const el = document.getElementById('move-history');
    if (!el) return;
    const moves = this.engine.moveHistory;
    let html = '';
    for (let i = 0; i < moves.length; i++) {
      if (i % 2 === 0) html += `<span class="move-num">${Math.floor(i/2)+1}.</span> `;
      html += `<span class="move-entry">${this.engine.getMoveNotation(moves[i])}</span> `;
    }
    el.innerHTML = html;
    el.scrollTop = el.scrollHeight;
  }

  syncCaptures() {
    const names = { king:'旗', queen:'战', rook:'炮', bishop:'巡', knight:'快', pawn:'艇' };
    const wc = document.getElementById('white-captures');
    const bc = document.getElementById('black-captures');
    if (wc) wc.innerHTML = this.engine.capturedPieces.white
      .map(p => `<span class="captured-piece black">${names[p.type]}</span>`).join('');
    if (bc) bc.innerHTML = this.engine.capturedPieces.black
      .map(p => `<span class="captured-piece white">${names[p.type]}</span>`).join('');
  }

  showMoveHints() {
    const el = document.getElementById('move-hints');
    if (!el) return;
    if (this.legalMoves.length === 0) {
      el.innerHTML = '<span class="hint-empty">此子困于原地</span>';
      return;
    }
    const caps = this.legalMoves.filter(m =>
      this.engine.board[m.toRow][m.toCol] || m.enPassant).length;
    const movs = this.legalMoves.length - caps;
    let h = '';
    if (caps) h += `<span class="hint-capture">⚔ 可吃 ${caps} 子</span> `;
    h += `<span class="hint-move">✦ 可走 ${movs} 步</span>`;
    el.innerHTML = h;
  }

  newGame() {
    this.engine.reset();
    this.clearSelection();
    this.renderer.setLastMove(null);
    this.promoPending = null;
    document.getElementById('promotion-dialog')?.classList.remove('active');
    this.updateUI();
  }

  flipBoard() {
    this.renderer.flipped = !this.renderer.flipped;
  }

  undoMove() {
    this.newGame();
  }

  onGameOver() {}
}

document.addEventListener('DOMContentLoaded', () => {
  window.navalChess = new NavalChessApp();
});