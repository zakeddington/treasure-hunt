
import { PlayerNameManager } from './components/PlayerNameManager.js';
import { Scoreboard } from './components/Scoreboard.js';
import { SettingsDrawer } from './components/SettingsDrawer.js';
import { Banner } from './components/Banner.js';
import { Gameboard } from './components/Gameboard.js';
import { StartResetControls } from './components/StartResetControls.js';

const ClientApp = {
	socket: io(),

	init() {
		this.initElements();
		this.initComponents();
		this.setupSocket();
	},

	initElements() {

		this.config = {
			animSpeedTreasure: 1000, // ms
		};

		this.el = {
			scoreBoard: document.getElementById('scoreboard'),
			gameBoard: document.getElementById('gameBoard'),
		};

		this.state = {
			myId: null,
			previousPhase: null,
		};

		this.components = {
			playerNameManager: null,
			scoreboard: null,
			settingsDrawer: null,
			banner: null,
			gameboard: null,
			controls: null,
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

		this.components.settingsDrawer = new SettingsDrawer({
			socket: this.socket,
		});

		this.components.banner = new Banner();

		this.components.gameboard = new Gameboard(this.el.gameBoard, {
			socket: this.socket,
			animSpeedTreasure: this.config.animSpeedTreasure,
			elScoreBoard: this.el.scoreBoard,
			settingsDrawer: this.components.settingsDrawer,
		});

		this.components.controls = new StartResetControls({
			socket: this.socket,
		});
	},

	setupSocket() {
		this.socket.on('connect', () => {
			this.state.myId = this.socket.id;
		});

		this.socket.on('state', (s) => this.handleStateUpdate(s));
	},


	handleStateUpdate(s) {
		const isPhaseTransition = s.phase !== this.state.previousPhase;
		this.state.previousPhase = s.phase;

		this.components.settingsDrawer.setMap(s.selectedMap);
		this.components.settingsDrawer.handleStateUpdate(
			s.maps,
			s.selectedMap,
			s.maxRounds,
			s.roundLength,
			s.treasureType,
			s.phase
		);

		this.components.gameboard.setRoundDisplay(s.round, s.maxRounds);
		this.components.scoreboard.render(s.players, s.winnerSocketId, s.phase, this.state.myId, s.treasureType);

		// Update phase-specific UI
		if (s.phase === 'lobby') {
			this.setLobbyState(s.players);
		} else if (s.phase === 'playing') {
			this.setPlayingState(s.treasure, s.roundEndsAt);
		} else if (s.phase === 'roundOver') {
			this.setRoundOverState(s.players, s.winnerSocketId);
		} else if (s.phase === 'ended') {
			this.setEndedState(s.players, isPhaseTransition);
		}
	},

	setLobbyState(players) {
		this.components.gameboard.clearTreasure();
		this.components.controls.showStart();
		this.components.settingsDrawer.showSettingsButton();
		this.components.banner.showLobby(players.length > 0);
	},

	setPlayingState(treasureObj, roundEndsAt) {
		this.components.settingsDrawer.hideSettingsButton();
		this.components.settingsDrawer.closeDrawer();
		this.components.controls.showReset();
		this.components.banner.showPlaying();
		this.components.gameboard.initializeAudioContext();
		this.components.gameboard.placeTreasure(treasureObj);
		this.components.gameboard.startTimer(roundEndsAt);
	},

	setRoundOverState(players, winnerSocketId) {
		this.components.settingsDrawer.hideSettingsButton();
		this.components.gameboard.clearTreasure();
		this.components.controls.showReset();
		const isSinglePlayer = players.length === 1;
		const winner = winnerSocketId ? players.find(p => p.id === winnerSocketId) : null;
		this.components.banner.showRoundOver({
			isSinglePlayer,
			hasWinner: Boolean(winnerSocketId),
			winnerName: winner ? winner.name : null,
		});
	},

	setEndedState(players, isTransition) {
		this.components.settingsDrawer.hideSettingsButton();
		this.components.gameboard.clearTreasure();
		if (isTransition) {
			this.components.gameboard.playGameOver();
		}
		this.components.controls.showStart();
		this.components.settingsDrawer.showSettingsButton();
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

};

ClientApp.init();
