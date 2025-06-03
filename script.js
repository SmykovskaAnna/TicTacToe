// The Player class represents a game player with a specific symbol (X or O)
class Player {
  constructor(symbol) {
    this.symbol = symbol;
  }
}

// The Board class manages the playing field, visualization, and cell clicks
class Board {
  constructor(onCellClickCallback) {
    this.cells = Array(9).fill(null);
    this.onCellClick = onCellClickCallback;
    this.boardElement = document.getElementById('board');
    this.render();
  }

  // Displays the field: creates HTML cell elements
  render() {
    this.boardElement.innerHTML = '';
    this.cells.forEach((value, index) => {
      const cell = document.createElement('div');
      cell.classList.add('cell');
      cell.setAttribute('role', 'button');
      cell.setAttribute('tabindex', '0');

      if (value) {
        cell.textContent = value;
        cell.classList.add('disabled');
        cell.removeAttribute('tabindex');
      }

      cell.addEventListener('click', () => this.handleCellClick(index));
    
      cell.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          this.handleCellClick(index);
        }
      });
      this.boardElement.appendChild(cell);
    });
  }

  // Cell click handler
  handleCellClick(index) {
    if (this.cells[index] === null) {
      this.onCellClick(index);
    }
  }

  // Updates the cell with a specific character
  updateCell(index, symbol) {
    this.cells[index] = symbol;
    this.render();
  }

  // Highlights the winning combination
  highlightWin(comboIndexes) {
    const cellElements = this.boardElement.children;
    comboIndexes.forEach(index => {
      cellElements[index].classList.add('win');
    });
  }

  // Resets the field to its original state
  reset() {
    this.cells.fill(null);
    this.render();
  }

  // Checks if all cells are filled
  isFull() {
    return this.cells.every(cell => cell !== null);
  }
}

// The Game class contains the main game logic
class Game {
  constructor(mode) {
    this.playerX = new Player('X');
    this.playerO = new Player('O');
    this.currentPlayer = this.playerX;

    // Setting the mode and difficulty
    this.mode = mode;
    this.difficulty = document.getElementById('difficulty').value;
    this.isBotEnabled = (mode === 'pve');

    // Connecting to DOM elements
    this.statusElement = document.getElementById('status');
    this.board = new Board(this.handleMove.bind(this));
    this.isGameOver = false;

    // Initialize statistics
    this.stats = {
      X: { wins: 0, draws: 0 },
      O: { wins: 0, draws: 0 }
    };

    this.updateStatus();

    // Events on buttons
    document.getElementById('restart').addEventListener('click', () => this.reset());
    document.getElementById('reset-stats').addEventListener('click', () => this.resetStats());
  }

  // Main function — processing the player's move
  handleMove(index) {
    if (this.isGameOver || this.board.cells[index]) return;

    this.board.updateCell(index, this.currentPlayer.symbol);

    const winCombo = this.checkWin(this.currentPlayer.symbol);
    if (winCombo) {
      this.board.highlightWin(winCombo);
      this.statusElement.textContent = `Player ${this.currentPlayer.symbol} wins!`;
      this.isGameOver = true;
      this.updateStats(this.currentPlayer.symbol);
      return;
    }

    if (this.board.isFull()) {
      this.statusElement.textContent = `It's a draw!`;
      this.isGameOver = true;
      this.updateStats('draw');
      return;
    }

    this.switchPlayer();
    this.updateStatus();

    // If the bot is active, it makes a move after 300ms
    if (this.isBotEnabled && this.currentPlayer === this.playerO && !this.isGameOver) {
      setTimeout(() => this.makeBotMove(), 300);
    }
  }

  // Bot chooses a move based on the selected difficulty
  makeBotMove() {
    let move;
    if (this.difficulty === 'easy') {
      move = this.getRandomMove();
    } else if (this.difficulty === 'medium') {
      move = this.getMediumMove();
    } else {
      move = this.getBestMove(this.board.cells, this.playerO.symbol).index;
    }
    if (move !== undefined) this.handleMove(move);
  }

