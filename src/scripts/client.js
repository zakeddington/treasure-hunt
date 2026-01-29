const socket = io();

const el = (id) => document.getElementById(id);

const nameInput = el('nameInput');
const joinBtn = el('joinBtn');
const startBtn = el('startBtn');
const resetBtn = el('resetBtn');

const scoreBoard = el('scoreboard');
const arena = el('arena');
const banner = el('banner');
const toast = el('toast');

const statusLabel = el('statusLabel');
const roundText = el('roundText');
const maxRoundsText = el('maxRoundsText');
const hintText = el('hintText');

let myId = null;
let currentTreasureId = null;

function showToast(msg) {
	toast.textContent = msg;
	toast.classList.remove('hidden');
	setTimeout(() => toast.classList.add('hidden'), 1800);
}

function setBanner(msg, show = true) {
	banner.textContent = msg;
	banner.classList.toggle('hidden', !show);
}

function clearTreasure() {
	const t = arena.querySelector('.treasure');
	if (t) t.remove();
	currentTreasureId = null;
}

function placeTreasure(treasure) {
	clearTreasure();
	if (!treasure) return;

	currentTreasureId = treasure.id;

	const treasureEl = document.createElement('button');
	treasureEl.className = 'treasure';
	treasureEl.type = 'button';
	treasureEl.setAttribute('aria-label', 'Treasure');
	treasureEl.textContent = '💎';

	// Compute pixel position from normalized coords
	const rect = arena.getBoundingClientRect();
	const minDim = Math.min(rect.width, rect.height);
	const sizePx = Math.max(64, Math.floor(minDim * treasure.size));

	treasureEl.style.width = `${sizePx}px`;
	treasureEl.style.height = `${sizePx}px`;
	treasureEl.style.left = `${treasure.x * rect.width}px`;
	treasureEl.style.top = `${treasure.y * rect.height}px`;

	// Tap handler
	const tap = (ev) => {
		ev.preventDefault();
		ev.stopPropagation();
		if (!currentTreasureId) return;
		socket.emit('tapTreasure', { treasureId: currentTreasureId });
	};

	treasureEl.addEventListener('click', tap, { passive: false });
	treasureEl.addEventListener('touchstart', tap, { passive: false });

	arena.appendChild(treasureEl);
}

// Re-position on resize/orientation change (keeps treasure in correct place)
window.addEventListener('resize', () => {
	if (!currentTreasureId) return;
	// We need the last known treasure from state; easiest: request state by reconnect.
	// But we can simply do nothing; next round will re-place.
});

// UI actions
joinBtn.addEventListener('click', () => {
	socket.emit('join', nameInput.value);
	nameInput.blur();
});

nameInput.addEventListener('keydown', (e) => {
	if (e.key === 'Enter') joinBtn.click();
});

startBtn.addEventListener('click', () => socket.emit('start'));
resetBtn.addEventListener('click', () => socket.emit('reset'));

socket.on('connect', () => {
	myId = socket.id;
	// auto-join with stored name if present
	const saved = localStorage.getItem('ttr_name');
	if (saved && saved.trim()) {
		nameInput.value = saved;
		socket.emit('join', saved);
	}
});

socket.on('toast', (msg) => showToast(msg));

socket.on('state', (s) => {
	statusLabel.textContent =
		s.phase === 'lobby' ? 'Lobby' :
		s.phase === 'playing' ? 'Playing' :
		s.phase === 'roundOver' ? 'Round Over' :
		'Game Over';

	roundText.textContent = String(s.round);
	maxRoundsText.textContent = String(s.maxRounds);

	// Save name if user typed one
	const typed = nameInput.value.trim();
	if (typed) localStorage.setItem('ttr_name', typed);

	// Scoreboard
	scoreBoard.innerHTML = '';
	const sorted = [...s.players].sort((a, b) => b.score - a.score);
	for (const p of sorted) {
		const li = document.createElement('li');
		li.className = 'scoreboard--item' + (p.id === myId ? ' current-player' : '');
		li.innerHTML = `<span>${escapeHtml(p.name)}</span><span>⭐ ${p.score}</span>`;
		scoreBoard.appendChild(li);
	}

	// Arena / banner
	if (s.phase === 'lobby') {
		clearTreasure();
		const hint = s.players.length > 0 ? 'Press Start to begin!' : 'Join the game to start!';
		setBanner(hint, true);
		hintText.textContent = hint;
	} else if (s.phase === 'playing') {
		setBanner('Tap the treasure NOW!', true);
		const isSinglePlayer = s.players.length === 1;
		hintText.textContent = isSinglePlayer ? 'Tap to earn points!' : 'First tap wins the point!';
		placeTreasure(s.treasure);
	} else if (s.phase === 'roundOver') {
		clearTreasure();
		const isSinglePlayer = s.players.length === 1;
		if (s.winnerSocketId) {
			const winner = s.players.find(p => p.id === s.winnerSocketId);
			if (isSinglePlayer) {
				setBanner('Point earned! 🎉', true);
			} else {
				setBanner(winner ? `Point for ${winner.name}!` : 'Point scored!', true);
			}
		} else {
			setBanner(isSinglePlayer ? 'Treasure expired! Next round…' : 'No one got it! Next round…', true);
		}
		hintText.textContent = 'Get ready…';
	} else if (s.phase === 'ended') {
		clearTreasure();
		const sorted = [...s.players].sort((a, b) => b.score - a.score);
		const winner = sorted[0];
		const isSinglePlayer = s.players.length === 1;

		if (isSinglePlayer) {
			setBanner(`Final Score: ${winner.score}`, true);
			hintText.textContent = 'Press Reset Scores to play again!';
		} else {
			const medal = winner.id === myId ? '👑' : '🏆';
			setBanner(`${medal} ${escapeHtml(winner.name)} wins!`, true);
			hintText.textContent = `Final: ${winner.name} - ${winner.score}`;
		}
	}
});

function escapeHtml(str) {
	return String(str)
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll(`'`, '&quot;')
		.replaceAll(`'`, '&#039;');
}
