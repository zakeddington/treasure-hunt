export class Gameboard {
	constructor(elGameboard, config) {
		this.socket = config.socket;

		this.config = {
			animSpeedTreasure: config.animSpeedTreasure,
			elScoreBoard: config.elScoreBoard,
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
		};
	}

	setRoundDisplay(round, maxRounds) {
		this.el.roundText.textContent = String(round);
		this.el.maxRoundsText.textContent = String(maxRounds);
	}

	startTimer(roundEndsAt) {
		this.stopTimer();
		this.el.timer.classList.remove(this.classes.hidden);

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
	}

	stopTimer() {
		if (this.state.timerIntervalId) {
			clearInterval(this.state.timerIntervalId);
			this.state.timerIntervalId = null;
		}

		this.el.timer.textContent = '';
		this.el.timer.classList.add(this.classes.hidden);
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
		treasureEl.textContent = '💎';

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