  // Easy: random move
  getRandomMove() {
    const empty = this.board.cells.map((v, i) => v === null ? i : null).filter(i => i !== null);
    return empty[Math.floor(Math.random() * empty.length)];
  }

  // Medium: tries to win or block
  getMediumMove() {
    let blockMove = null;

    for (let i = 0; i < 9; i++) {
      if (!this.board.cells[i]) {
        // Check if we win by moving for O
        this.board.cells[i] = this.playerO.symbol;
        if (this.checkWin(this.playerO.symbol)) {
          this.board.cells[i] = null;
          return i;
        }
        this.board.cells[i] = null;

        // Check if X should be blocked
        this.board.cells[i] = this.playerX.symbol;
        if (this.checkWin(this.playerX.symbol)) {
          blockMove = i;
        }
        this.board.cells[i] = null;
      }
    }
    if (blockMove !== null) return blockMove; // If you need to block, return the move
    // If there is no win or block — random move
    return this.getRandomMove();
  }

  // Hard: Minimax algorithm
  getBestMove(board, player) {
    const opponent = (player === 'X') ? 'O' : 'X';
    const empty = board.map((v, i) => v === null ? i : null).filter(i => i !== null);

    if (this.checkStaticWin(board, this.playerX.symbol)) return { score: -10 };
    if (this.checkStaticWin(board, this.playerO.symbol)) return { score: 10 };
    if (empty.length === 0) return { score: 0 };

    const moves = [];

    for (let i of empty) {
      const newBoard = [...board];
      newBoard[i] = player;

      const result = this.getBestMove(newBoard, opponent);
      moves.push({ index: i, score: -result.score });
    }

    return moves.sort((a, b) => b.score - a.score)[0];
  }

  // For static win check (without updating UI)
  checkStaticWin(cells, symbol) {
    const wins = [
      [0,1,2], [3,4,5], [6,7,8],
      [0,3,6], [1,4,7], [2,5,8],
      [0,4,8], [2,4,6]
    ];
    return wins.some(combo => combo.every(i => cells[i] === symbol));
  }

  // Switches the active player
  switchPlayer() {
    this.currentPlayer = (this.currentPlayer === this.playerX) ? this.playerO : this.playerX;
  }

  // Updates the status text (whose turn is it)
  updateStatus() {
    this.statusElement.textContent = `Current turn: ${this.currentPlayer.symbol}`;
  }

  // Checks if the current player won
  checkWin(symbol) {
    const b = this.board.cells;
    const wins = [
      [0,1,2], [3,4,5], [6,7,8],
      [0,3,6], [1,4,7], [2,5,8],
      [0,4,8], [2,4,6]
    ];
    return wins.find(line => line.every(i => b[i] === symbol)) || null;
  }

  // Updates statistics after a win or draw
  updateStats(result) {
    if (result === 'draw') {
      this.stats.X.draws++;
      this.stats.O.draws++;
    } else {
      this.stats[result].wins++;
    }
    this.renderStats();
  }

  // Displays statistics in the DOM
  renderStats() {
    document.getElementById('x-wins').textContent = this.stats.X.wins;
    document.getElementById('x-draws').textContent = this.stats.X.draws;
    document.getElementById('o-wins').textContent = this.stats.O.wins;
    document.getElementById('o-draws').textContent = this.stats.O.draws;
  }

  // Resets statistics
  resetStats() {
    this.stats = {
      X: { wins: 0, draws: 0 },
      O: { wins: 0, draws: 0 }
    };
    this.renderStats();
  }

  // Resets the game to the beginning
  reset() {
    const mode = document.getElementById('mode').value;
    this.difficulty = document.getElementById('difficulty').value;
    this.isBotEnabled = (mode === 'pve');
    this.board.reset();
    this.currentPlayer = this.playerX;
    this.isGameOver = false;
    this.updateStatus();
  }
}

// Global variable for the game
let game;

// Game initialization
function startGame() {
  const mode = document.getElementById('mode').value;
  game = new Game(mode);
}

// Event listeners for mode or complexity changes
document.getElementById('mode').addEventListener('change', () => startGame());
document.getElementById('difficulty').addEventListener('change', () => startGame());

// Start when the page loads
window.onload = () => startGame();