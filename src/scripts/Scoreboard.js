import { escapeHtml } from './utils.js';

export class Scoreboard {
	constructor(config) {
		this.el = config.el;
		this.classes = config.classes;
		this.config = config.config;
		this.playerNameManager = config.playerNameManager;
	}

	render(players, winnerSocketId, phase, myId) {
		let timeout = 0;

		// prevent anim from being overridden by other state updates
		if (phase === 'roundOver') {
			timeout = this.config.animSpeedTreasure;
		} else if (phase === 'ended') {
			timeout = this.config.animSpeedTreasure + this.config.animSpeedScore;
		}

		setTimeout(() => {
			this.el.innerHTML = '';
			for (const p of [...players]) {
				const li = document.createElement('li');
				li.className = this.classes.scoreboardItem + (p.id === myId ? ` ${this.classes.currentPlayer}` : '');
				li.innerHTML = `<span class="scoreboard--item-name">${escapeHtml(p.name)}</span><span class="scoreboard--item-score">💎 ${p.score}</span>`;
				if (winnerSocketId && p.id === winnerSocketId) {
					li.classList.add('anim-score');
					// remove class after animation completes
					setTimeout(() => li.classList.remove('anim-score'), this.config.animSpeedScore);
				}
				this.el.appendChild(li);
			}
			// Enable click-to-edit on current player's name
			this.playerNameManager.enableScoreboardEditing(this.el, myId);
		}, timeout);
	}

}
