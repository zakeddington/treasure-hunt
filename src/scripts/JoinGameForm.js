export class JoinGameForm {
	constructor(config) {
		this.socket = config.socket;

		this.config = {
			localStorageKey: 'ttr_name',
		};

		this.el = {
			nameInput: document.getElementById('nameInput'),
			joinBtn: document.getElementById('joinBtn'),
		}

		this.getSavedName();
		this.addEventListeners();
	}

	// Auto-join with stored name if present
	getSavedName() {
		const saved = localStorage.getItem(this.config.localStorageKey);
		if (saved && saved.trim()) {
			this.el.nameInput.value = saved;
			this.socket.emit('join', saved);
		}
	}

	// Save name to localStorage and emit join event
	onJoinButtonClick(e) {
		e.preventDefault();
		const value = this.el.nameInput.value.trim();
		if (value) {
			this.socket.emit('join', this.el.nameInput.value);
			localStorage.setItem(this.config.localStorageKey, value);
		}

		this.el.nameInput.blur();
	}

	addEventListeners() {
		this.el.joinBtn.addEventListener('click', (e) => this.onJoinButtonClick(e));

		this.el.nameInput.addEventListener('keydown', (e) => {
			if (e.key === 'Enter') {
				this.el.joinBtn.click();
			}
		});
	}
}
