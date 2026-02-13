import { ICON_MAP, LOCAL_STORAGE_SAVED_NAME } from '../config/appConfig.js';
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
		this.state = {
			players: [],
			treasureType: null,
			myId: null,
			isInitialized: false,
		};
	}

	render(players, winnerSocketId, phase, myId, treasureType) {
		console.log('render');
		let timeout = 0;

		// prevent anim from being overridden by other state updates
		if (phase === 'roundOver') {
			timeout = this.config.animSpeedTreasure;
		} else if (phase === 'ended') {
			timeout = this.config.animSpeedTreasure + this.config.animSpeedScore;
		}

		const iconSrc = ICON_MAP.find((t) => t.key === treasureType)?.icon;

		// Save old state before updating
		const oldPlayers = this.state.players;
		const oldTreasureType = this.state.treasureType;
		const oldMyId = this.state.myId;
		const wasInitialized = this.state.isInitialized;

		// Update state immediately for next render
		this.state.players = [...players];
		this.state.treasureType = treasureType;
		this.state.myId = myId;
		this.state.isInitialized = true;

		setTimeout(() => {
			// Full rebuild only on first render
			if (!wasInitialized) {
				this.rebuild(players, myId, iconSrc);
			} else {
				// Surgical updates for subsequent renders
				this.updateTreasureIcon(iconSrc, oldTreasureType);
				this.removeLeftPlayers(players, oldPlayers);
				this.addJoinedPlayers(players, oldPlayers);
				this.updateCurrentPlayerClass(myId, oldMyId);
				this.updateScores(players, oldPlayers);
				this.updatePlayerNames(players, oldPlayers);
			}

			// Apply win animation if needed
			if (winnerSocketId) {
				this.applyWinAnimation(winnerSocketId);
			}

			// Enable click-to-edit on current player's name
			this.playerNameManager.enableScoreboardEditing(this.el.scoreboard, myId);
		}, timeout);
	}

	updateTreasureIcon(iconSrc, oldTreasureType) {
		// Only update icons if treasure type changed
		if (this.state.treasureType === oldTreasureType || !iconSrc) return;

		const icons = this.el.scoreboard.querySelectorAll(`img.${this.classes.scoreboardScoreIcon}`);
		for (const img of icons) {
			img.src = iconSrc;
			console.log('updateTreasureIcon', iconSrc);
		}
	}

	rebuild(players, myId, iconSrc) {
		console.log('rebuild');
		// Full rebuild of the scoreboard (only called on first render)
		this.el.scoreboard.innerHTML = '';
		for (const p of players) {
			const li = document.createElement('li');
			li.className = this.classes.scoreboardItem + (p.id === myId ? ` ${this.classes.currentPlayer}` : '');
			li.setAttribute('data-player-id', p.id);
			li.innerHTML = `
				<span class="${this.classes.scoreboardName}">${escapeHtml(p.name)}</span>
				<span class="${this.classes.scoreboardScore}">
					<img src="${iconSrc}" alt="Treasure icon" class="${this.classes.scoreboardScoreIcon}" />
					<span class="${this.classes.scoreboardScorePts}">${p.score}</span>
				</span>
			`;
			this.el.scoreboard.appendChild(li);
		}
	}

	removeLeftPlayers(players, oldPlayers) {
		// Remove players who have left the game
		const leftPlayerIds = oldPlayers
			.map((p) => p.id)
			.filter((id) => !players.some((p) => p.id === id));

		for (const id of leftPlayerIds) {
			const li = this.el.scoreboard.querySelector(`[data-player-id="${id}"]`);
			if (li) li.remove();
			console.log('removeLeftPlayers', id);
		}
	}

	addJoinedPlayers(players, oldPlayers) {
		// Find players that are in new players but not in oldPlayers
		const addedPlayers = players.filter((p) => !oldPlayers.some((op) => op.id === p.id));

		const iconSrc = ICON_MAP.find((t) => t.key === this.state.treasureType)?.icon;

		for (const p of addedPlayers) {
			// Use saved name from localStorage for current player
			const savedName = localStorage.getItem(LOCAL_STORAGE_SAVED_NAME);
			console.log('savedName', savedName);
			const displayName = (p.id === this.state.myId) ? (savedName || p.name) : p.name;
			const li = document.createElement('li');
			li.className = this.classes.scoreboardItem + (p.id === this.state.myId ? ` ${this.classes.currentPlayer}` : '');
			li.setAttribute('data-player-id', p.id);
			li.innerHTML = `
				<span class="${this.classes.scoreboardName}">${escapeHtml(displayName)}</span>
				<span class="${this.classes.scoreboardScore}">
					<img src="${iconSrc}" alt="Treasure icon" class="${this.classes.scoreboardScoreIcon}" />
					<span class="${this.classes.scoreboardScorePts}">${p.score}</span>
				</span>
			`;
			this.el.scoreboard.appendChild(li);
			console.log('addJoinedPlayers', displayName);
		}
	}

	updateCurrentPlayerClass(myId, oldMyId) {
		// Update current player highlighting if the current player changed
		if (myId === oldMyId) return;

		// Remove old current-player class
		if (oldMyId) {
			const oldLi = this.el.scoreboard.querySelector(`[data-player-id="${oldMyId}"]`);
			if (oldLi) oldLi.classList.remove(this.classes.currentPlayer);
		}

		// Add current-player class to new current player
		if (myId) {
			console.log('updateCurrentPlayerClass', myId);
			const newLi = this.el.scoreboard.querySelector(`[data-player-id="${myId}"]`);
			if (newLi) newLi.classList.add(this.classes.currentPlayer);
		}
	}

	updateScores(players, oldPlayers) {
		for (const p of players) {
			const oldPlayer = oldPlayers.find((op) => op.id === p.id);
			if (!oldPlayer) continue;

			const li = this.el.scoreboard.querySelector(`[data-player-id="${p.id}"]`);
			if (!li) continue;

			// Update score only if it changed
			if (p.score !== oldPlayer.score) {
			console.log('updateScores', p.score, oldPlayer.score);
				const scoreSpan = li.querySelector(`span.${this.classes.scoreboardScorePts}`);
				if (scoreSpan) {
					scoreSpan.textContent = String(p.score);
				}
			}
		}
	}

	updatePlayerNames(players, oldPlayers) {
		for (const p of players) {
			const oldPlayer = oldPlayers.find((op) => op.id === p.id);
			if (!oldPlayer) continue;

			const li = this.el.scoreboard.querySelector(`[data-player-id="${p.id}"]`);
			if (!li) continue;

			// Update name only if it changed
			if (p.name !== oldPlayer.name) {
			console.log('updatePlayerNames', p.name, oldPlayer.name);
				const nameSpan = li.querySelector(`span.${this.classes.scoreboardName}`);
				if (nameSpan) {
					nameSpan.textContent = p.name;
				}
			}
		}
	}

	applyWinAnimation(winnerSocketId) {
		const winnerLi = this.el.scoreboard.querySelector(`[data-player-id="${winnerSocketId}"]`);
		if (!winnerLi || winnerLi.classList.contains(this.classes.animScore)) return;
		console.log('applyWinAnimation', winnerSocketId);

		winnerLi.classList.add(this.classes.animScore);
		setTimeout(() => winnerLi.classList.remove(this.classes.animScore), this.config.animSpeedScore);
	}

}
