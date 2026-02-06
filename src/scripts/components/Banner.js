import { escapeHtml } from '../utils/utils.js';

export class Banner {
	constructor() {

		this.config = {
			showDuration: 3000,
			animSpeedFadeOut: 300,
		};

		this.classes = {
			hidden: 'hidden',
			fadingOut: 'fading-out',
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
		this.show('Find the treasure NOW!', true, false);
	}

	showRoundOver({ isSinglePlayer, hasWinner, winnerName }) {
		if (hasWinner) {
			if (isSinglePlayer) {
				this.show('Point earned! 🎉', true, false);
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
			this.show(`<span class="text-size-large">Game Over</span><br />Final Score: ${winnerScore ?? 0}`, true, true);
			return;
		}

		if (isTie) {
			this.show('<span class="text-size-large">Game Over</span><br />🤝 It\'s a Tie!', true, true);
			return;
		}

		const medal = isWinner ? '👑' : '🏆';
		const safeName = escapeHtml(winnerName ?? 'Unknown');
		this.show(`<span class="text-size-large">Game Over<br />${medal}</span><br />${safeName} wins!`, true, true);
	}
}
