const ClientApp = {
	socket: io(),

	init() {
		this.initElements();
		this.addEventListeners();
		this.setupSocket();
	},

	initElements() {

		this.classes = {
			hidden: 'hidden',
			fadingOut: 'fading-out',
		}

		this.el = {
			nameInput: document.getElementById('nameInput'),
			joinBtn: document.getElementById('joinBtn'),
			startBtn: document.getElementById('startBtn'),
			resetBtn: document.getElementById('resetBtn'),
			scoreBoard: document.getElementById('scoreboard'),
			gameBoard: document.getElementById('gameBoard'),
			banner: document.getElementById('banner'),
			statusLabel: document.getElementById('statusLabel'),
			roundText: document.getElementById('roundText'),
			maxRoundsText: document.getElementById('maxRoundsText'),
			hintText: document.getElementById('hintText'),
		}

		this.state = {
			myId: null,
			currentTreasureId: null,
			bannerTimeoutId: null,
		}
	},

	setupSocket() {
		this.socket.on('connect', () => {
			this.state.myId = this.socket.id;
			// auto-join with stored name if present
			const saved = localStorage.getItem('ttr_name');
			if (saved && saved.trim()) {
				this.el.nameInput.value = saved;
				this.socket.emit('join', saved);
			}
		});

		this.socket.on('state', (s) => this.handleStateUpdate(s));
	},

	hideResetButton() {
		this.el.resetBtn.classList.add(this.classes.hidden);
	},

	showResetButton() {
		this.el.resetBtn.classList.remove(this.classes.hidden);
	},

	hideStartButton() {
		this.el.startBtn.classList.add(this.classes.hidden);
	},

	showStartButton() {
		this.el.startBtn.classList.remove(this.classes.hidden);
	},

	setBanner(msg, show = true, persist = false) {
		// Cancel any pending fade-out
		if (this.state.bannerTimeoutId) {
			clearTimeout(this.state.bannerTimeoutId);
			this.state.bannerTimeoutId = null;
		}

		this.el.banner.textContent = msg;
		this.el.banner.classList.remove(this.classes.hidden, this.classes.fadingOut);

		if (show && !persist) {
			// Schedule fade-out after 3 seconds (unless persisting)
			this.state.bannerTimeoutId = setTimeout(() => {
				this.el.banner.classList.add(this.classes.fadingOut);
				// After fade completes, hide it
				const fadeTimeout = setTimeout(() => {
					this.el.banner.classList.add(this.classes.hidden);
					this.state.bannerTimeoutId = null;
				}, 300); // Match CSS transition duration
			}, 3000);
		} else if (!show) {
			this.el.banner.classList.add(this.classes.hidden);
		}
	},

	clearTreasure() {
		const t = this.el.gameBoard.querySelector('.treasure');
		if (t) t.remove();
		this.state.currentTreasureId = null;
	},

	placeTreasure(treasure) {
		this.clearTreasure();
		if (!treasure) return;

		this.state.currentTreasureId = treasure.id;

		const treasureEl = document.createElement('button');
		treasureEl.className = 'treasure';
		treasureEl.type = 'button';
		treasureEl.setAttribute('aria-label', 'Treasure');
		treasureEl.textContent = '💎';

		// Compute pixel position from normalized coords
		const rect = this.el.gameBoard.getBoundingClientRect();

		treasureEl.style.left = `${treasure.x * rect.width}px`;
		treasureEl.style.top = `${treasure.y * rect.height}px`;

		// Tap handler
		const tap = (ev) => {
			ev.preventDefault();
			ev.stopPropagation();
			if (!this.state.currentTreasureId) return;
			this.socket.emit('tapTreasure', { treasureId: this.state.currentTreasureId });
		};

		treasureEl.addEventListener('click', tap, { passive: false });
		treasureEl.addEventListener('touchstart', tap, { passive: false });

		this.el.gameBoard.appendChild(treasureEl);
	},

	handleStateUpdate(s) {
		this.updateStatusLabel(s.phase);
		this.updateRoundDisplay(s.round, s.maxRounds);
		this.updateScoreboard(s.players);
		this.saveName();

		// Update phase-specific UI
		if (s.phase === 'lobby') {
			this.setLobbyState(s.players);
		} else if (s.phase === 'playing') {
			this.setPlayingState(s.players, s.treasure);
		} else if (s.phase === 'roundOver') {
			this.setRoundOverState(s.players, s.winnerSocketId);
		} else if (s.phase === 'ended') {
			this.setEndedState(s.players);
		}
	},

	updateStatusLabel(phase) {
		this.el.statusLabel.textContent =
			phase === 'lobby' ? 'Lobby' :
			phase === 'playing' ? 'Playing' :
			phase === 'roundOver' ? 'Round Over' :
			'Game Over';
	},

	updateRoundDisplay(round, maxRounds) {
		this.el.roundText.textContent = String(round);
		this.el.maxRoundsText.textContent = String(maxRounds);
	},

	updateScoreboard(players) {
		this.el.scoreBoard.innerHTML = '';
		const sorted = [...players].sort((a, b) => b.score - a.score);
		for (const p of sorted) {
			const li = document.createElement('li');
			li.className = 'scoreboard--item' + (p.id === this.state.myId ? ' current-player' : '');
			li.innerHTML = `<span>${this.escapeHtml(p.name)}</span><span>⭐ ${p.score}</span>`;
			this.el.scoreBoard.appendChild(li);
		}
	},

	saveName() {
		const typed = this.el.nameInput.value.trim();
		if (typed) localStorage.setItem('ttr_name', typed);
	},

	setLobbyState(players) {
		this.clearTreasure();
		this.hideResetButton();
		this.showStartButton();
		const hint = players.length > 0 ? 'Press Start to begin!' : 'Join the game to start!';
		this.setBanner(hint, true, true);
		this.el.hintText.textContent = hint;
	},

	setPlayingState(players, treasure) {
		this.showResetButton();
		this.hideStartButton();
		this.setBanner('Find the treasure NOW!', true);
		const isSinglePlayer = players.length === 1;
		this.el.hintText.textContent = isSinglePlayer ? 'Tap to earn points!' : 'First tap wins the point!';
		this.placeTreasure(treasure);
	},

	setRoundOverState(players, winnerSocketId) {
		this.clearTreasure();
		const isSinglePlayer = players.length === 1;
		if (winnerSocketId) {
			const winner = players.find(p => p.id === winnerSocketId);
			if (isSinglePlayer) {
				this.setBanner('Point earned! 🎉', true);
			} else {
				this.setBanner(winner ? `Point for ${winner.name}!` : 'Point scored!', true);
			}
		} else {
			this.setBanner(isSinglePlayer ? 'Treasure expired! Next round…' : 'No one got it! Next round…', true);
		}
		this.el.hintText.textContent = 'Get ready…';
	},

	setEndedState(players) {
		this.clearTreasure();
		this.hideResetButton();
		this.showStartButton();
		const sorted = [...players].sort((a, b) => b.score - a.score);
		const winner = sorted[0];
		const isSinglePlayer = players.length === 1;

		if (isSinglePlayer) {
			this.setBanner(`Final Score: ${winner.score}`, true, true);
			this.el.hintText.textContent = 'Press Reset Scores to play again!';
		} else {
			const medal = winner.id === this.state.myId ? '👑' : '🏆';
			this.setBanner(`${medal} ${this.escapeHtml(winner.name)} wins!`, true, true);
			this.el.hintText.textContent = `Final: ${winner.name} - ${winner.score}`;
		}
	},

	addEventListeners() {
		this.el.joinBtn.addEventListener('click', () => {
			this.socket.emit('join', this.el.nameInput.value);
			this.el.nameInput.blur();
		});

		this.el.nameInput.addEventListener('keydown', (e) => {
			if (e.key === 'Enter') this.el.joinBtn.click();
		});

		this.el.startBtn.addEventListener('click', () => this.socket.emit('start'));
		this.el.resetBtn.addEventListener('click', () => this.socket.emit('reset'));

		window.addEventListener('resize', () => {
			if (!this.state.currentTreasureId) return;
			// We need the last known treasure from state; easiest: request state by reconnect.
			// But we can simply do nothing; next round will re-place.
		});
	},

	escapeHtml(str) {
		return String(str)
			.replaceAll('&', '&amp;')
			.replaceAll('<', '&lt;')
			.replaceAll('>', '&gt;')
			.replaceAll(`'`, '&quot;')
			.replaceAll(`'`, '&#039;');
	}
};

ClientApp.init();
