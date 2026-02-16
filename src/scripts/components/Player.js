import { LOCAL_STORAGE_SAVED_NAME, LOCAL_STORAGE_SAVED_SCORE } from '../config/appConfig.js';

export class Player {
	constructor(player, config) {
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
			scoreboardScore: 'scoreboard--item-score',
			scoreboardScoreIcon: 'scoreboard--item-score-icon',
			scoreboardScorePts: 'scoreboard--item-score-pts',
			animScore: 'anim-score',
		};

		this.el = {
			root: null,
			nameSpan: null,
			scoreSpan: null,
			iconImg: null,
		};

		this.state = {
			id: player.id,
			name: player.name,
			score: player.score,
			isCurrent: Boolean(config.isCurrent),
			isEditing: false,
			hasJoined: false,
		};

		this.handleNameClick = this.handleNameClick.bind(this);

		const displayName = this.state.isCurrent ? this.getSavedName(player.name) : player.name;
		this.buildMarkup(displayName, player.score, config.iconSrc);

		if (this.state.isCurrent) {
			this.emitJoinFromStorage();
			this.enableNameEditing();
		}
	}

	getId() {
		return this.state.id;
	}

	getElement() {
		return this.el.root;
	}

	getScore() {
		return this.state.score;
	}

	buildMarkup(displayName, score, iconSrc) {
		const li = document.createElement('li');
		li.className = this.classes.scoreboardItem;
		li.setAttribute('data-player-id', this.state.id);
		if (this.state.isCurrent) {
			li.classList.add(this.classes.currentPlayer);
		}

		const nameSpan = document.createElement('span');
		nameSpan.className = this.classes.scoreboardName;
		nameSpan.textContent = displayName;

		const scoreWrap = document.createElement('span');
		scoreWrap.className = this.classes.scoreboardScore;

		const iconImg = document.createElement('img');
		iconImg.className = this.classes.scoreboardScoreIcon;
		iconImg.alt = 'Treasure icon';
		if (iconSrc) iconImg.src = iconSrc;

		const scoreSpan = document.createElement('span');
		scoreSpan.className = this.classes.scoreboardScorePts;
		scoreSpan.textContent = String(score);

		scoreWrap.appendChild(iconImg);
		scoreWrap.appendChild(scoreSpan);

		li.appendChild(nameSpan);
		li.appendChild(scoreWrap);

		this.el.root = li;
		this.el.nameSpan = nameSpan;
		this.el.scoreSpan = scoreSpan;
		this.el.iconImg = iconImg;
	}

	getSavedName(fallbackName) {
		const savedName = localStorage.getItem(LOCAL_STORAGE_SAVED_NAME);
		return savedName && savedName.trim() ? savedName : (fallbackName || this.config.defaultName);
	}

	getSavedScore() {
		const savedScore = localStorage.getItem(LOCAL_STORAGE_SAVED_SCORE);
		const parsed = savedScore ? parseInt(savedScore, 10) : 0;
		return Number.isNaN(parsed) ? 0 : parsed;
	}

	emitJoinFromStorage() {
		if (this.state.hasJoined || !this.socket) return;
		this.state.hasJoined = true;
		const name = this.getSavedName(this.state.name);
		const score = this.getSavedScore();
		this.socket.emit('join', { name, score });
	}

	emitJoin(name, score) {
		if (!this.socket) return;
		this.socket.emit('join', { name, score });
	}

	setCurrent(isCurrent) {
		if (this.state.isCurrent === isCurrent) return;
		this.state.isCurrent = isCurrent;
		if (isCurrent) {
			this.el.root.classList.add(this.classes.currentPlayer);
			this.emitJoinFromStorage();
			this.enableNameEditing();
		} else {
			this.el.root.classList.remove(this.classes.currentPlayer);
			this.disableNameEditing();
		}
	}

	updateTreasureIcon(iconSrc) {
		if (!iconSrc || !this.el.iconImg) return;
		this.el.iconImg.src = iconSrc;
	}

	updateScore(score) {
		if (this.state.score === score) return;
		this.state.score = score;
		if (this.el.scoreSpan) this.el.scoreSpan.textContent = String(score);
		if (this.state.isCurrent) {
			localStorage.setItem(LOCAL_STORAGE_SAVED_SCORE, String(score));
		}
	}

	updateName(name) {
		if (this.state.isEditing || this.state.name === name) return;
		this.state.name = name;
		if (this.el.nameSpan) this.el.nameSpan.textContent = name;
		if (this.state.isCurrent) {
			localStorage.setItem(LOCAL_STORAGE_SAVED_NAME, name);
		}
	}

	playWinAnimation(durationMs) {
		if (!this.el.root || this.el.root.classList.contains(this.classes.animScore)) return;
		this.el.root.classList.add(this.classes.animScore);
		setTimeout(() => this.el.root.classList.remove(this.classes.animScore), durationMs);
	}

	enableNameEditing() {
		if (!this.el.nameSpan) return;
		this.el.nameSpan.addEventListener('click', this.handleNameClick);
	}

	disableNameEditing() {
		if (!this.el.nameSpan) return;
		this.el.nameSpan.removeEventListener('click', this.handleNameClick);
	}

	handleNameClick() {
		if (!this.state.isCurrent || this.state.isEditing) return;
		this.startEditMode();
	}

	startEditMode() {
		if (!this.el.nameSpan || this.state.isEditing) return;
		this.state.isEditing = true;
		const currentText = this.el.nameSpan.textContent;

		const input = document.createElement('input');
		input.type = 'text';
		input.value = currentText;
		input.className = this.classes.scoreboardNameEditable;
		input.maxLength = this.config.nameMaxLength;

		this.el.nameSpan.replaceWith(input);
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
			newSpan.addEventListener('click', this.handleNameClick);
			input.replaceWith(newSpan);

			this.el.nameSpan = newSpan;
			this.state.isEditing = false;

			if (shouldSave) {
				this.state.name = newValue;
				localStorage.setItem(LOCAL_STORAGE_SAVED_NAME, newValue);
				this.emitJoin(newValue, this.state.score);
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
}
