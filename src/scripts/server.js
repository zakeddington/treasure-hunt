const path = require('path');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, '../../public')));

const PORT = process.env.PORT || 3000;

const mapNames = [
	'map-01', 'map-02', 'map-03', 'map-04', 'map-05', 'map-06', 'map-07', 'map-08',
	'map-09', 'map-10', 'map-11', 'map-12', 'map-13', 'map-14', 'map-15', 'map-16',
	'map-17', 'map-18',
];

const maps = mapNames.map(name => ({
	full: `/assets/images/${name}.jpg`,
	thumb: `/assets/images/thumbs/${name}.jpg`,
}));

const treasureTypes = {
	gem: '/assets/images/icons/icon-gem.svg',
	coin: '/assets/images/icons/icon-coin.svg',
	star: '/assets/images/icons/icon-star.svg',
	heart: '/assets/images/icons/icon-heart.svg',
	crown: '/assets/images/icons/icon-crown.svg',
	trophy: '/assets/images/icons/icon-trophy.svg',
	chest: '/assets/images/icons/icon-chest.svg',
	coinBag: '/assets/images/icons/icon-coin-bag.svg',
	potionRed: '/assets/images/icons/icon-potion-red.svg',
	potionBlue: '/assets/images/icons/icon-potion-blue.svg',
	potionGreen: '/assets/images/icons/icon-potion-green.svg',
	boltBlue: '/assets/images/icons/icon-bolt-blue.svg',
};

const state = {
	phase: 'lobby',
	players: new Map(),
	round: 0,
	maxRounds: 10,
	roundLength: 30000, // ms
	treasure: null,
	winnerSocketId: null,
	roundEndsAt: null,
	selectedMap: null,
	treasureType: 'gem',
};

function pickRandomMap() {
    return maps[Math.floor(Math.random() * maps.length)].full;
}

function playersList() {
	return Array.from(state.players.entries()).map(([id, p]) => ({
		id,
		name: p.name,
		score: p.score
	}));
}

function broadcastState() {
	io.emit('state', {
		phase: state.phase,
		round: state.round,
		maxRounds: state.maxRounds,
		players: playersList(),
		treasure: state.treasure ? {
			id: state.treasure.id,
			x: state.treasure.x,
			y: state.treasure.y,
			size: state.treasure.size,
			icon: state.treasure.icon,
		} : null,
		winnerSocketId: state.winnerSocketId,
		roundEndsAt: state.roundEndsAt,
		roundLength: state.roundLength,
		selectedMap: state.selectedMap,
		treasureType: state.treasureType,
		maps: maps.map(m => ({ full: m.full, thumb: m.thumb })),
	});
}

function rand(min, max) {
	return Math.random() * (max - min) + min;
}

function spawnTreasure() {
	const id = Math.random().toString(36).slice(2);
	state.treasure = {
		id,
		x: rand(0.12, 0.88),
		y: rand(0.18, 0.82),
		size: rand(0.10, 0.14),
		spawnedAt: Date.now(),
		icon: treasureTypes[state.treasureType] || treasureTypes['gem'],
	};
	state.winnerSocketId = null;
	state.phase = 'playing';
	state.roundEndsAt = Date.now() + state.roundLength;

	broadcastState();

	setTimeout(() => {
		if (state.phase === 'playing' && state.treasure && state.treasure.id === id) {
			state.phase = 'roundOver';
			state.treasure = null;
			state.roundEndsAt = null;
			state.round += 1;
			broadcastState();
			scheduleNextRound();
		}
	}, state.roundLength + 100);
}

function scheduleNextRound() {
	if (state.round > state.maxRounds) {
		state.phase = 'ended';
		state.treasure = null;
		state.winnerSocketId = null;
		state.roundEndsAt = null;
		state.round = state.maxRounds;
		broadcastState();
		return;
	}

	setTimeout(() => {
		if (state.players.size > 0) spawnTreasure();
	}, 1500);
}

function resetScores() {
	for (const [, p] of state.players) p.score = 0;
}

io.on('connection', (socket) => {
	state.players.set(socket.id, { name: 'Player', score: 0 });

	// Ensure a map is selected for initial connection
	if (!state.selectedMap) state.selectedMap = pickRandomMap();

	// allow clients to request a map change
	socket.on('selectMap', (mapSrc) => {
		if (typeof mapSrc !== 'string') return;
		if (!maps.some(m => m.full === mapSrc)) return;
		state.selectedMap = mapSrc;
		broadcastState();
	});

	socket.on('setMaxRounds', (value) => {
		if (state.phase !== 'lobby' && state.phase !== 'ended') return;
		const parsed = Number.parseInt(value, 10);
		if (!Number.isFinite(parsed)) return;
		const clamped = Math.max(1, Math.min(20, parsed));
		state.maxRounds = clamped;
		broadcastState();
	});

	socket.on('setRoundLength', (value) => {
		if (state.phase !== 'lobby' && state.phase !== 'ended') return;
		const parsed = Number.parseInt(value, 10);
		if (!Number.isFinite(parsed)) return;
		const clamped = Math.max(5, Math.min(60, parsed));
		state.roundLength = clamped * 1000;
		broadcastState();
	});

	socket.on('setTreasureType', (value) => {
		if (state.phase !== 'lobby' && state.phase !== 'ended') return;
		const key = String(value || '').trim();
		if (!treasureTypes[key]) return;
		state.treasureType = key;
		broadcastState();
	});

	socket.on('join', (name) => {
		const clean = String(name || '').trim().slice(0, 16) || 'Player';
		const p = state.players.get(socket.id);
		if (p) p.name = clean;
		broadcastState();
	});

	socket.on('start', () => {
		resetScores();
		state.round = 1;
		spawnTreasure();
	});

	socket.on('reset', () => {
		resetScores();
		state.phase = 'lobby';
		state.round = 0;
		state.treasure = null;
		state.winnerSocketId = null;
		state.roundEndsAt = null;
		broadcastState();
	});

	socket.on('tapTreasure', (payload) => {
		if (state.phase !== 'playing') return;
		if (!state.treasure) return;
		if (!payload || payload.treasureId !== state.treasure.id) return;
		if (state.winnerSocketId) return;

		state.winnerSocketId = socket.id;
		const p = state.players.get(socket.id);
		if (p) p.score += 1;

		state.phase = 'roundOver';
		state.treasure = null;
		state.roundEndsAt = null;

		broadcastState();
		state.round += 1;
		scheduleNextRound();
	});

	socket.on('disconnect', () => {
		state.players.delete(socket.id);
		if (state.players.size === 0) {
			state.phase = 'lobby';
			state.round = 0;
			state.treasure = null;
			state.winnerSocketId = null;
			state.roundEndsAt = null;
		} else if (state.phase === 'ended') {
			// If a player leaves during ended state, stay in ended state but broadcast
		}
		broadcastState();
	});

	broadcastState();
});

server.listen(PORT, '0.0.0.0', () => {
	console.log(`Treasure Hunt running on http://0.0.0.0:${PORT}`);
});
