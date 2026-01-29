const path = require('path');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, '../../public')));

const PORT = process.env.PORT || 3000;

const state = {
	phase: 'lobby',
	players: new Map(),
	round: 0,
	maxRounds: 3,
	treasure: null,
	winnerSocketId: null,
	roundEndsAt: null
};

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
			size: state.treasure.size
		} : null,
		winnerSocketId: state.winnerSocketId,
		roundEndsAt: state.roundEndsAt
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
		spawnedAt: Date.now()
	};
	state.winnerSocketId = null;
	state.phase = 'playing';
	state.roundEndsAt = Date.now() + 60000;

	broadcastState();

	setTimeout(() => {
		if (state.phase === 'playing' && state.treasure && state.treasure.id === id) {
			state.phase = 'roundOver';
			state.treasure = null;
			state.roundEndsAt = null;
			broadcastState();
			scheduleNextRound();
		}
	}, 60100);
}

function scheduleNextRound() {
	if (state.round > state.maxRounds) {
		state.phase = 'ended';
		state.treasure = null;
		state.winnerSocketId = null;
		state.roundEndsAt = null;
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

	socket.on('join', (name) => {
		const clean = String(name || '').trim().slice(0, 16) || 'Player';
		const p = state.players.get(socket.id);
		if (p) p.name = clean;
		broadcastState();
	});

	socket.on('start', () => {
		if (state.phase !== 'lobby') return;
		if (state.players.size < 1) {
			socket.emit('toast', 'Join the game first.');
			return;
		}
		resetScores();
		state.round = 1;
		spawnTreasure();
	});

	socket.on('reset', () => {
		if (state.phase !== 'lobby' && state.phase !== 'ended') return;
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
