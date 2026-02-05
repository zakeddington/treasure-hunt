export class MapPicker {
	constructor(config) {
		this.socket = config.socket;

		this.classes = {
			hidden: 'hidden',
		}

		this.el = {
			map: document.getElementById('gameMap'),
			mapPicker: document.getElementById('mapPicker'),
			mapPickerBtn: document.getElementById('mapPickerBtn'),
			mapDrawer: document.getElementById('mapDrawer'),
			mapDrawerCloseBtn: document.getElementById('mapDrawerCloseBtn'),
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

	setMap(mapSrc) {
		if (mapSrc && this.el.map && this.el.map.src !== mapSrc) {
			this.el.map.src = mapSrc;
		}
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

	render(maps, selected) {
		this.el.mapPicker.innerHTML = '';
		for (const mapObj of maps) {
			const btn = document.createElement('button');
			btn.className = 'map-picker--item';
			btn.type = 'button';
			btn.setAttribute('aria-label', `Select map ${mapObj.full}`);
			btn.dataset.mapFull = mapObj.full;

			const img = document.createElement('img');
			img.src = mapObj.thumb;
			img.alt = 'map';
			img.className = 'map-picker--thumb';
			img.loading = 'lazy';

			btn.appendChild(img);
			if (mapObj.full === selected) btn.classList.add('selected');

			btn.addEventListener('click', () => {
				this.socket.emit('selectMap', mapObj.full);
			});

			this.el.mapPicker.appendChild(btn);
		}
		this.el.mapPickerItems = document.querySelectorAll('.map-picker--item');
	}

	updateSelection(selectedMapSrc) {
		if (!this.el.mapPickerItems) return;
		this.el.mapPickerItems.forEach((item) => {
			item.classList.remove('selected');
			if (item.dataset.mapFull === selectedMapSrc) {
				item.classList.add('selected');
			}
		});
	}

	show() {
		this.el.mapPickerBtn.classList.remove(this.classes.hidden);
	}

	hide() {
		this.el.mapPickerBtn.classList.add(this.classes.hidden);
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
		this.el.mapDrawer.querySelector('.map-drawer--overlay').addEventListener('click', () => this.closeDrawer());

		document.addEventListener('keydown', (e) => this.onKeydown(e));
	}
}
