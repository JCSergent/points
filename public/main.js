import { io } from "socket.io-client";

const socket = io("http://localhost:8524");

// Load PlayerId
var playerId = sessionStorage.getItem('x-unique-id');
if (playerId == null) {
    playerId = crypto.randomUUID();
    sessionStorage.setItem('x-unique-id', playerId);
}

// Load RoomId
var pathParam = location.pathname.split("/").at(-1);
if (pathParam.length == 4) {
    document.getElementById("room-code").value = pathParam;
    connectRoom(pathParam);
}

//
// Landing Page
//
document.getElementById("create-room").addEventListener("click", () => {
    socket.emit('ROOM_CREATE_REQUEST', { playerId: playerId }, (res) => joinRoom(res));
});

document.getElementById("join-room").addEventListener("click", () => {
    const code = document.getElementById("room-code").value;
    connectRoom(code);
});

function connectRoom(code) {
    socket.emit('ROOM_JOIN_REQUEST', { roomCode: code, playerId: playerId }, (res) => {
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

var roomId = '';

function renderRoom(roomState) {
    console.log('rendering room');

    document.getElementById("title").textContent = 'Room ' + roomState.id;

    const playerElem = document.getElementById('players');

    let playerNodes = '';
    for (const playerEntry of Object.entries(roomState.players)) {
        playerNodes += createPlayerNode(playerEntry[0], playerEntry[1]);
    }
    playerElem.innerHTML = playerNodes;

    const playersCard = roomState.players[playerId].card;
    for (const card of cards) {
        card.classList.remove('bg-primary');
        if (card.textContent == playersCard) {
            card.classList.add('bg-primary');
        }
    }
};


function createPlayerNode(id, player) {
    const isPlayer = id == playerId;
    const hasSelected = player.card != null;
    return `<div class="col text-center">
        <div class="d-flex flex-column justify-content-center">
            <div class="d-flex justify-content-center">
                <p class="border border-primary border-3 rounded p-3 ${hasSelected ? 'bg-primary' : ''}">
                    ?
                </p>
            </div>
            <i class="fa-solid fa-user fs-1 text-light"></i>
            <div class="mt-2">
                ${player.name}
                ${isPlayer ?  '<button id="edit-name" class="btn btn-outline-light btn-sm"><i class="fa-solid fa-pen-to-square"></i></button>' : ''}
            </div>
        </div>
    </div>`;
}

const cards = document.getElementsByClassName('point-card');

for (const card of cards) {
    card.addEventListener('click', () => {
        socket.emit("PLAYER_UPDATE_REQUEST", roomId, playerId, { card: card.textContent }, (res) => {
            renderRoom(res);
        });
    });
}

document.getElementById('reveal').addEventListener('click', () => {

});

