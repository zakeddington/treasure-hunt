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

		const finishEdit = () => {
			const newName = input.value.trim() || this.defaultName;
			this.currentName = newName;
			localStorage.setItem(this.localStorageKey, newName);

			const newSpan = document.createElement('span');
			newSpan.textContent = newName;
			newSpan.className = 'scoreboard--item-name';
			input.replaceWith(newSpan);

			this.editingElement = null;
			this.joinGame(); // Update server with new name
		};

		input.addEventListener('blur', finishEdit);
		input.addEventListener('keydown', (e) => {
			if (e.key === 'Enter') finishEdit();
			if (e.key === 'Escape') {
				const newSpan = document.createElement('span');
				newSpan.textContent = currentText;
				newSpan.className = 'scoreboard--item-name';
				input.replaceWith(newSpan);
				this.editingElement = null;
			}
		});
	}
}
