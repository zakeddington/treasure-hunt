import { escapeHtml } from '../utils/utils.js';

export class Scoreboard {
	constructor(elScoreboard, config) {
		this.config = {
			animSpeedTreasure: config.animSpeedTreasure,
			animSpeedScore: 900, // ms
		}

		this.classes = {
			scoreboardItem: 'scoreboard--item',
			currentPlayer: 'current-player',
			scoreboardName: 'scoreboard--item-name',
			scoreboardScore: 'scoreboard--item-score',
			scoreboardScoreIcon: 'scoreboard--item-score-icon',
			scoreboardScorePts: 'scoreboard--item-score-pts',
			animScore: 'anim-score',
		};

		this.el = {
			scoreboard: elScoreboard,
		}

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
			this.el.scoreboard.innerHTML = '';
			for (const p of [...players]) {
				const li = document.createElement('li');
				li.className = this.classes.scoreboardItem + (p.id === myId ? ` ${this.classes.currentPlayer}` : '');
				li.innerHTML = `
					<span class="${this.classes.scoreboardName}">${escapeHtml(p.name)}</span>
					<span class="${this.classes.scoreboardScore}">
						<img src="assets/images/icons/icon-gem.svg" alt="Treasure icon" class="${this.classes.scoreboardScoreIcon}" />
						<span class="${this.classes.scoreboardScorePts}">${p.score}</span>
					</span>
				`;
				if (winnerSocketId && p.id === winnerSocketId) {
					li.classList.add(this.classes.animScore);
					// remove class after animation completes
					setTimeout(() => li.classList.remove(this.classes.animScore), this.config.animSpeedScore);
				}
				this.el.scoreboard.appendChild(li);
			}
			// Enable click-to-edit on current player's name
			this.playerNameManager.enableScoreboardEditing(this.el.scoreboard, myId);
		}, timeout);
	}

}
