import { escapeHtml } from '../utils/utils.js';

export class Banner {
	constructor() {

		this.config = {
			showDuration: 1000,
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

	show(msg, persist = false) {
		if (this.timeoutId) {
			clearTimeout(this.timeoutId);
			this.timeoutId = null;
		}

		this.el.banner.innerHTML = msg;
		this.el.banner.classList.remove(this.classes.hidden, this.classes.fadingOut);

		if (!persist) {
			this.timeoutId = setTimeout(() => {
				this.el.banner.classList.add(this.classes.fadingOut);
			}, this.config.showDuration);
		}
	}

	showLobby(hasPlayers) {
		const msg = hasPlayers ? 'Press Start to begin!' : 'Join the game to start!';
		this.show(msg, true);
	}

	showPlaying() {
		this.show(`<span class="text-color-secondary">Find the treasure!</span>`, false);
	}

	showRoundOver({ isSinglePlayer, hasWinner, winnerName }) {
		if (hasWinner) {
			if (isSinglePlayer) {
				this.show('Point earned!', false);
				return;
			}
			const safeName = winnerName ? escapeHtml(winnerName) : null;
			this.show(safeName ? `Point for ${safeName}!` : 'Point scored!', false);
			return;
		}

		this.show(
			isSinglePlayer ? 'Treasure expired! Next round…' : 'No one got it! Next round…',
			false
		);
	}

	showEnded({ isSinglePlayer, isTie, isWinner, winnerName, winnerScore }) {
		if (isSinglePlayer) {
			this.show(`
				<span class="text-size-large text-color-secondary">Game Over</span>
				<img src="${this.config.imgWinner}" alt="" />
				<span>Final Score: ${winnerScore ?? 0}</span>
			`, true);
			return;
		}

		if (isTie) {
			this.show(`
				<span class="text-size-large text-color-secondary">Game Over</span>
				<img src="${this.config.imgTie}" alt="" />
				<span>It's a Tie!</span>
			`, true);
			return;
		}

		const medal = isWinner ? `<img src="${this.config.imgWinner}" alt="" />` : ``;
		const message = isWinner ? 'You win!' : `${escapeHtml(winnerName)} wins!`;
		this.show(`
			<span class="text-size-large text-color-secondary">Game Over</span>
			${medal}
			<span>${message}</span>
		`, true);
	}
}
