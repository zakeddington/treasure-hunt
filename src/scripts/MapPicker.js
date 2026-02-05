export class MapPicker {
	constructor(config) {
		this.socket = config.socket;

		this.classes = {
			hidden: 'hidden',
			selected: 'selected',
			elMapItem: 'map-picker--item',
			elMapThumb: 'map-picker--thumb',
		}

		this.el = {
			map: document.getElementById('gameMap'),
			mapPicker: document.getElementById('mapPicker'),
			mapPickerBtn: document.getElementById('mapPickerBtn'),
			mapDrawer: document.getElementById('mapDrawer'),
			mapDrawerCloseBtn: document.getElementById('mapDrawerCloseBtn'),
			mapDrawerOverlay: document.querySelector('.map-drawer--overlay'),
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
		if (mapSrc && this.el.map && this.el.map.src !== mapSrc) {
			this.el.map.src = mapSrc;
		}
	}

	showMapPickerButton() {
		this.el.mapPickerBtn.classList.remove(this.classes.hidden);
	}

	hideMapPickerButton() {
		this.el.mapPickerBtn.classList.add(this.classes.hidden);
	}

	handleStateUpdate(maps, selectedMap) {
		// Only render it once
		if (Array.isArray(maps) && this.el.mapPicker && !this.state.rendered) {
			this.render(maps, selectedMap);
			this.state.rendered = true;
		}

		// Update selection
		if (selectedMap && this.state.rendered) {
			this.updateSelection(selectedMap);
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
		this.el.mapDrawer.classList.remove(this.classes.hidden);
		setTimeout(() => this.el.mapDrawerCloseBtn.focus(), 100);
	}

	closeDrawer() {
		this.el.mapDrawer.classList.add(this.classes.hidden);
		this.el.mapPickerBtn.focus();
	}

	onKeydown(e) {
		if (e.key === 'Escape' && !this.el.mapDrawer.classList.contains(this.classes.hidden)) {
			this.closeDrawer();
		}
	}

	addEventListeners() {
		this.el.mapPickerBtn.addEventListener('click', () => this.openDrawer());
		this.el.mapDrawerCloseBtn.addEventListener('click', () => this.closeDrawer());
		this.el.mapDrawerOverlay.addEventListener('click', () => this.closeDrawer());

		document.addEventListener('keydown', (e) => this.onKeydown(e));
	}
}
