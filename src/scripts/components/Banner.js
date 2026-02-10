import { escapeHtml } from '../utils/utils.js';

export class Banner {
	constructor() {

		this.config = {
			showDuration: 3000,
			animSpeedFadeOut: 300,
			imgTie: 'assets/images/icons/icon-flag.svg',
			imgWinner: 'assets/images/icons/icon-crown.svg',
		};

		this.classes = {
			hidden: 'hidden',
			fadingOut: 'fading-out',
			bannerContent: 'banner--content',
		};

		this.el = {
			banner: document.getElementById('banner'),
		};

		this.timeoutId = null;
	}

	show(msg, show = true, persist = false) {
		if (this.timeoutId) {
			clearTimeout(this.timeoutId);
			this.timeoutId = null;
		}

		this.el.banner.innerHTML = msg;
		this.el.banner.classList.remove(this.classes.hidden, this.classes.fadingOut);

		if (show && !persist) {
			this.timeoutId = setTimeout(() => {
				this.el.banner.classList.add(this.classes.fadingOut);
				setTimeout(() => {
					this.el.banner.classList.add(this.classes.hidden);
					this.timeoutId = null;
				}, this.config.animSpeedFadeOut);
			}, this.config.showDuration);
		} else if (!show) {
			this.el.banner.classList.add(this.classes.hidden);
		}
	}

	showLobby(hasPlayers) {
		const msg = hasPlayers ? 'Press Start to begin!' : 'Join the game to start!';
		this.show(msg, true, true);
	}

	showPlaying() {
		this.show(`<span class="text-color-secondary">Find the treasure!</span>`, true, false);
	}

	showRoundOver({ isSinglePlayer, hasWinner, winnerName }) {
		if (hasWinner) {
			if (isSinglePlayer) {
				this.show('Point earned!', true, false);
				return;
			}
			const safeName = winnerName ? escapeHtml(winnerName) : null;
			this.show(safeName ? `Point for ${safeName}!` : 'Point scored!', true, false);
			return;
		}

		this.show(
			isSinglePlayer ? 'Treasure expired! Next round…' : 'No one got it! Next round…',
			true,
			false
		);
	}

	showEnded({ isSinglePlayer, isTie, isWinner, winnerName, winnerScore }) {
		if (isSinglePlayer) {
			this.show(`
				<span class="text-size-large text-color-secondary">Game Over</span>
				<img src="${this.config.imgWinner}" alt="" />
				<span>Final Score: ${winnerScore ?? 0}</span>
			`, true, true);
			return;
		}

		if (isTie) {
			this.show(`
				<span class="text-size-large text-color-secondary">Game Over</span>
				<img src="${this.config.imgTie}" alt="" />
				<span>It's a Tie!</span>
			`, true, true);
			return;
		}

		const medal = isWinner ? `<img src="${this.config.imgWinner}" alt="" />` : ``;
		const message = isWinner ? 'You win!' : `${escapeHtml(winnerName)} wins!`;
		this.show(`
			<span class="text-size-large text-color-secondary">Game Over</span>
			${medal}
			<span>${message}</span>
		`, true, true);
	}
}
