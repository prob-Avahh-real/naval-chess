// Chess Engine - Complete international chess rules (万船齐发 edition)
// Board: 8x8, row 0 = rank 8 (black home), row 7 = rank 1 (white home)

class ChessEngine {
  constructor() {
    this.reset();
  }

  reset() {
    this.board = Array(8).fill(null).map(() => Array(8).fill(null));
    this.currentTurn = 'white';
    this.moveHistory = [];
    this.capturedPieces = { white: [], black: [] };
    this.gameOver = false;
    this.result = null;
    this.checkmateInfo = '';
    this.inCheck = false;

    this.castlingRights = {
      white: { kingSide: true, queenSide: true },
      black: { kingSide: true, queenSide: true }
    };

    this.enPassantTarget = null;
    this.halfMoveClock = 0;
    this.fullMoveNumber = 1;

    this.setupBoard();
  }

  setupBoard() {
    const backRank = ['rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook'];
    for (let col = 0; col < 8; col++) {
      this.board[0][col] = { type: backRank[col], color: 'black' };
      this.board[1][col] = { type: 'pawn', color: 'black' };
      this.board[6][col] = { type: 'pawn', color: 'white' };
      this.board[7][col] = { type: backRank[col], color: 'white' };
    }
  }

  cloneBoard() {
    return this.board.map(row => row.map(cell => cell ? { ...cell } : null));
  }

  isInBounds(r, c) {
    return r >= 0 && r <= 7 && c >= 0 && c <= 7;
  }

