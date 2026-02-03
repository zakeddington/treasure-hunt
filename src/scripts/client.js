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
			roundText: document.getElementById('roundText'),
			maxRoundsText: document.getElementById('maxRoundsText'),
			timer: document.querySelector('.game-board--round-timer'),
		}

		this.state = {
			myId: null,
			currentTreasureId: null,
			bannerTimeoutId: null,
			timerIntervalId: null,
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

		this.el.banner.innerHTML = msg;
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
		this.stopTimer();
	},

	startTimer(roundEndsAt) {
		this.stopTimer();
		this.el.timer.classList.remove(this.classes.hidden);

		// Update immediately on start
		this.updateTimerDisplay(roundEndsAt);

		// Update every second
		this.state.timerIntervalId = setInterval(() => {
			this.updateTimerDisplay(roundEndsAt);
		}, 1000);
	},

	updateTimerDisplay(roundEndsAt) {
		const now = Date.now();
		const remaining = Math.max(0, Math.ceil((roundEndsAt - now) / 1000));
		this.el.timer.textContent = String(remaining).padStart(2, '0');
	},

	stopTimer() {
		if (this.state.timerIntervalId) {
			clearInterval(this.state.timerIntervalId);
			this.state.timerIntervalId = null;
		}

		this.el.timer.textContent = '';
		this.el.timer.classList.add(this.classes.hidden);
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
		this.updateRoundDisplay(s.round, s.maxRounds);
		this.updateScoreboard(s.players);
		this.saveName();

		// Update phase-specific UI
		if (s.phase === 'lobby') {
			this.setLobbyState(s.players);
		} else if (s.phase === 'playing') {
			this.setPlayingState(s.treasure, s.roundEndsAt);
		} else if (s.phase === 'roundOver') {
			this.setRoundOverState(s.players, s.winnerSocketId);
		} else if (s.phase === 'ended') {
			this.setEndedState(s.players);
		}
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
	},

	setPlayingState(treasure, roundEndsAt) {
		this.showResetButton();
		this.hideStartButton();
		this.setBanner('Find the treasure NOW!', true);
		this.placeTreasure(treasure);
		this.startTimer(roundEndsAt);
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
	},

	setEndedState(players) {
		this.clearTreasure();
		this.hideResetButton();
		this.showStartButton();
		const sorted = [...players].sort((a, b) => b.score - a.score);
		const winner = sorted[0];
		const isSinglePlayer = players.length === 1;

		if (isSinglePlayer) {
			this.setBanner(`<span class="text-size-large">Game Over</span><br />Final Score: ${winner.score}`, true, true);
		} else {
			const medal = winner.id === this.state.myId ? '👑' : '🏆';
			this.setBanner(`<span class="text-size-large">Game Over<br />${medal}</span><br />${this.escapeHtml(winner.name)} wins!`, true, true);
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
