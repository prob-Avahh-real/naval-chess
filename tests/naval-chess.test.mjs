import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function loadChessEngine() {
  const src = fs.readFileSync(path.join(ROOT, 'js/chess-engine.js'), 'utf8');
  const ctx = vm.createContext({ Math, Array });
  vm.runInContext(`${src}\n;globalThis.ChessEngine = ChessEngine;`, ctx, {
    filename: 'js/chess-engine.js',
  });
  return ctx.ChessEngine;
}

test('initial naval-chess board has 32 ships, both flagships, and 20 opening moves', () => {
  const ChessEngine = loadChessEngine();
  const game = new ChessEngine();

  assert.equal(game.currentTurn, 'white');
  assert.deepEqual({ ...game.findKing('white') }, { row: 7, col: 4 });
  assert.deepEqual({ ...game.findKing('black') }, { row: 0, col: 4 });

  let pieceCount = 0;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (game.board[r][c]) pieceCount++;
    }
  }
  assert.equal(pieceCount, 32);
  assert.equal(game.getAllLegalMoves().length, 20);
});

test('Scholar mate triggers checkmate detection and Chinese naval notation', () => {
  const ChessEngine = loadChessEngine();
  const game = new ChessEngine();

  const play = (fromRow, fromCol, toRow, toCol) => {
    const legal = game
      .getLegalMoves(fromRow, fromCol)
      .find((m) => m.toRow === toRow && m.toCol === toCol);
    assert.ok(legal, `expected legal move (${fromRow},${fromCol})->(${toRow},${toCol})`);
    game.makeMove(legal);
  };

  // 1. e4 e5  2. Bc4 Nc6  3. Qh5 Nf6  4. Qxf7#
  play(6, 4, 4, 4);
  play(1, 4, 3, 4);
  play(7, 5, 4, 2);
  play(0, 1, 2, 2);
  play(7, 3, 3, 7);
  play(0, 6, 2, 5);
  play(3, 7, 1, 5);

  assert.equal(game.gameOver, true);
  assert.equal(game.result, 'white_wins');
  assert.match(game.checkmateInfo, /将死！白方胜/);

  const lastMove = game.moveHistory.at(-1);
  assert.equal(game.getMoveNotation(lastMove), '战h5×f7');
});

test('en passant and king-side castling work per international rules', () => {
  const ChessEngine = loadChessEngine();
  const game = new ChessEngine();

  // Clear f1/g1 for white king-side castling
  game.board[7][5] = null;
  game.board[7][6] = null;
  const castle = game.getLegalMoves(7, 4).find((m) => m.castling === 'kingSide');
  assert.ok(castle, 'expected kingSide castling move');
  game.makeMove(castle);
  assert.equal(game.board[7][6].type, 'king');
  assert.equal(game.board[7][5].type, 'rook');
  assert.equal(game.getMoveNotation(game.moveHistory.at(-1)), 'O-O');
});