  findKing(color) {
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = this.board[r][c];
        if (p && p.type === 'king' && p.color === color) return { row: r, col: c };
      }
    }
    return null;
  }

  getRawAttacks(row, col, piece) {
    const moves = [];
    const addSliding = (drs, dcs) => {
      for (let i = 0; i < drs.length; i++) {
        const dr = drs[i], dc = dcs[i];
        for (let step = 1; step < 8; step++) {
          const r = row + dr * step, c = col + dc * step;
          if (!this.isInBounds(r, c)) break;
          moves.push({ toRow: r, toCol: c });
          if (this.board[r][c]) break;
        }
      }
    };

    switch (piece.type) {
      case 'pawn': {
        const dir = piece.color === 'white' ? -1 : 1;
        if (this.isInBounds(row + dir, col - 1)) moves.push({ toRow: row + dir, toCol: col - 1 });
        if (this.isInBounds(row + dir, col + 1)) moves.push({ toRow: row + dir, toCol: col + 1 });
        break;
      }
      case 'knight':
        for (const [dr, dc] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]) {
          if (this.isInBounds(row + dr, col + dc)) moves.push({ toRow: row + dr, toCol: col + dc });
        }
        break;
      case 'bishop':
        addSliding([-1, -1, 1, 1], [-1, 1, -1, 1]);
        break;
      case 'rook':
        addSliding([-1, 1, 0, 0], [0, 0, -1, 1]);
        break;
      case 'queen':
        addSliding([-1, -1, -1, 0, 0, 1, 1, 1], [-1, 0, 1, -1, 1, -1, 0, 1]);
        break;
      case 'king':
        for (const [dr, dc] of [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]) {
          if (this.isInBounds(row + dr, col + dc)) moves.push({ toRow: row + dr, toCol: col + dc });
        }
        break;
    }
    return moves;
  }

  isSquareAttacked(row, col, attackerColor) {
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = this.board[r][c];
        if (piece && piece.color === attackerColor) {
          if (this.getRawAttacks(r, c, piece).some(m => m.toRow === row && m.toCol === col)) {
            return true;
          }
        }
      }
    }
    return false;
  }

  getPseudoLegalMoves(row, col) {
    const piece = this.board[row][col];
    if (!piece) return [];

    const moves = [];
    const color = piece.color;
    const enemy = color === 'white' ? 'black' : 'white';

    const canMoveTo = (r, c) => {
      if (!this.isInBounds(r, c)) return false;
      const t = this.board[r][c];
      return !t || t.color !== color;
    };

    const addSliding = (drs, dcs) => {
      for (let i = 0; i < drs.length; i++) {
        const dr = drs[i], dc = dcs[i];
        for (let step = 1; step < 8; step++) {
          const r = row + dr * step, c = col + dc * step;
          if (!this.isInBounds(r, c)) break;
          const t = this.board[r][c];
          if (!t) {
            moves.push({ fromRow: row, fromCol: col, toRow: r, toCol: c });
          } else {
            if (t.color === enemy) moves.push({ fromRow: row, fromCol: col, toRow: r, toCol: c });
            break;
          }
        }
      }
    };

    switch (piece.type) {
      case 'pawn': {
        const dir = color === 'white' ? -1 : 1;
        const startRow = color === 'white' ? 6 : 1;
        const promoRow = color === 'white' ? 0 : 7;
        const promoOpts = ['queen', 'rook', 'bishop', 'knight'];

        if (this.isInBounds(row + dir, col) && !this.board[row + dir][col]) {
          moves.push({
            fromRow: row, fromCol: col, toRow: row + dir, toCol: col,
            promotion: (row + dir === promoRow) ? promoOpts : null
          });
          if (row === startRow && !this.board[row + 2 * dir][col]) {
            moves.push({ fromRow: row, fromCol: col, toRow: row + 2 * dir, toCol: col });
          }
        }

        for (const dc of [-1, 1]) {
          const nr = row + dir, nc = col + dc;
          if (!this.isInBounds(nr, nc)) continue;
          const t = this.board[nr][nc];
          if (t && t.color === enemy) {
            moves.push({
              fromRow: row, fromCol: col, toRow: nr, toCol: nc,
              promotion: (nr === promoRow) ? promoOpts : null
            });
          }
        }

        if (this.enPassantTarget && this.enPassantTarget.row === row + dir &&
            Math.abs(this.enPassantTarget.col - col) === 1) {
          moves.push({
            fromRow: row, fromCol: col, toRow: row + dir, toCol: this.enPassantTarget.col,
            enPassant: true
          });
        }
        break;
      }

      case 'knight':
        for (const [dr, dc] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]) {
          if (canMoveTo(row + dr, col + dc)) {
            moves.push({ fromRow: row, fromCol: col, toRow: row + dr, toCol: col + dc });
          }
        }
        break;

      case 'bishop':
        addSliding([-1, -1, 1, 1], [-1, 1, -1, 1]);
        break;

      case 'rook':
        addSliding([-1, 1, 0, 0], [0, 0, -1, 1]);
        break;

      case 'queen':
        addSliding([-1, -1, -1, 0, 0, 1, 1, 1], [-1, 0, 1, -1, 1, -1, 0, 1]);
        break;

      case 'king':
        for (const [dr, dc] of [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]) {
          if (canMoveTo(row + dr, col + dc)) {
            moves.push({ fromRow: row, fromCol: col, toRow: row + dr, toCol: col + dc });
          }
        }
        // Castling
        const homeRow = color === 'white' ? 7 : 0;
        if (row === homeRow && col === 4) {
          if (this.castlingRights[color].kingSide &&
              !this.board[homeRow][5] && !this.board[homeRow][6] &&
              this.board[homeRow][7]?.type === 'rook' && this.board[homeRow][7]?.color === color) {
            if (!this.isSquareAttacked(homeRow, 4, enemy) &&
                !this.isSquareAttacked(homeRow, 5, enemy) &&
                !this.isSquareAttacked(homeRow, 6, enemy)) {
              moves.push({ fromRow: row, fromCol: col, toRow: homeRow, toCol: 6, castling: 'kingSide' });
            }
          }
          if (this.castlingRights[color].queenSide &&
              !this.board[homeRow][3] && !this.board[homeRow][2] && !this.board[homeRow][1] &&
              this.board[homeRow][0]?.type === 'rook' && this.board[homeRow][0]?.color === color) {
            if (!this.isSquareAttacked(homeRow, 4, enemy) &&
                !this.isSquareAttacked(homeRow, 3, enemy) &&
                !this.isSquareAttacked(homeRow, 2, enemy)) {
              moves.push({ fromRow: row, fromCol: col, toRow: homeRow, toCol: 2, castling: 'queenSide' });
            }
          }
        }
        break;
    }

    return moves;
  }

  isMoveLegal(move) {
    const originalBoard = this.cloneBoard();
    const piece = this.board[move.fromRow][move.fromCol];

    this.board[move.toRow][move.toCol] = piece;
    this.board[move.fromRow][move.fromCol] = null;

    if (move.enPassant) {
      this.board[move.fromRow][move.toCol] = null;
    }
    if (move.castling === 'kingSide') {
      this.board[move.fromRow][5] = this.board[move.fromRow][7];
      this.board[move.fromRow][7] = null;
    } else if (move.castling === 'queenSide') {
      this.board[move.fromRow][3] = this.board[move.fromRow][0];
      this.board[move.fromRow][0] = null;
    }

    const king = this.findKing(piece.color);
    const inCheck = king && this.isSquareAttacked(king.row, king.col,
      piece.color === 'white' ? 'black' : 'white');

    this.board = originalBoard;
    return !inCheck;
  }

  getLegalMoves(row, col) {
    const piece = this.board[row][col];
    if (!piece || piece.color !== this.currentTurn) return [];
    return this.getPseudoLegalMoves(row, col).filter(m => this.isMoveLegal(m));
  }

  getAllLegalMoves() {
    const moves = [];
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = this.board[r][c];
        if (p && p.color === this.currentTurn) {
          moves.push(...this.getLegalMoves(r, c));
        }
      }
    }
    return moves;
  }

  makeMove(move) {
    const piece = this.board[move.fromRow][move.fromCol];
    const capturedOnTarget = this.board[move.toRow][move.toCol];

    // Handle en passant capture
    if (move.enPassant) {
      const capturedPawn = this.board[move.fromRow][move.toCol];
      if (capturedPawn) {
        this.capturedPieces[piece.color].push({ ...capturedPawn });
        this.board[move.fromRow][move.toCol] = null;
      }
    }

    if (capturedOnTarget && !move.enPassant) {
      this.capturedPieces[piece.color].push({ ...capturedOnTarget });
    }

    // Move the piece
    this.board[move.toRow][move.toCol] = piece;
    this.board[move.fromRow][move.fromCol] = null;

    // Castling rook relocation
    if (move.castling === 'kingSide') {
      this.board[move.fromRow][5] = this.board[move.fromRow][7];
      this.board[move.fromRow][7] = null;
    } else if (move.castling === 'queenSide') {
      this.board[move.fromRow][3] = this.board[move.fromRow][0];
      this.board[move.fromRow][0] = null;
    }

    // Promotion
    if (move.promotion && move.promoteTo) {
      this.board[move.toRow][move.toCol] = { type: move.promoteTo, color: piece.color };
    }

    // Update en passant
    this.enPassantTarget = null;
    if (piece.type === 'pawn' && Math.abs(move.toRow - move.fromRow) === 2) {
      this.enPassantTarget = { row: (move.fromRow + move.toRow) / 2, col: move.fromCol };
    }

    // Update castling rights
    if (piece.type === 'king') {
      this.castlingRights[piece.color].kingSide = false;
      this.castlingRights[piece.color].queenSide = false;
    }
    if (piece.type === 'rook') {
      if (move.fromCol === 0) this.castlingRights[piece.color].queenSide = false;
      if (move.fromCol === 7) this.castlingRights[piece.color].kingSide = false;
    }
    const backRow = piece.color === 'white' ? 0 : 7;
    if (move.toRow === backRow) {
      if (move.toCol === 0) this.castlingRights[piece.color === 'white' ? 'black' : 'white'].queenSide = false;
      if (move.toCol === 7) this.castlingRights[piece.color === 'white' ? 'black' : 'white'].kingSide = false;
    }

    // Move counters
    if (piece.type === 'pawn' || capturedOnTarget || move.enPassant) {
      this.halfMoveClock = 0;
    } else {
      this.halfMoveClock++;
    }
    if (piece.color === 'black') this.fullMoveNumber++;

    // Record move
    this.moveHistory.push({
      ...move,
      piece: { type: piece.type, color: piece.color },
      captured: capturedOnTarget ? { type: capturedOnTarget.type, color: capturedOnTarget.color } : null
    });

    // Switch turns
    this.currentTurn = this.currentTurn === 'white' ? 'black' : 'white';

    // Evaluate new position
    this.evaluatePosition();
  }

  evaluatePosition() {
    const color = this.currentTurn;
    const king = this.findKing(color);
    if (!king) {
      this.gameOver = true;
      this.result = color === 'white' ? 'black_wins' : 'white_wins';
      this.checkmateInfo = color === 'white' ? '黑方大胜！白旗已沉' : '白方大胜！黑旗已沉';
      return;
    }

    const inCheck = this.isSquareAttacked(king.row, king.col,
      color === 'white' ? 'black' : 'white');

    let hasLegal = false;
    for (let r = 0; r < 8 && !hasLegal; r++) {
      for (let c = 0; c < 8 && !hasLegal; c++) {
        const p = this.board[r][c];
        if (p && p.color === color && this.getLegalMoves(r, c).length > 0) {
          hasLegal = true;
        }
      }
    }

    if (!hasLegal) {
      this.gameOver = true;
      if (inCheck) {
        this.result = color === 'white' ? 'black_wins' : 'white_wins';
        this.checkmateInfo = color === 'white' ? '将死！黑方胜' : '将死！白方胜';
      } else {
        this.result = 'stalemate';
        this.checkmateInfo = '逼和（无路可走）';
      }
      return;
    }

    if (this.halfMoveClock >= 100) {
      this.gameOver = true;
      this.result = 'draw';
      this.checkmateInfo = '五十回合规则 · 和棋';
      return;
    }

    this.inCheck = inCheck;
  }

  getMoveNotation(move) {
    const names = { king: '旗', queen: '战', rook: '炮', bishop: '巡', knight: '快', pawn: '艇' };
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const name = names[move.piece.type] || '?';
    const from = files[move.fromCol] + (8 - move.fromRow);
    const to = files[move.toCol] + (8 - move.toRow);
    const sep = (move.captured || move.enPassant) ? '×' : '-';
    const promo = move.promoteTo ? `→${names[move.promoteTo]}` : '';
    if (move.castling === 'kingSide') return 'O-O';
    if (move.castling === 'queenSide') return 'O-O-O';
    return `${name}${from}${sep}${to}${promo}`;
  }
}
