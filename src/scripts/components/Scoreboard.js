import { ICON_MAP } from '../config/appConfig.js';
import { Player } from './Player.js';

export class Scoreboard {
	constructor(elScoreboard, config) {
		this.socket = config.socket;

		this.config = {
			animSpeedTreasure: config.animSpeedTreasure,
			animSpeedScore: 900, // ms
		};

		this.el = {
			scoreboard: elScoreboard,
		};

		this.state = {
			players: new Map(),
			treasureType: null,
			myId: null,
			isInitialized: false,
		};
	}

	render(players, winnerSocketId, phase, myId, treasureType) {
		let timeout = 0;

		// prevent anim from being overridden by other state updates
		if (phase === 'roundOver') {
			timeout = this.config.animSpeedTreasure;
		} else if (phase === 'ended') {
			timeout = this.config.animSpeedTreasure + this.config.animSpeedScore;
		}

		const iconSrc = ICON_MAP.find((t) => t.key === treasureType)?.icon;

		const oldTreasureType = this.state.treasureType;
		const oldMyId = this.state.myId;
		const wasInitialized = this.state.isInitialized;

		this.state.treasureType = treasureType;
		this.state.myId = myId;

		setTimeout(() => {
			if (!wasInitialized) {
				this.rebuild(players, myId, iconSrc);
				this.state.isInitialized = true;
			} else {
				this.updateTreasureIcon(iconSrc, oldTreasureType);
				this.removeLeftPlayers(players);
				this.addJoinedPlayers(players, iconSrc, myId);
				this.updateCurrentPlayerClass(myId, oldMyId);
				this.updateScores(players);
				this.updatePlayerNames(players);
			}

			if (winnerSocketId) {
				this.applyWinAnimation(winnerSocketId);
			}
		}, timeout);
	}

	updateTreasureIcon(iconSrc, oldTreasureType) {
		if (this.state.treasureType === oldTreasureType || !iconSrc) return;
		for (const player of this.state.players.values()) {
			player.updateTreasureIcon(iconSrc);
		}
	}

	rebuild(players, myId, iconSrc) {
		this.el.scoreboard.innerHTML = '';
		this.state.players.clear();

		for (const p of players) {
			const playerComponent = this.createPlayer(p, iconSrc, p.id === myId);
			this.state.players.set(p.id, playerComponent);
			this.el.scoreboard.appendChild(playerComponent.getElement());
		}
	}

	createPlayer(player, iconSrc, isCurrent) {
		return new Player(player, {
			iconSrc,
			isCurrent,
			socket: this.socket,
		});
	}

	removeLeftPlayers(players) {
		const ids = new Set(players.map((p) => p.id));
		for (const [id, playerComponent] of this.state.players.entries()) {
			if (ids.has(id)) continue;
			const el = playerComponent.getElement();
			if (el && el.parentNode) el.parentNode.removeChild(el);
			this.state.players.delete(id);
		}
	}

	addJoinedPlayers(players, iconSrc, myId) {
		for (const p of players) {
			if (this.state.players.has(p.id)) continue;
			const playerComponent = this.createPlayer(p, iconSrc, p.id === myId);
			this.state.players.set(p.id, playerComponent);
			this.el.scoreboard.appendChild(playerComponent.getElement());
		}
	}

	updateCurrentPlayerClass(myId, oldMyId) {
		if (myId === oldMyId) return;
		if (oldMyId && this.state.players.has(oldMyId)) {
			this.state.players.get(oldMyId).setCurrent(false);
		}
		if (myId && this.state.players.has(myId)) {
			this.state.players.get(myId).setCurrent(true);
		}
	}

	updateScores(players) {
		for (const p of players) {
			const playerComponent = this.state.players.get(p.id);
			if (!playerComponent) continue;
			playerComponent.updateScore(p.score);
		}
	}

	updatePlayerNames(players) {
		for (const p of players) {
			const playerComponent = this.state.players.get(p.id);
			if (!playerComponent) continue;
			playerComponent.updateName(p.name);
		}
	}

	applyWinAnimation(winnerSocketId) {
		const playerComponent = this.state.players.get(winnerSocketId);
		if (!playerComponent) return;
		playerComponent.playWinAnimation(this.config.animSpeedScore);
	}
}
