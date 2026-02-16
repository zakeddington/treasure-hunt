import { TREASURE_ICONS, LOCAL_STORAGE_AUDIO_MUTED } from '../config/appConfig';

export class SettingsDrawer {
	constructor(config) {
		this.socket = config.socket;

		this.config = {
			mapAnimSpeed: 300,
			audioOnSrc: '/assets/images/icons/icon-audio-on.svg',
			audioOffSrc: '/assets/images/icons/icon-audio-off.svg',
		};

		this.classes = {
			hidden: 'hidden',
			selected: 'is-selected',
			disabled: 'is-disabled',
			elMapItem: 'map-picker--item',
			elMapThumb: 'map-picker--thumb',
			elTreasureItem: 'treasure-picker--item',
			elTreasureIcon: 'treasure-picker--icon',
		};

		this.el = {
			map: document.getElementById('gameMap'),
			mapPicker: document.getElementById('mapPicker'),
			settingsBtn: document.getElementById('settingsBtn'),
			settingsDrawer: document.getElementById('settingsDrawer'),
			settingsDrawerCloseBtn: document.getElementById('settingsDrawerCloseBtn'),
			settingsDrawerOverlay: document.querySelector('.drawer--overlay'),
			muteAudioToggle: document.getElementById('muteAudioToggle'),
			roundsInput: document.getElementById('roundsInput'),
			roundTimeInput: document.getElementById('roundTimeInput'),
			treasurePicker: document.getElementById('treasurePicker'),
			mapPickerItems: null,
			treasureItems: null,
		};

		this.state = {
			mapRendered: false,
			treasureRendered: false,
			isMuted: localStorage.getItem(LOCAL_STORAGE_AUDIO_MUTED) === 'true',
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

	handleStateUpdate(maps, selectedMap, maxRounds, roundLengthMs, treasureType, phase) {
		// Only render it once
		if (Array.isArray(maps) && this.el.mapPicker && !this.state.mapRendered) {
			this.render(maps, selectedMap);
			this.state.mapRendered = true;
		}

		// Update selection
		if (selectedMap && this.state.mapRendered) {
			this.updateSelection(selectedMap);
		}

		if (typeof maxRounds === 'number' && this.el.roundsInput) {
			this.el.roundsInput.value = String(maxRounds);
		}

		if (typeof roundLengthMs === 'number' && this.el.roundTimeInput) {
			const seconds = Math.max(1, Math.round(roundLengthMs / 1000));
			this.el.roundTimeInput.value = String(seconds);
		}

		if (!this.state.treasureRendered && this.el.treasurePicker) {
			this.renderTreasurePicker();
			this.state.treasureRendered = true;
		}

		const disabled = phase && phase !== 'lobby' && phase !== 'ended';
		if (this.el.roundsInput || this.el.roundTimeInput || this.el.treasurePicker) {
			if (this.el.roundsInput) this.el.roundsInput.disabled = Boolean(disabled);
			if (this.el.roundTimeInput) this.el.roundTimeInput.disabled = Boolean(disabled);
			if (this.el.treasurePicker) this.el.treasurePicker.classList.toggle(this.classes.disabled, Boolean(disabled));
		}

		if (typeof treasureType === 'string') {
			this.updateTreasureSelection(treasureType, Boolean(disabled));
		}
	}

	isAudioMuted() {
		return this.state.isMuted;
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
		if (this.el.muteAudioToggle) {
			this.updateToggleUI();
			this.el.muteAudioToggle.addEventListener('click', () => {
				this.state.isMuted = !this.state.isMuted;
				localStorage.setItem(LOCAL_STORAGE_AUDIO_MUTED, String(this.state.isMuted));
				this.updateToggleUI();
			});
			this.el.muteAudioToggle.addEventListener('keydown', (e) => {
				if (e.key === 'Enter' || e.key === ' ') {
					e.preventDefault();
					this.state.isMuted = !this.state.isMuted;
					localStorage.setItem(LOCAL_STORAGE_AUDIO_MUTED, String(this.state.isMuted));
					this.updateToggleUI();
				}
			});
		}
		this.el.settingsBtn.addEventListener('click', () => this.openDrawer());
		this.el.settingsDrawerCloseBtn.addEventListener('click', () => this.closeDrawer());
		this.el.settingsDrawerOverlay.addEventListener('click', () => this.closeDrawer());
		this.el.roundsInput?.addEventListener('change', () => this.onRoundsChange());
		this.el.roundTimeInput?.addEventListener('change', () => this.onRoundTimeChange());

		document.addEventListener('keydown', (e) => this.onKeydown(e));
	}

	updateToggleUI() {
		if (!this.el.muteAudioToggle) return;
		const icon = this.el.muteAudioToggle.querySelector('img');
		if (!icon) return;

		if (this.state.isMuted) {
			icon.src = this.config.audioOffSrc;
			icon.alt = 'Audio off';
			this.el.muteAudioToggle.setAttribute('aria-pressed', 'true');
			this.el.muteAudioToggle.setAttribute('aria-label', 'Audio off');
			this.el.muteAudioToggle.classList.add(this.classes.selected);
		} else {
			icon.src = this.config.audioOnSrc;
			icon.alt = 'Audio on';
			this.el.muteAudioToggle.setAttribute('aria-pressed', 'false');
			this.el.muteAudioToggle.setAttribute('aria-label', 'Audio on');
			this.el.muteAudioToggle.classList.remove(this.classes.selected);
		}
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

	renderTreasurePicker() {
		if (!this.el.treasurePicker) return;
		this.el.treasurePicker.innerHTML = '';
		for (const treasure of TREASURE_ICONS) {
			const btn = document.createElement('button');
			btn.type = 'button';
			btn.className = this.classes.elTreasureItem;
			btn.dataset.treasureKey = treasure.key;
			btn.setAttribute('aria-label', `Select treasure ${treasure.label}`);

			const img = document.createElement('img');
			img.src = treasure.icon;
			img.alt = treasure.label;
			img.className = this.classes.elTreasureIcon;
			img.loading = 'lazy';

			btn.appendChild(img);
			btn.addEventListener('click', () => this.onTreasureSelect(treasure.key));
			this.el.treasurePicker.appendChild(btn);
		}
		this.el.treasureItems = this.el.treasurePicker.querySelectorAll('.' + this.classes.elTreasureItem);
	}

	onTreasureSelect(key) {
		if (!key) return;
		this.socket.emit('setTreasureType', key);
	}

	updateTreasureSelection(selectedKey, disabled) {
		if (!this.el.treasureItems) return;
		this.el.treasureItems.forEach((item) => {
			item.classList.toggle(this.classes.selected, item.dataset.treasureKey === selectedKey);
			item.disabled = Boolean(disabled);
		});
	}
}
