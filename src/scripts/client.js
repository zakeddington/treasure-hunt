
import { PlayerNameManager } from './PlayerNameManager.js';
import { Scoreboard } from './Scoreboard.js';
import { MapPicker } from './MapPicker.js';
import { Banner } from './Banner.js';

const ClientApp = {
	socket: io(),

	init() {
		this.initElements();
		this.initComponents();
		this.addEventListeners();
		this.setupSocket();
	},

	initElements() {

		this.config = {
			animSpeedTreasure: 1000, // ms
		};

		this.classes = {
			hidden: 'hidden',
			treasure: 'treasure',
		};

		this.selectors = {
			curPlayerScore: '.scoreboard--item.current-player .scoreboard--item-score',
		};

		this.el = {
			startBtn: document.getElementById('startBtn'),
			resetBtn: document.getElementById('resetBtn'),
			scoreBoard: document.getElementById('scoreboard'),
			gameBoard: document.getElementById('gameBoard'),
			roundText: document.getElementById('roundText'),
			maxRoundsText: document.getElementById('maxRoundsText'),
			timer: document.querySelector('.game-board--round-timer'),
		};

		this.state = {
			myId: null,
			currentTreasureId: null,
			timerIntervalId: null,
		};

		this.components = {
			playerNameManager: null,
			scoreboard: null,
			mapPicker: null,
			banner: null,
		};
	},

	initComponents() {
		this.components.playerNameManager = new PlayerNameManager({
			socket: this.socket,
		});

		this.components.scoreboard = new Scoreboard(this.el.scoreBoard, {
			animSpeedTreasure: this.config.animSpeedTreasure,
			playerNameManager: this.components.playerNameManager,
		});

		this.components.mapPicker = new MapPicker({
			socket: this.socket,
		});

		this.components.banner = new Banner();
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
		this.components.mapPicker.setMap(s.selectedMap);
		this.components.mapPicker.handleStateUpdate(s.maps, s.selectedMap);

		this.updateRoundDisplay(s.round, s.maxRounds);
		this.components.scoreboard.render(s.players, s.winnerSocketId, s.phase, this.state.myId);

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

	setLobbyState(players) {
		this.clearTreasure();
		this.hideResetButton();
		this.showStartButton();
		this.components.mapPicker.showMapPickerButton();
		this.components.banner.showLobby(players.length > 0);
	},

	setPlayingState(treasure, roundEndsAt) {
		this.components.mapPicker.hideMapPickerButton();
		this.showResetButton();
		this.hideStartButton();
		this.components.banner.showPlaying();
		this.placeTreasure(treasure);
		this.startTimer(roundEndsAt);
	},

	setRoundOverState(players, winnerSocketId) {
		this.components.mapPicker.hideMapPickerButton();
		this.clearTreasure();
		const isSinglePlayer = players.length === 1;
		const winner = winnerSocketId ? players.find(p => p.id === winnerSocketId) : null;
		this.components.banner.showRoundOver({
			isSinglePlayer,
			hasWinner: Boolean(winnerSocketId),
			winnerName: winner ? winner.name : null,
		});
	},

	setEndedState(players) {
		this.components.mapPicker.hideMapPickerButton();
		this.clearTreasure();
		this.hideResetButton();
		this.showStartButton();
		this.components.mapPicker.showMapPickerButton();
		const sorted = [...players].sort((a, b) => b.score - a.score);
		const winner = sorted[0];
		const isSinglePlayer = players.length === 1;
		const isTie = sorted.length > 1 && sorted[0].score === sorted[1].score;

		this.components.banner.showEnded({
			isSinglePlayer,
			isTie,
			isWinner: winner?.id === this.state.myId,
			winnerName: winner?.name,
			winnerScore: winner?.score,
		});
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

};

ClientApp.init();
