import { LOCAL_STORAGE_SAVED_NAME, LOCAL_STORAGE_SAVED_SCORE } from '../config/appConfig.js';

export class PlayerNameManager {
	constructor(config) {
		this.socket = config.socket;

		this.config = {
			defaultName: 'Player Name',
			nameMaxLength: 32,
		};

		this.classes = {
			scoreboardItem: 'scoreboard--item',
			currentPlayer: 'current-player',
			scoreboardName: 'scoreboard--item-name',
			scoreboardNameEditable: 'scoreboard--item-name-editable',
			animScore: 'anim-score',
		};

		this.el = {
			nameSpan: null,
		};

		this.state = {
			currentName: null,
			currentScore: 0,
		};

		this.init();
	}

	init() {
		const saved = localStorage.getItem(LOCAL_STORAGE_SAVED_NAME);
		this.state.currentName = saved && saved.trim() ? saved : this.config.defaultName;

		const savedScore = localStorage.getItem(LOCAL_STORAGE_SAVED_SCORE);
		this.state.currentScore = savedScore ? parseInt(savedScore, 10) : 0;
		if (isNaN(this.state.currentScore)) this.state.currentScore = 0;

		this.joinGame();
	}

	joinGame() {
		this.socket.emit('join', {
			name: this.state.currentName,
			score: this.state.currentScore
		});
	}

	// Make scoreboard name editable when user clicks it
	enableScoreboardEditing(elScoreboard, playerId) {
		if (playerId !== this.socket.id) return; // Only edit current player

		const scoreboardItems = elScoreboard.querySelectorAll('.' + this.classes.scoreboardItem);
		scoreboardItems.forEach((item) => {
			if (!item.classList.contains(this.classes.currentPlayer)) return;

			const nameSpan = item.querySelector('.' + this.classes.scoreboardName);
			if (!nameSpan) return;
			nameSpan.addEventListener('click', () => this.startEditMode(nameSpan));
		});
	}

	startEditMode(nameSpan) {
		if (this.el.nameSpan) return; // Prevent multiple edits

		this.el.nameSpan = nameSpan;
		const currentText = nameSpan.textContent;

		const input = document.createElement('input');
		input.type = 'text';
		input.value = currentText;
		input.className = this.classes.scoreboardNameEditable;
		input.maxLength = this.config.nameMaxLength;

		nameSpan.replaceWith(input);
		input.focus();
		input.select();

		let done = false;
		const finalize = (newValue, shouldSave) => {
			if (done) return;
			done = true;
			input.removeEventListener('blur', onBlur);
			const newSpan = document.createElement('span');
			newSpan.textContent = newValue;
			newSpan.className = this.classes.scoreboardName;
			newSpan.addEventListener('click', () => this.startEditMode(newSpan));
			input.replaceWith(newSpan);
			this.el.nameSpan = null;
			if (shouldSave) {
				this.state.currentName = newValue;
				localStorage.setItem(LOCAL_STORAGE_SAVED_NAME, newValue);
				this.socket.emit('join', {
					name: newValue,
					score: this.state.currentScore
				});
			}
		};

		const onBlur = () => {
			const newName = input.value.trim() || this.config.defaultName;
			finalize(newName, true);
		};

		input.addEventListener('blur', onBlur);
		input.addEventListener('keydown', (e) => {
			if (e.key === 'Enter') {
				const newName = input.value.trim() || this.config.defaultName;
				finalize(newName, true);
			}
			if (e.key === 'Escape') {
				finalize(currentText, false);
			}
		});
	}

	saveScore(score) {
		this.state.currentScore = score;
		localStorage.setItem(LOCAL_STORAGE_SAVED_SCORE, String(score));
	}
}
