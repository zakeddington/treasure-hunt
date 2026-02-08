export class SettingsDrawer {
	constructor(config) {
		this.socket = config.socket;

		this.config = {
			mapAnimSpeed: 300,
		};

		this.classes = {
			hidden: 'hidden',
			selected: 'selected',
			elMapItem: 'map-picker--item',
			elMapThumb: 'map-picker--thumb',
		};

		this.el = {
			map: document.getElementById('gameMap'),
			mapPicker: document.getElementById('mapPicker'),
			settingsBtn: document.getElementById('settingsBtn'),
			settingsDrawer: document.getElementById('settingsDrawer'),
			settingsDrawerCloseBtn: document.getElementById('settingsDrawerCloseBtn'),
			settingsDrawerOverlay: document.querySelector('.drawer--overlay'),
			roundsInput: document.getElementById('roundsInput'),
			roundTimeInput: document.getElementById('roundTimeInput'),
			mapPickerItems: null,
		};

		this.state = {
			rendered: false,
		};

		this.init();
	}

	init() {
		this.addEventListeners();
	}

	// Public methods (called from client.js)
	// -----------------------------------------------------------------------
	setMap(mapSrc) {
		const currentSrc = this.el.map?.dataset?.mapSrc;
		if (mapSrc && this.el.map && currentSrc !== mapSrc) {
			if (!currentSrc) {
				this.el.map.src = mapSrc;
				this.el.map.dataset.mapSrc = mapSrc;
				this.el.map.style.opacity = '1';
				return;
			}
			// Preload the new image
			const newImage = new Image();

			newImage.onload = () => {
				// Fade out current image
				this.el.map.style.opacity = '0';

				// Wait for fade out, then swap and fade in
				setTimeout(() => {
					this.el.map.src = mapSrc;
					this.el.map.dataset.mapSrc = mapSrc;
					// Force layout to ensure the src change is processed
					void this.el.map.offsetWidth;
					this.el.map.style.opacity = '1';
				}, this.config.mapAnimSpeed);
			};

			// Handle error case - still swap but without preload
			newImage.onerror = () => {
				this.el.map.style.opacity = '0';
				setTimeout(() => {
					this.el.map.src = mapSrc;
					this.el.map.dataset.mapSrc = mapSrc;
					void this.el.map.offsetWidth;
					this.el.map.style.opacity = '1';
				}, this.config.mapAnimSpeed);
			};

			// Start preloading
			newImage.src = mapSrc;
		}
	}

	showSettingsButton() {
		this.el.settingsBtn.classList.remove(this.classes.hidden);
	}

	hideSettingsButton() {
		this.el.settingsBtn.classList.add(this.classes.hidden);
	}

	handleStateUpdate(maps, selectedMap, maxRounds, roundLengthMs, phase) {
		// Only render it once
		if (Array.isArray(maps) && this.el.mapPicker && !this.state.rendered) {
			this.render(maps, selectedMap);
			this.state.rendered = true;
		}

		// Update selection
		if (selectedMap && this.state.rendered) {
			this.updateSelection(selectedMap);
		}

		if (typeof maxRounds === 'number' && this.el.roundsInput) {
			this.el.roundsInput.value = String(maxRounds);
		}

		if (typeof roundLengthMs === 'number' && this.el.roundTimeInput) {
			const seconds = Math.max(1, Math.round(roundLengthMs / 1000));
			this.el.roundTimeInput.value = String(seconds);
		}

		if (this.el.roundsInput || this.el.roundTimeInput) {
			const disabled = phase && phase !== 'lobby' && phase !== 'ended';
			if (this.el.roundsInput) this.el.roundsInput.disabled = Boolean(disabled);
			if (this.el.roundTimeInput) this.el.roundTimeInput.disabled = Boolean(disabled);
		}
	}

	// Local methods
	// -----------------------------------------------------------------------
	render(maps, selected) {
		this.el.mapPicker.innerHTML = '';
		for (const mapObj of maps) {
			const btn = document.createElement('button');
			btn.className = this.classes.elMapItem;
			btn.type = 'button';
			btn.setAttribute('aria-label', `Select map ${mapObj.full}`);
			btn.dataset.mapFull = mapObj.full;

			const img = document.createElement('img');
			img.src = mapObj.thumb;
			img.alt = 'map';
			img.className = this.classes.elMapThumb;
			img.loading = 'lazy';

			btn.appendChild(img);
			if (mapObj.full === selected) btn.classList.add(this.classes.selected);

			btn.addEventListener('click', () => {
				this.socket.emit('selectMap', mapObj.full);
			});

			this.el.mapPicker.appendChild(btn);
		}
		this.el.mapPickerItems = document.querySelectorAll('.' + this.classes.elMapItem);
	}

	updateSelection(selectedMapSrc) {
		if (!this.el.mapPickerItems) return;
		this.el.mapPickerItems.forEach((item) => {
			item.classList.remove(this.classes.selected);
			if (item.dataset.mapFull === selectedMapSrc) {
				item.classList.add(this.classes.selected);
			}
		});
	}

	openDrawer() {
		this.el.settingsDrawer.classList.remove(this.classes.hidden);
		setTimeout(() => this.el.settingsDrawerCloseBtn.focus(), 100);
	}

	closeDrawer() {
		this.el.settingsDrawer.classList.add(this.classes.hidden);
		this.el.settingsBtn.focus();
	}

	onKeydown(e) {
		if (e.key === 'Escape' && !this.el.settingsDrawer.classList.contains(this.classes.hidden)) {
			this.closeDrawer();
		}
	}

	addEventListeners() {
		this.el.settingsBtn.addEventListener('click', () => this.openDrawer());
		this.el.settingsDrawerCloseBtn.addEventListener('click', () => this.closeDrawer());
		this.el.settingsDrawerOverlay.addEventListener('click', () => this.closeDrawer());
		this.el.roundsInput?.addEventListener('change', () => this.onRoundsChange());
		this.el.roundTimeInput?.addEventListener('change', () => this.onRoundTimeChange());

		document.addEventListener('keydown', (e) => this.onKeydown(e));
	}

	onRoundsChange() {
		if (!this.el.roundsInput) return;
		const raw = parseInt(this.el.roundsInput.value, 10);
		if (!Number.isFinite(raw)) return;
		const clamped = Math.max(1, Math.min(20, raw));
		this.el.roundsInput.value = String(clamped);
		this.socket.emit('setMaxRounds', clamped);
	}

	onRoundTimeChange() {
		if (!this.el.roundTimeInput) return;
		const raw = parseInt(this.el.roundTimeInput.value, 10);
		if (!Number.isFinite(raw)) return;
		const clamped = Math.max(5, Math.min(300, raw));
		this.el.roundTimeInput.value = String(clamped);
		this.socket.emit('setRoundLength', clamped);
	}
}
