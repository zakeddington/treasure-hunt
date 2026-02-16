export class Gameboard {
	constructor(elGameboard, config) {
		this.socket = config.socket;
		this.settingsDrawer = config.settingsDrawer;

		this.config = {
			animSpeedTreasure: config.animSpeedTreasure,
			elScoreBoard: config.elScoreBoard,
			volume: 0.4,
			audioGameOverSrc: '/assets/audio/game-over.mp3',
			audioTreasureFoundSrc: '/assets/audio/treasure-found.mp3',
			fullscreenEnterSrc: '/assets/images/icons/icon-fullscreen-enter.svg',
			fullscreenExitSrc: '/assets/images/icons/icon-fullscreen-exit.svg',
		};

		this.classes = {
			treasure: 'treasure',
			treasureClone: 'treasure-clone',
			hidden: 'hidden',
			fullscreen: 'is-fullscreen',
			noScroll: 'no-scroll',
		};

		this.selectors = {
			curPlayerScore: '.scoreboard--item.current-player .scoreboard--item-score',
		};

		this.el = {
			gameBoard: elGameboard,
			gameBoardShell: elGameboard.closest('.game-board'),
			scoreBoard: this.config.elScoreBoard,
			timer: document.querySelector('.game-board--round-timer'),
			roundText: document.getElementById('roundText'),
			maxRoundsText: document.getElementById('maxRoundsText'),
			fullscreenToggle: document.getElementById('fullscreenToggle'),
			fullscreenToggleIcon: document.getElementById('fullscreenToggleIcon'),
		};

		this.state = {
			currentTreasureId: null,
			timerTimeoutId: null,
			audioCtx: null,
			audioUnlocked: false,
			gameOverBuffer: null,
			treasureFoundBuffer: null,
			isFinalRound: false,
			serverTimeOffset: 0,
			roundEndsAt: null,
			scrollY: 0,
		};

		this.enableAudio();
		this.initFullscreenToggle();
	}

	initFullscreenToggle() {
		if (!this.el.fullscreenToggle || !this.el.gameBoardShell) return;

		this.el.fullscreenToggle.addEventListener('click', () => this.toggleFullscreen());
		document.addEventListener('keydown', (event) => {
			if (event.key !== 'Escape') return;
			if (this.isFullscreen()) this.disableFullscreen();
		});
		this.updateFullscreenButton();
	}

	isFullscreen() {
		return this.el.gameBoardShell.classList.contains(this.classes.fullscreen);
	}

	updateFullscreenButton() {
		const isFullscreen = this.isFullscreen();
		this.el.fullscreenToggle.setAttribute('aria-pressed', String(isFullscreen));
		this.el.fullscreenToggle.setAttribute('aria-label', isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen');
		this.el.fullscreenToggleIcon.src = isFullscreen ? this.config.fullscreenExitSrc : this.config.fullscreenEnterSrc;
		this.el.fullscreenToggleIcon.alt = isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen';
	}

	toggleFullscreen() {
		if (this.isFullscreen()) {
			this.disableFullscreen();
			return;
		}
		this.enableFullscreen();
	}

	enableFullscreen() {
		this.state.scrollY = window.scrollY || window.pageYOffset || 0;
		document.body.classList.add(this.classes.noScroll);
		document.body.style.top = `-${this.state.scrollY}px`;
		document.body.style.width = '100%';
		this.el.gameBoardShell.classList.add(this.classes.fullscreen);
		this.updateFullscreenButton();
	}

	disableFullscreen() {
		this.el.gameBoardShell.classList.remove(this.classes.fullscreen);
		document.body.classList.remove(this.classes.noScroll);
		document.body.style.top = '';
		document.body.style.width = '';
		window.scrollTo(0, this.state.scrollY || 0);
		this.updateFullscreenButton();
	}

	// Initialize audio from a user interaction (click/touch) to enable autoplay on iOS
	enableAudio() {
		const unlock = () => {
			this.state.audioUnlocked = true;
			this.initializeAudioContext();
		};
		document.addEventListener('pointerdown', unlock, { once: true, passive: true });
		document.addEventListener('touchstart', unlock, { once: true, passive: true });
		document.addEventListener('keydown', unlock, { once: true, passive: true });
		document.addEventListener('click', unlock, { once: true, passive: true });
	}

	setServerTimeOffset(offsetMs) {
		this.state.serverTimeOffset = Number.isFinite(offsetMs) ? offsetMs : 0;
	}

	setRoundDisplay(round, maxRounds) {
		this.el.roundText.textContent = String(round);
		this.el.maxRoundsText.textContent = String(maxRounds);
		this.state.isFinalRound = round === maxRounds;
	}

	async initializeAudioContext() {
		try {
			// Create AudioContext if needed
			if (!this.state.audioCtx) {
				const AudioCtx = window.AudioContext || window.webkitAudioContext;
				if (!AudioCtx) {
					console.warn('Web Audio API not supported');
					return;
				}
				this.state.audioCtx = new AudioCtx();
			}

			// Resume context on user gesture (required for iOS)
			if (this.state.audioCtx.state === 'suspended') {
				await this.state.audioCtx.resume();
			}

			// Load audio buffers
			await Promise.all([
				this.loadAudioBuffer(this.config.audioGameOverSrc, 'gameOverBuffer'),
				this.loadAudioBuffer(this.config.audioTreasureFoundSrc, 'treasureFoundBuffer'),
			]);
		} catch (e) {
			console.warn('Failed to initialize audio:', e);
		}
	}

	async loadAudioBuffer(url, bufferName) {
		if (this.state[bufferName]) return; // Already loaded

		try {
			const response = await fetch(url);
			const arrayBuffer = await response.arrayBuffer();
			this.state[bufferName] = await this.state.audioCtx.decodeAudioData(arrayBuffer);
		} catch (e) {
			console.warn(`Failed to load audio ${url}:`, e);
		}
	}

	startTimer(roundEndsAt) {
		this.stopTimer();
		this.el.timer.classList.remove(this.classes.hidden);
		this.state.roundEndsAt = roundEndsAt;

		// Update immediately on start
		this.updateTimerDisplay(roundEndsAt);

		// Schedule updates aligned to server time boundaries
		this.scheduleNextTick();
	}

	scheduleNextTick() {
		if (!this.state.roundEndsAt) return;
		const now = Date.now() + this.state.serverTimeOffset;
		const remainingMs = this.state.roundEndsAt - now;
		if (remainingMs <= 0) return;

		const remainder = remainingMs % 1000;
		const nextIn = remainder === 0 ? 1000 : remainder;

		this.state.timerTimeoutId = setTimeout(() => {
			this.updateTimerDisplay(this.state.roundEndsAt);
			this.scheduleNextTick();
		}, nextIn);
	}

	updateTimerDisplay(roundEndsAt) {
		const now = Date.now() + this.state.serverTimeOffset;
		const remaining = Math.max(0, Math.ceil((roundEndsAt - now) / 1000));
		this.el.timer.textContent = String(remaining).padStart(2, '0');
	}

	stopTimer() {
		if (this.state.timerTimeoutId) {
			clearTimeout(this.state.timerTimeoutId);
			this.state.timerTimeoutId = null;
		}
		this.state.roundEndsAt = null;

		this.el.timer.textContent = '';
		this.el.timer.classList.add(this.classes.hidden);
	}

	playAudioBuffer(buffer) {
		if (!this.state.audioCtx || !buffer) return;

		try {
			const source = this.state.audioCtx.createBufferSource();
			source.buffer = buffer;

			// Create gain node for volume control
			const gainNode = this.state.audioCtx.createGain();
			gainNode.gain.value = this.config.volume;

			// Connect: source -> gain -> destination
			source.connect(gainNode);
			gainNode.connect(this.state.audioCtx.destination);

			source.start(0);
		} catch (e) {
			console.warn('Audio playback failed:', e);
		}
	}

	playGameOver() {
		if (this.settingsDrawer.isAudioMuted()) return;
		if (!this.state.audioUnlocked) return;

		this.playAudioBuffer(this.state.gameOverBuffer);
	}

	playTreasureFound() {
		if (this.settingsDrawer.isAudioMuted()) return;
		if (!this.state.audioUnlocked) return;

		this.playAudioBuffer(this.state.treasureFoundBuffer);
	}

	clearTreasure() {
		const t = this.el.gameBoard.querySelector('.' + this.classes.treasure);
		if (t) t.remove();
		this.state.currentTreasureId = null;
		this.stopTimer();
	}

	placeTreasure(treasureObj) {
		this.clearTreasure();
		if (!treasureObj) return;

		this.state.currentTreasureId = treasureObj.id;

		const treasureEl = document.createElement('button');
		treasureEl.className = this.classes.treasure;
		treasureEl.type = 'button';
		treasureEl.setAttribute('aria-label', 'Treasure');
		if (treasureObj.icon && treasureObj.icon.includes('/assets/')) {
			const icon = document.createElement('img');
			icon.src = treasureObj.icon;
			icon.alt = 'Treasure';
			icon.className = 'treasure-icon';
			icon.loading = 'lazy';
			treasureEl.appendChild(icon);
		} else {
			treasureEl.textContent = treasureObj.icon;
		}

		// Compute pixel position from normalized coords
		const rect = this.el.gameBoard.getBoundingClientRect();

		treasureEl.style.left = `${treasureObj.x * rect.width}px`;
		treasureEl.style.top = `${treasureObj.y * rect.height}px`;

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
			this.playTreasureFound();
			this.socket.emit('tapTreasure', { treasureId: this.state.currentTreasureId });
		};

		treasureEl.addEventListener('click', tap, { passive: false });
		treasureEl.addEventListener('touchstart', tap, { passive: false });

		this.el.gameBoard.appendChild(treasureEl);
	}

	animateTreasureToScore(sourceEl) {
		const targetItem = this.el.scoreBoard.querySelector(this.selectors.curPlayerScore);
		if (!targetItem) return;

		const sourceRect = sourceEl.getBoundingClientRect();
		const targetRect = targetItem.getBoundingClientRect();

		const clone = sourceEl.cloneNode(true);
		clone.classList.add(this.classes.treasureClone);
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
	}
}
