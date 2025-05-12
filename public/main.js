import { Modal } from "bootstrap";
import { io } from "socket.io-client";

const socket = io("http://localhost:5000");

// Load PlayerId
var playerId = localStorage.getItem('x-unique-id');
if (playerId == null) {
    playerId = crypto.randomUUID();
    localStorage.setItem('x-unique-id', playerId);
}

// Load PlayerName
var playerName = localStorage.getItem('x-name');
console.log(playerName);
if (playerName == null) {
    playerName = '???';
    localStorage.setItem('x-name', playerName);
}

// Load Room from Path
var pathParam = location.pathname.split("/").at(-1);
if (pathParam.length == 4) {
    document.getElementById("room-code").value = pathParam;
    connectRoom(pathParam);
}

//
// Landing Page
//
document.getElementById("create-room").addEventListener("click", () => {
    socket.emit('ROOM_CREATE_REQUEST', { playerId: playerId, playerName: playerName }, (res) => joinRoom(res));
});

document.getElementById("join-room").addEventListener("click", () => {
    const code = document.getElementById("room-code").value;
    connectRoom(code);
});

function connectRoom(code) {
    socket.emit('ROOM_JOIN_REQUEST', { roomCode: code, playerId: playerId, playerName: playerName }, (res) => {
        if (res != null) {
            joinRoom(res);
        } else {
            document.getElementById("room-code").value = '';
            document.getElementById("room-not-found").classList.remove('d-none');
            window.history.pushState(null, '', '/');
        }
    });
}

function joinRoom(room) {
    document.getElementById("landing-page").classList.add('d-none');
    document.getElementById("game-room").classList.remove('d-none');
    window.history.pushState(null, '', '/' + room.id);
    roomId = room.id;
    socket.on("ROOM_UPDATE", (res) => renderRoom(res));
    renderRoom(room);
}


//
// Game Room
//

const choices = ['1', '2', '3', '5', '8', '?'];
const cards = document.getElementsByClassName('point-card');

var roomId = '';

function renderRoom(room) {
    document.getElementById("title").textContent = 'Room #' + room.id;

    let scores = new Map();
    choices.forEach((c) => scores.set(c, 0))

    let playerNodes = '';
    for (const playerEntry of Object.entries(room.players)) {
        playerNodes += createPlayerNode(playerEntry[0], playerEntry[1], room.state);

        if (playerEntry[1].card != '') {
            scores.set(playerEntry[1].card, scores.get(playerEntry[1].card) + 1);
        }
    }
    document.getElementById('players').innerHTML = playerNodes;

    const playersCard = room.players[playerId].card;
    for (const card of cards) {
        card.classList.remove('bg-primary');
        if (card.textContent == playersCard) {
            card.classList.add('bg-primary');
        }
    }

    document.getElementById('reveal').classList.remove('d-none');
    document.getElementById('reset').classList.remove('d-none');
    document.getElementById('stats').classList.remove('d-none');
    if (room.state == 'reveal') {
        document.getElementById('reveal').classList.add('d-none');

        let scoreNodes = '';
        const totalTally = scores.values().reduce((a,b) => a + b);
        for (var score of scores.entries()) {
            scoreNodes += createScoreNode(score[0], score[1], totalTally);
        }
        document.getElementById('bar-chart').innerHTML = scoreNodes;

    } else {
        document.getElementById('reset').classList.add('d-none');
        document.getElementById('stats').classList.add('d-none');
    }
};


function createPlayerNode(id, player, gameState) {
    const isPlayer = id == playerId;
    const hasSelected = player.card != '';
    const isHidden = gameState == 'hidden';

    return `<div class="col text-center">
        <div class="d-flex flex-column justify-content-center">
            <div class="d-flex justify-content-center">         
                <p class="border border-primary border-3 rounded p-3 ${hasSelected ? 'bg-primary' : ''}">
                    ${isHidden ? '?' : player.card == '' ? '-' : player.card }
                </p>
            </div>
            <i class="fa-solid fa-user fs-1 text-light"></i>
            <div class="mt-2">
                ${player.name}
                ${isPlayer ?  '<button id="edit-name" data-bs-toggle="modal" data-bs-target="#exampleModal" class="btn btn-outline-light btn-sm"><i class="fa-solid fa-pen-to-square"></i></button>' : ''}
            </div>
        </div>
    </div>`;
}

function createScoreNode(card, tally, totalTally) {
    return `<div class="d-flex flex-column-reverse align-items-center h-100">
      <div class="bar text-bg-success" style="height: ${(tally / totalTally) * 100}%;">
        ${tally == 0 ? '' : tally}
        </div>
      <div class="text-center">${card}</div>
    </div>`;
}


for (const card of cards) {
    card.addEventListener('click', () => {
        socket.emit("PLAYER_UPDATE_REQUEST", roomId, playerId, { card: card.textContent }, (res) => {
            renderRoom(res);
        });
    });
}

document.getElementById('reveal').addEventListener('click', () => {
    socket.emit("ROOM_UPDATE_REQUEST", roomId, 'reveal', (res) => {
        renderRoom(res);
    });
});

document.getElementById('reset').addEventListener('click', () => {
    socket.emit("ROOM_UPDATE_REQUEST", roomId, 'hidden', (res) => {
        renderRoom(res);
    });
});

document.getElementById('change-name').addEventListener('click', () => {
    playerName = document.getElementById('name-input').value;
    socket.emit("PLAYER_UPDATE_REQUEST", roomId, playerId, { name: playerName }, (res) => {
        document.getElementById('name-input').value = '';
        localStorage.setItem('x-name', playerName);
        renderRoom(res);
    });
});

const copyLink = document.getElementById('copy-link');
copyLink.addEventListener('click', () => {
    navigator.clipboard.writeText(location.href)
    copyLink.classList.remove('btn-outline-light');
    copyLink.classList.add('btn-outline-success');
    document.getElementById('copy-icon').classList.add('d-none');
    document.getElementById('copy-done-icon').classList.remove('d-none');
     
    setTimeout(() => {
        copyLink.classList.remove('btn-outline-success');
        copyLink.classList.add('btn-outline-light');
        document.getElementById('copy-done-icon').classList.add('d-none');
        document.getElementById('copy-icon').classList.remove('d-none');
    }, 1000);

});

document.getElementById('exit').addEventListener('click', () => {
    document.getElementById("game-room").classList.add('d-none');
    document.getElementById("landing-page").classList.remove('d-none');
    window.history.pushState(null, '', '/');
    socket.emit("PLAYER_LEAVE_REQUEST", roomId, playerId, (res) => {console.log(res)});
    roomId = '';
});
