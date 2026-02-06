
import { PlayerNameManager } from './PlayerNameManager.js';
import { MapPicker } from './MapPicker.js';

const ClientApp = {
	socket: io(),

	init() {
		this.initElements();
		this.initPlayerNameManager();
		this.initMapPicker();
		this.addEventListeners();
		this.setupSocket();
	},

	initElements() {

		this.config = {
			animSpeedTreasure: 1000, // ms
			animSpeedScore: 900, // ms
		}

		this.classes = {
			hidden: 'hidden',
			fadingOut: 'fading-out',
			treasure: 'treasure',
			scoreboardItem: 'scoreboard--item',
			currentPlayer: 'current-player',
		}

		this.selectors = {
			curPlayerScore: '.scoreboard--item.current-player .scoreboard--item-score',
		}

		this.el = {
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

	initPlayerNameManager() {
		this.playerNameManager = new PlayerNameManager({
			socket: this.socket,
		});
	},

	initMapPicker() {
		this.mapPicker = new MapPicker({
			socket: this.socket,
		});
	},

	setupSocket() {
		this.socket.on('connect', () => {
			this.state.myId = this.socket.id;
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
		const t = this.el.gameBoard.querySelector('.' + this.classes.treasure);
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
		treasureEl.className = this.classes.treasure;
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
			// animate locally to give immediate feedback
			try {
				this.animateTreasureToScore(treasureEl);
			} catch (err) {
				// ignore
			}
			this.socket.emit('tapTreasure', { treasureId: this.state.currentTreasureId });
		};

		treasureEl.addEventListener('click', tap, { passive: false });
		treasureEl.addEventListener('touchstart', tap, { passive: false });

		this.el.gameBoard.appendChild(treasureEl);
	},

	animateTreasureToScore(sourceEl) {
		const scoreBoard = this.el.scoreBoard;
		if (!scoreBoard) return;
		const targetItem = scoreBoard.querySelector(this.selectors.curPlayerScore);
		if (!targetItem) return;

		const sourceRect = sourceEl.getBoundingClientRect();
		const targetRect = targetItem.getBoundingClientRect();

		const clone = sourceEl.cloneNode(true);
		clone.classList.add('treasure-fly');
		clone.style.position = 'fixed';
		clone.style.left = `${sourceRect.left}px`;
		clone.style.top = `${sourceRect.top}px`;
		clone.style.width = `${sourceRect.width}px`;
		clone.style.height = `${sourceRect.height}px`;
		clone.style.margin = '0';
		clone.style.pointerEvents = 'none';
		document.body.appendChild(clone);

		// force layout
		void clone.offsetWidth;

		const destX = (targetRect.left + targetRect.width / 2) - (sourceRect.left + sourceRect.width / 2);
		const destY = (targetRect.top + targetRect.height / 2) - (sourceRect.top + sourceRect.height / 2);

		clone.style.transition = `transform ${this.config.animSpeedTreasure}ms cubic-bezier(0.2,0.8,0.2,1), opacity ${this.config.animSpeedTreasure}ms linear`;
		clone.style.transform = `translate(${destX}px, ${destY}px) scale(0.7)`;
		clone.style.opacity = '0.95';

		setTimeout(() => { clone.style.opacity = '0'; }, 600);

		clone.addEventListener('transitionend', () => clone.remove(), { once: true });
	},

	handleStateUpdate(s) {
		// Handle map picker and map updates
		this.mapPicker.setMap(s.selectedMap);
		this.mapPicker.handleStateUpdate(s.maps, s.selectedMap);

		this.updateRoundDisplay(s.round, s.maxRounds);
		this.updateScoreboard(s.players, s.winnerSocketId, s.phase);

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

	updateScoreboard(players, winnerSocketId, phase) {
		let timeout = 0;

		// prevent anim from being overridden by other state updates
		if (phase === 'roundOver') {
			timeout = this.config.animSpeedTreasure;
		} else if (phase === 'ended') {
			timeout = this.config.animSpeedTreasure + this.config.animSpeedScore;
		}

		setTimeout(() => {
			this.el.scoreBoard.innerHTML = '';
			for (const p of [...players]) {
				const li = document.createElement('li');
				li.className = this.classes.scoreboardItem + (p.id === this.state.myId ? ` ${this.classes.currentPlayer}` : '');
				li.innerHTML = `<span class="scoreboard--item-name">${this.escapeHtml(p.name)}</span><span class="scoreboard--item-score">💎 ${p.score}</span>`;
				if (winnerSocketId && p.id === winnerSocketId) {
					li.classList.add('anim-score');
					// remove class after animation completes
					setTimeout(() => li.classList.remove('anim-score'), this.config.animSpeedScore);
				}
				this.el.scoreBoard.appendChild(li);
			}
			// Enable click-to-edit on current player's name
			this.playerNameManager.enableScoreboardEditing(this.el.scoreBoard, this.state.myId);
		}, timeout);
	},

	setLobbyState(players) {
		this.clearTreasure();
		this.hideResetButton();
		this.showStartButton();
		this.mapPicker.showMapPickerButton();
		const hint = players.length > 0 ? 'Press Start to begin!' : 'Join the game to start!';
		this.setBanner(hint, true, true);
	},

	setPlayingState(treasure, roundEndsAt) {
		this.mapPicker.hideMapPickerButton();
		this.showResetButton();
		this.hideStartButton();
		this.setBanner('Find the treasure NOW!', true);
		this.placeTreasure(treasure);
		this.startTimer(roundEndsAt);
	},

	setRoundOverState(players, winnerSocketId) {
		this.mapPicker.hideMapPickerButton();
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
		this.mapPicker.hideMapPickerButton();
		this.clearTreasure();
		this.hideResetButton();
		this.showStartButton();
		this.mapPicker.showMapPickerButton();
		const sorted = [...players].sort((a, b) => b.score - a.score);
		const winner = sorted[0];
		const isSinglePlayer = players.length === 1;
		const isTie = sorted.length > 1 && sorted[0].score === sorted[1].score;

		if (isSinglePlayer) {
			this.setBanner(`<span class="text-size-large">Game Over</span><br />Final Score: ${winner.score}`, true, true);
		} else if (isTie) {
			this.setBanner(`<span class="text-size-large">Game Over</span><br />🤝 It's a Tie!`, true, true);
		} else {
			const medal = winner.id === this.state.myId ? '👑' : '🏆';
			this.setBanner(`<span class="text-size-large">Game Over<br />${medal}</span><br />${this.escapeHtml(winner.name)} wins!`, true, true);
		}
	},

	addEventListeners() {
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
