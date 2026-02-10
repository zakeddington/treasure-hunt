export class Gameboard {
	constructor(elGameboard, config) {
		this.socket = config.socket;
		this.settingsDrawer = config.settingsDrawer;

		this.config = {
			animSpeedTreasure: config.animSpeedTreasure,
			elScoreBoard: config.elScoreBoard,
			volume: 0.5,
			audioBuzzerSrc: '/assets/audio/round-over.mp3',
			audioGameOverSrc: '/assets/audio/game-over.mp3',
			audioTreasureFoundSrc: '/assets/audio/treasure-found.mp3',
		};

		this.classes = {
			treasure: 'treasure',
			treasureClone: 'treasure-clone',
			hidden: 'hidden',
		};

		this.selectors = {
			curPlayerScore: '.scoreboard--item.current-player .scoreboard--item-score',
		};

		this.el = {
			gameBoard: elGameboard,
			scoreBoard: this.config.elScoreBoard,
			timer: document.querySelector('.game-board--round-timer'),
			roundText: document.getElementById('roundText'),
			maxRoundsText: document.getElementById('maxRoundsText'),
		};

		this.state = {
			currentTreasureId: null,
			timerIntervalId: null,
			audioCtx: null,
			lastBeepRemaining: null,
			buzzerPlayed: false,
			buzzerAudio: null,
			gameOverAudio: null,
			treaureFoundAudio: null,
			isFinalRound: false,
		};
	}

	setRoundDisplay(round, maxRounds) {
		this.el.roundText.textContent = String(round);
		this.el.maxRoundsText.textContent = String(maxRounds);
		this.state.isFinalRound = round === maxRounds;
	}

	startTimer(roundEndsAt) {
		this.stopTimer();
		this.el.timer.classList.remove(this.classes.hidden);
		this.ensureAudioContext();
		this.state.lastBeepRemaining = null;
		this.state.buzzerPlayed = false;

		// Update immediately on start
		this.updateTimerDisplay(roundEndsAt);

		// Update every second
		this.state.timerIntervalId = setInterval(() => {
			this.updateTimerDisplay(roundEndsAt);
		}, 1000);
	}

	updateTimerDisplay(roundEndsAt) {
		const now = Date.now();
		const remaining = Math.max(0, Math.ceil((roundEndsAt - now) / 1000));
		this.el.timer.textContent = String(remaining).padStart(2, '0');

		if (remaining > 0 && remaining <= 10 && this.state.lastBeepRemaining !== remaining) {
			this.state.lastBeepRemaining = remaining;
			this.playBeep(remaining <= 3);
		}

		if (remaining === 0 && !this.state.buzzerPlayed && !this.state.isFinalRound) {
			this.state.buzzerPlayed = true;
			this.playBuzzer();
		}
	}

	stopTimer() {
		if (this.state.timerIntervalId) {
			clearInterval(this.state.timerIntervalId);
			this.state.timerIntervalId = null;
		}

		this.el.timer.textContent = '';
		this.el.timer.classList.add(this.classes.hidden);
		this.state.lastBeepRemaining = null;
		this.state.buzzerPlayed = false;
	}

	ensureAudioContext() {
		if (!this.state.audioCtx) {
			const AudioCtx = window.AudioContext || window.webkitAudioContext;
			if (AudioCtx) this.state.audioCtx = new AudioCtx();
		}
		if (this.state.audioCtx && this.state.audioCtx.state === 'suspended') {
			this.state.audioCtx.resume().catch(() => {
				// ignore
			});
		}
	}

	playBeep(isUrgent) {
		if (this.settingsDrawer.isAudioMuted() || !this.state.audioCtx) return;
		const ctx = this.state.audioCtx;
		const osc = ctx.createOscillator();
		const gain = ctx.createGain();
		const now = ctx.currentTime;

		osc.type = 'sine';
		osc.frequency.setValueAtTime(isUrgent ? 880 : 660, now);
		gain.gain.setValueAtTime(0.0001, now);
		gain.gain.exponentialRampToValueAtTime(this.config.volume, now + 0.01);
		gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);

		osc.connect(gain);
		gain.connect(ctx.destination);
		osc.start(now);
		osc.stop(now + 0.18);
	}

	playBuzzer() {
		if (this.settingsDrawer.isAudioMuted()) return;
		if (!this.state.buzzerAudio) {
			this.state.buzzerAudio = new Audio(this.config.audioBuzzerSrc);
			this.state.buzzerAudio.preload = 'auto';
			this.state.buzzerAudio.volume = this.config.volume;
		}

		this.state.buzzerAudio.currentTime = 0;
		this.state.buzzerAudio.play().catch(() => {
			// ignore autoplay restrictions
		});
	}

	playGameOver() {
		if (this.settingsDrawer.isAudioMuted()) return;
		if (!this.state.gameOverAudio) {
			this.state.gameOverAudio = new Audio(this.config.audioGameOverSrc);
			this.state.gameOverAudio.preload = 'auto';
			this.state.gameOverAudio.volume = this.config.volume;
		}

		this.state.gameOverAudio.currentTime = 0;
		this.state.gameOverAudio.play().catch(() => {
			// ignore autoplay restrictions
		});
	}

	playTreasureFound() {
		if (this.settingsDrawer.isAudioMuted()) return;
		if (!this.state.treasureFoundAudio) {
			this.state.treasureFoundAudio = new Audio(this.config.audioTreasureFoundSrc);
			this.state.treasureFoundAudio.preload = 'auto';
			this.state.treasureFoundAudio.volume = this.config.volume;
		}

		this.state.treasureFoundAudio.currentTime = 0;
		this.state.treasureFoundAudio.play().catch(() => {
			// ignore autoplay restrictions
		});
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
