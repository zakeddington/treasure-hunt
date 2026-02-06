export class StartResetControls {
	constructor(config) {
		this.socket = config.socket;

		this.classes = {
			hidden: 'hidden',
		};

		this.el = {
			startBtn: document.getElementById('startBtn'),
			resetBtn: document.getElementById('resetBtn'),
		};

		this.addEventListeners();
	}

	addEventListeners() {
		this.el.startBtn.addEventListener('click', () => this.socket.emit('start'));
		this.el.resetBtn.addEventListener('click', () => this.socket.emit('reset'));
	}

	showStart() {
		this.el.startBtn.classList.remove(this.classes.hidden);
		this.el.resetBtn.classList.add(this.classes.hidden);
	}

	showReset() {
		this.el.resetBtn.classList.remove(this.classes.hidden);
		this.el.startBtn.classList.add(this.classes.hidden);
	}
}
