// Renderer - Canvas woodblock print (版画) style renderer
// 万船齐发 aesthetic: handmade paper, ink brush, seal stamps, wave motifs

class WoodblockRenderer {
  constructor(canvas, engine) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.engine = engine;
    this.squareSize = 0;
    this.boardOffsetX = 0;
    this.boardOffsetY = 0;
    this.boardSize = 0;
    this.displaySize = 0;
    this.selectedSquare = null;
    this.legalMoves = [];
    this.lastMove = null;
    this.flipped = false;
    this.waveOffset = 0;
    this.animFrame = null;

    // 版画色盘 — woodblock print palette
    this.colors = {
      paper:      '#F5EDDC',
      paperDark:  '#E8DCC8',
      paperDeep:  '#D8CCB4',
      ink:        '#1A1A1A',
      inkMid:     '#3A3A3A',
      inkLight:   '#6A6A6A',
      cinnabar:   '#C41E3A',
      cinnabarDim:'#8B1528',
      indigo:     '#1B3A5C',
      wave:       '#2C5F7C',
      gold:       '#8B7355',
      whitePiece: '#FBF7EE',
    };

    this.initCanvas();
    this.startLoop();
  }

  initCanvas() {
    const dpr = window.devicePixelRatio || 1;
    const parent = this.canvas.parentElement;
    const w = parent.clientWidth - 16;
    const h = parent.clientHeight - 16;
    const size = Math.min(w, h, 520);

    this.canvas.width  = size * dpr;
    this.canvas.height = size * dpr;
    this.canvas.style.width  = size + 'px';
    this.canvas.style.height = size + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    this.displaySize = size;
    const margin = size * 0.068;
    this.boardSize   = size - margin * 2;
    this.squareSize  = this.boardSize / 8;
    this.boardOffsetX = margin;
    this.boardOffsetY = margin;
  }

  startLoop() {
    const tick = (ts) => {
      this.waveOffset = (ts / 2800) % (Math.PI * 2);
      this.render();
      this.animFrame = requestAnimationFrame(tick);
    };
    this.animFrame = requestAnimationFrame(tick);
  }

  stopLoop() {
    if (this.animFrame) cancelAnimationFrame(this.animFrame);
  }

  // ── render pipeline ──────────────────────────────────────────
  render() {
    const ctx = this.ctx;
    const S = this.displaySize;
    ctx.clearRect(0, 0, S, S);

    this.drawPaperBG(S);
    this.drawDecoBorder();
    this.drawBoardSquares();
    this.drawCoordinates();
    this.drawHighlights();
    this.drawPieces();
    this.drawCheckFlash();
    this.drawCornerSeal();
    if (this.engine.gameOver) this.drawOverlay();
  }

  // ── paper background ─────────────────────────────────────────
  drawPaperBG(S) {
    const ctx = this.ctx;
    ctx.fillStyle = this.colors.paper;
    ctx.fillRect(0, 0, S, S);

    const g = ctx.createRadialGradient(S/2, S/2, S*0.28, S/2, S/2, S*0.72);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,0.07)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, S, S);

    ctx.save();
    ctx.globalAlpha = 0.025;
    for (let i = 0; i < 180; i++) {
      ctx.fillStyle = Math.random() > 0.5 ? '#000' : this.colors.gold;
      ctx.beginPath();
      ctx.arc(Math.random() * S, Math.random() * S, Math.random() * 1.4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // ── decorative border ────────────────────────────────────────
  drawDecoBorder() {
    const ctx = this.ctx;
    const bx = this.boardOffsetX, by = this.boardOffsetY, bs = this.boardSize;
    const pad = 13;
    const ox = bx - pad, oy = by - pad, ow = bs + pad * 2;

    ctx.save();
    ctx.strokeStyle = this.colors.ink;
    ctx.lineWidth = 3;
    ctx.globalAlpha = 0.85;
    ctx.strokeRect(ox, oy, ow, ow);

    ctx.lineWidth = 1.2;
    ctx.globalAlpha = 0.4;
    ctx.strokeRect(ox + 6, oy + 6, ow - 12, ow - 12);

    this.waveCorner(ox, oy, 18,  1,  1);
    this.waveCorner(ox + ow, oy, 18, -1,  1);
    this.waveCorner(ox, oy + ow, 18,  1, -1);
    this.waveCorner(ox + ow, oy + ow, 18, -1, -1);
    ctx.restore();
  }

  waveCorner(cx, cy, len, dx, dy) {
    const ctx = this.ctx;
    ctx.save();
    ctx.strokeStyle = this.colors.wave;
    ctx.lineWidth = 1.2;
    ctx.globalAlpha = 0.55;
    ctx.beginPath();
    for (let i = 0; i <= len; i += 2) {
      const px = cx + i * dx;
      const py = cy + i * dy;
      const w = Math.sin(i / 5 + this.waveOffset) * 2.5;
      const wx = px + (dy === 0 ? 0 : w * dy);
      const wy = py + (dx === 0 ? 0 : w * dx);
      i === 0 ? ctx.moveTo(wx, wy) : ctx.lineTo(wx, wy);
    }
    ctx.stroke();
    ctx.restore();
  }

  // ── board squares ────────────────────────────────────────────
  drawBoardSquares() {
    const ctx = this.ctx;
    const ss = this.squareSize;
    const bx = this.boardOffsetX, by = this.boardOffsetY;

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const x = bx + c * ss, y = by + r * ss;
        const dark = (r + c) % 2 === 1;

        ctx.fillStyle = dark ? this.colors.paperDark : this.colors.paper;
        ctx.fillRect(x, y, ss, ss);

        ctx.strokeStyle = this.colors.ink;
        ctx.lineWidth = 0.6;
        ctx.globalAlpha = 0.22;
        ctx.strokeRect(x + 0.5, y + 0.5, ss - 1, ss - 1);
        ctx.globalAlpha = 1;

        if (dark) this.waveInsideSquare(x, y, ss);
      }
    }

    ctx.strokeStyle = this.colors.ink;
    ctx.lineWidth = 2.8;
    ctx.globalAlpha = 0.9;
    ctx.strokeRect(bx, by, this.boardSize, this.boardSize);
    ctx.globalAlpha = 1;
  }

  waveInsideSquare(x, y, ss) {
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = 0.05;
    ctx.strokeStyle = this.colors.wave;
    ctx.lineWidth = 0.8;
    for (let w = 0; w < 2; w++) {
      ctx.beginPath();
      for (let i = 0; i <= ss; i += 4) {
        const px = x + i;
        const py = y + ss/2 + Math.sin(i / 9 + w + this.waveOffset) * ss * 0.12;
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  // ── coordinates ──────────────────────────────────────────────
  drawCoordinates() {
    const ctx = this.ctx;
    const ss = this.squareSize;
    const bx = this.boardOffsetX, by = this.boardOffsetY, bs = this.boardSize;
    const font = `${Math.max(ss * 0.2, 9)}px "KaiTi","STKaiti","Kaiti SC",serif`;

    ctx.font = font;
    ctx.fillStyle = this.colors.ink;
    ctx.globalAlpha = 0.45;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const files = ['a','b','c','d','e','f','g','h'];
    for (let c = 0; c < 8; c++) {
      const x = bx + c * ss + ss/2;
      ctx.fillText(files[c], x, by + bs + ss * 0.32);
      ctx.fillText(files[c], x, by - ss * 0.32);
    }
    for (let r = 0; r < 8; r++) {
      const y = by + r * ss + ss/2;
      ctx.fillText(String(8 - r), bx - ss * 0.32, y);
      ctx.fillText(String(8 - r), bx + bs + ss * 0.32, y);
    }
    ctx.globalAlpha = 1;
  }

  // ── highlights (selected + legal moves) ──────────────────────
  drawHighlights() {
    const ctx = this.ctx;
    const ss = this.squareSize;
    const bx = this.boardOffsetX, by = this.boardOffsetY;

    if (this.selectedSquare) {
      const { row, col } = this.selectedSquare;
      ctx.fillStyle = 'rgba(196, 30, 58, 0.22)';
      ctx.fillRect(bx + col * ss, by + row * ss, ss, ss);
      ctx.strokeStyle = this.colors.cinnabar;
      ctx.lineWidth = 2.2;
      ctx.strokeRect(bx + col * ss + 1, by + row * ss + 1, ss - 2, ss - 2);
    }

    for (const m of this.legalMoves) {
      const cx = bx + m.toCol * ss + ss/2;
      const cy = by + m.toRow * ss + ss/2;
      const target = this.engine.board[m.toRow][m.toCol];

      if (target || m.enPassant) {
        ctx.beginPath();
        ctx.arc(cx, cy, ss * 0.36, 0, Math.PI * 2);
        ctx.strokeStyle = this.colors.cinnabar;
        ctx.lineWidth = 2.2;
        ctx.setLineDash([4, 3]);
        ctx.stroke();
        ctx.setLineDash([]);
      } else {
        ctx.beginPath();
        ctx.arc(cx, cy, ss * 0.12, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(26,26,26,0.22)';
        ctx.fill();
      }
    }

    if (this.lastMove) {
      for (const s of [{r:this.lastMove.fromRow,c:this.lastMove.fromCol},
                       {r:this.lastMove.toRow,c:this.lastMove.toCol}]) {
        ctx.fillStyle = 'rgba(139,115,85,0.20)';
        ctx.fillRect(bx + s.c * ss, by + s.r * ss, ss, ss);
      }
    }
  }

  // ── pieces ───────────────────────────────────────────────────
  drawPieces() {
    const ctx = this.ctx;
    const ss = this.squareSize;
    const bx = this.boardOffsetX, by = this.boardOffsetY;
    const chars = { king:'旗', queen:'战', rook:'炮', bishop:'巡', knight:'快', pawn:'艇' };

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = this.engine.board[r][c];
        if (!p) continue;
        const x = bx + c * ss + ss/2;
        const y = by + r * ss + ss/2;
        this.drawSeal(x, y, ss * 0.39, p, chars[p.type]);
      }
    }
  }

  drawSeal(x, y, R, piece, char) {
    const ctx = this.ctx;
    const white = piece.color === 'white';
    const base   = white ? this.colors.whitePiece : this.colors.ink;
    const accent = white ? this.colors.ink : this.colors.cinnabar;

    ctx.save();

    ctx.shadowColor = 'rgba(0,0,0,0.28)';
    ctx.shadowBlur = 3.5;
    ctx.shadowOffsetX = 1.5;
    ctx.shadowOffsetY = 1.5;

    ctx.beginPath();
    ctx.arc(x, y, R, 0, Math.PI * 2);
    ctx.fillStyle = base;
    ctx.fill();
    ctx.shadowColor = 'transparent';

    ctx.beginPath();
    ctx.arc(x, y, R, 0, Math.PI * 2);
    ctx.strokeStyle = accent;
    ctx.lineWidth = R * 0.14;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(x, y, R * 0.80, 0, Math.PI * 2);
    ctx.strokeStyle = accent;
    ctx.lineWidth = 0.7;
    ctx.globalAlpha = 0.4;
    ctx.stroke();
    ctx.globalAlpha = 1;

    const fs = R * 1.08;
    ctx.font = `bold ${fs}px "KaiTi","STKaiti","Kaiti SC","Songti SC",serif`;
    ctx.fillStyle = accent;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(char, x, y + 1);

    if (piece.type === 'king') {
      ctx.beginPath();
      ctx.arc(x, y - R * 0.48, R * 0.10, 0, Math.PI * 2);
      ctx.fillStyle = this.colors.cinnabar;
      ctx.fill();
    }

    if (piece.type === 'queen') {
      ctx.fillStyle = this.colors.cinnabar;
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const a = (i * 4 * Math.PI) / 5 - Math.PI / 2;
        const ppx = x + Math.cos(a) * R * 0.20;
        const ppy = y - R * 0.45 + Math.sin(a) * R * 0.20;
        i === 0 ? ctx.moveTo(ppx, ppy) : ctx.lineTo(ppx, ppy);
      }
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
  }

  // ── check flash ──────────────────────────────────────────────
  drawCheckFlash() {
    if (!this.engine.inCheck) return;
    const ctx = this.ctx;
    const ss = this.squareSize;
    const bx = this.boardOffsetX, by = this.boardOffsetY;
    const king = this.engine.findKing(this.engine.currentTurn);
    if (!king) return;

    const x = bx + king.col * ss, y = by + king.row * ss;
    const alpha = 0.22 + Math.sin(this.waveOffset * 3.5) * 0.12;

    ctx.fillStyle = `rgba(196, 30, 58, ${alpha})`;
    ctx.fillRect(x, y, ss, ss);

    ctx.strokeStyle = this.colors.cinnabar;
    ctx.lineWidth = 2.6;
    ctx.setLineDash([5, 4]);
    ctx.lineDashOffset = -this.waveOffset * 18;
    ctx.strokeRect(x + 1.5, y + 1.5, ss - 3, ss - 3);
    ctx.setLineDash([]);
  }

  // ── corner seal stamp ────────────────────────────────────────
  drawCornerSeal() {
    const ctx = this.ctx;
    const bx = this.boardOffsetX, by = this.boardOffsetY, bs = this.boardSize;
    const sx = bx + bs + 8;
    const sy = by - 6;
    const S = 26;

    ctx.save();
    ctx.globalAlpha = 0.68;
    ctx.fillStyle = this.colors.cinnabar;
    ctx.fillRect(sx - S/2, sy - S/2, S, S);

    ctx.fillStyle = this.colors.paper;
    ctx.font = `bold ${S * 0.5}px "KaiTi","STKaiti",serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('万船', sx, sy - S * 0.1);
    ctx.fillText('齐发', sx, sy + S * 0.22);
    ctx.restore();
  }

  // ── game over overlay ────────────────────────────────────────
  drawOverlay() {
    const ctx = this.ctx;
    const bx = this.boardOffsetX, by = this.boardOffsetY, bs = this.boardSize;

    ctx.fillStyle = 'rgba(245, 237, 220, 0.88)';
    ctx.fillRect(bx, by, bs, bs);

    const labels = {
      white_wins: '白方大胜', black_wins: '黑方大胜',
      stalemate: '逼  和', draw: '和  棋'
    };
    const text = labels[this.engine.result] || '终局';
    const fs = bs * 0.07;

    ctx.font = `bold ${fs}px "KaiTi","STKaiti","Songti SC",serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const tw = ctx.measureText(text).width + 36;
    const th = bs * 0.09;
    const tx = bx + bs/2, ty = by + bs/2;

    ctx.fillStyle = 'rgba(196, 30, 58, 0.12)';
    ctx.fillRect(tx - tw/2, ty - th/2, tw, th);
    ctx.strokeStyle = this.colors.cinnabar;
    ctx.lineWidth = 1.8;
    ctx.strokeRect(tx - tw/2, ty - th/2, tw, th);

    ctx.fillStyle = this.colors.cinnabar;
    ctx.fillText(text, tx, ty);

    if (this.engine.checkmateInfo) {
      ctx.font = `${bs * 0.033}px "KaiTi","STKaiti",serif`;
      ctx.fillStyle = this.colors.ink;
      ctx.fillText(this.engine.checkmateInfo, tx, ty + th * 0.75);
    }
  }

  // ── coord helper ─────────────────────────────────────────────
  getSquareFromPixel(px, py) {
    const bx = this.boardOffsetX, by = this.boardOffsetY, ss = this.squareSize;
    const col = Math.floor((px - bx) / ss);
    const row = Math.floor((py - by) / ss);
    if (col >= 0 && col < 8 && row >= 0 && row < 8) return { row, col };
    return null;
  }

  setSelected(row, col) {
    this.selectedSquare = row !== null ? { row, col } : null;
  }

  setLegalMoves(moves) { this.legalMoves = moves; }
  setLastMove(move)       { this.lastMove = move; }
}