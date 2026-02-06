export class PlayerNameManager {
	constructor(config) {
		this.socket = config.socket;
		this.localStorageKey = 'ttr_playerName';
		this.defaultName = 'Player Name';
		this.currentName = null;
		this.editingElement = null;

		this.init();
	}

	init() {
		const saved = localStorage.getItem(this.localStorageKey);
		this.currentName = saved && saved.trim() ? saved : this.defaultName;
		this.joinGame();
	}

	joinGame() {
		this.socket.emit('join', this.currentName);
	}

	// Make scoreboard name editable when user clicks it
	enableScoreboardEditing(scoreboardEl, playerId) {
		if (playerId !== this.socket.id) return; // Only edit current player

		const scoreboardItems = scoreboardEl.querySelectorAll('.scoreboard--item');
		scoreboardItems.forEach((item) => {
			if (!item.classList.contains('current-player')) return;

			const nameSpan = item.querySelector('.scoreboard--item-name');
			if (!nameSpan) return;
			nameSpan.addEventListener('click', () => this.startEditMode(nameSpan));
		});
	}

	startEditMode(nameSpan) {
		if (this.editingElement) return; // Prevent multiple edits

		this.editingElement = nameSpan;
		const currentText = nameSpan.textContent;

		const input = document.createElement('input');
		input.type = 'text';
		input.value = currentText;
		input.className = 'scoreboard--item-name-editable';
		input.maxLength = '16';

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
			newSpan.className = 'scoreboard--item-name';
			newSpan.addEventListener('click', () => this.startEditMode(newSpan));
			input.replaceWith(newSpan);
			this.editingElement = null;
			if (shouldSave) {
				this.currentName = newValue;
				localStorage.setItem(this.localStorageKey, newValue);
				this.joinGame(); // Update server with new name
			}
		};

		const onBlur = () => {
			const newName = input.value.trim() || this.defaultName;
			finalize(newName, true);
		};

		input.addEventListener('blur', onBlur);
		input.addEventListener('keydown', (e) => {
			if (e.key === 'Enter') {
				const newName = input.value.trim() || this.defaultName;
				finalize(newName, true);
			}
			if (e.key === 'Escape') {
				finalize(currentText, false);
			}
		});
	}
}
