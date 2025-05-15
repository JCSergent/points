import { Tooltip } from "bootstrap";
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

//Init Tooltips
var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'))
tooltipTriggerList.map(function (tooltipTriggerEl) {
  return new Tooltip(tooltipTriggerEl)
});

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
    document.getElementById("title").textContent = 'Room #' + room.id;
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
    let scores = new Map();
    choices.forEach((c) => scores.set(c, 0))

    let playerNodes = '';
    for (const playerEntry of Object.entries(room.players)) {
        if (playerEntry[1].spectating) {
            continue;
        }

        playerNodes += createPlayerNode(playerEntry[0], playerEntry[1], room.state);

        if (playerEntry[1].card != '') {
            scores.set(playerEntry[1].card, scores.get(playerEntry[1].card) + 1);
        }
    }
    document.getElementById('players').innerHTML = playerNodes;


    if (room.state == 'reveal') {
        let scoreNodes = '';
        let totalScore = 0;
        const totalTally = scores.values().reduce((a,b) => a + b);
        for (var score of scores.entries()) {
            if (!isNaN(score[0])) {
                totalScore += parseInt(score[0]) * score[1];
            }

            scoreNodes += createScoreNode(score[0], score[1], totalTally);
        }

        totalScore = totalScore / totalTally;
        if (isNaN(totalScore) || totalScore == 0) {
            document.getElementById('results-title').innerHTML = 'No Results';
        } else {
            document.getElementById('results-title').innerHTML = 'Average: ' + totalScore.toFixed(1);
        }

        document.getElementById('bar-chart').innerHTML = scoreNodes;
        document.getElementById('reveal').classList.add('d-none');
        document.getElementById('reset').classList.remove('d-none');
        document.getElementById('stats').classList.remove('d-none');
    } else {
        document.getElementById('reveal').classList.remove('d-none');
        document.getElementById('reset').classList.add('d-none');
        document.getElementById('stats').classList.add('d-none');
    }

    if (room.players[playerId].spectating) {
        document.getElementById('is-not-spectating').classList.add('d-none');
        document.getElementById('is-spectating').classList.remove('d-none');
        document.getElementById('cards').classList.add('d-none');
    } else {
        const playersCard = room.players[playerId].card;
        for (const card of cards) {
            card.classList.remove('bg-primary');
            if (card.textContent == playersCard) {
                card.classList.add('bg-primary');
            }
        }

        document.getElementById('is-spectating').classList.add('d-none');
        document.getElementById('is-not-spectating').classList.remove('d-none');
        document.getElementById('cards').classList.remove('d-none');
    }


    endTime = room.timer;
    const currTime = new Date().getTime();
    if (endTime > currTime && timer == null) {
        startTimer();
    }
};


function createPlayerNode(id, player, gameState) {
    const isPlayer = id == playerId;
    const hasSelected = player.card != '';
    const isHidden = gameState == 'hidden';

    return `<div class="col text-center">
        <div class="d-flex flex-column justify-content-center">
            <div class="d-flex justify-content-center user-select-none">         
                <p class="${isHidden ? hasSelected ? 'border-primary bg-primary text-primary' : 'bg-dark text-dark' : player.card == '' ? 'text-dark' : 'border-primary'}  border border-3 rounded p-3">
                    ${isHidden ? '-' : player.card == '' ? '-' : player.card }
                </p>
            </div>
            <i class="fa-solid fa-user fs-1 text-light"></i>
            <div class="mt-2">
                ${player.name}
                ${isPlayer ?  '<button id="edit-name" data-bs-toggle="modal" data-bs-target="#nameModal" class="btn btn-outline-light btn-sm"><i class="fa-solid fa-pen-to-square"></i></button>' : ''}
            </div>
        </div>
    </div>`;
}

function createScoreNode(card, tally, totalTally) {
    return `<div class="d-flex flex-column-reverse align-items-center h-100">
      <div class="bar text-bg-success fs-6" style="height: ${(tally / totalTally) * 100}%;">
        ${tally == 0 ? '' : card}
        </div>
      <div class="text-center">${tally == 0 ? card : tally}</div>
    </div>`;
}


for (const card of cards) {
    card.addEventListener('click', () => {
        socket.emit("PLAYER_UPDATE_REQUEST", roomId, playerId, { card: card.textContent }, (res) => {
            renderRoom(res);
        });
    });
}

document.getElementById('clear-card').addEventListener('click', () => {
    socket.emit("PLAYER_UPDATE_REQUEST", roomId, playerId, { card: '' }, (res) => {
        renderRoom(res);
    });
});

document.getElementById('reveal').addEventListener('click', () => {
    socket.emit("ROOM_UPDATE_REQUEST", roomId, { state: 'reveal' }, (res) => {
        renderRoom(res);
    });
});

document.getElementById('reset').addEventListener('click', () => {
    socket.emit("ROOM_UPDATE_REQUEST", roomId, { state: 'hidden' }, (res) => {
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

document.getElementById('is-spectating').addEventListener('click', () => {
    socket.emit("PLAYER_UPDATE_REQUEST", roomId, playerId, { spectating: false }, (res) => {
        renderRoom(res);
    });
});

document.getElementById('is-not-spectating').addEventListener('click', () => {
    socket.emit("PLAYER_UPDATE_REQUEST", roomId, playerId, { spectating: true }, (res) => {
        renderRoom(res);
    });
});


// TIMER

var timer = null;
var endTime = 0;

function startTimer() {
    clearInterval(timer);
    document.getElementById('timer-btn').classList.remove('btn-outline-light');
    document.getElementById('timer-btn').classList.add('btn-outline-warning');

    updateTimer()
    timer = setInterval(updateTimer, 1000);
}

function updateTimer() {
    const currTime = new Date().getTime();

    if (currTime > endTime) {
        document.getElementById('timer-btn').classList.remove('btn-outline-warning');
        document.getElementById('timer-btn').classList.add('btn-outline-light');
        document.getElementById('timer').innerHTML = '';
        clearInterval(timer);
        timer = null;
        return;
    }

    var remainingSeconds = Math.trunc((endTime - currTime) / 1000);
    var minutes = Math.trunc(remainingSeconds / 60);

    var seconds = String(remainingSeconds - (minutes * 60))
    if (seconds.length == 1) {
        seconds = '0' + seconds;
    }

    minutes = String(minutes);
    if (minutes.length == 1) {
        minutes = '0' + minutes;
    }

    document.getElementById('timer').innerHTML = minutes + ':' + seconds + 's';
}

document.getElementById('start-timer').addEventListener('click', () => {
    const minuteTens = parseInt(document.getElementById('minute-tens').textContent);
    const minuteOnes = parseInt(document.getElementById('minute-ones').textContent);
    const secondTens = parseInt(document.getElementById('second-tens').textContent);
    const secondOnes = parseInt(document.getElementById('minute-ones').textContent);

    const duration = (minuteTens * 10 * 60 * 1000) + (minuteOnes * 60 * 1000) + (secondTens * 10 * 1000) + (secondOnes * 1000);
    const endTime = new Date().getTime() + duration;

    socket.emit("ROOM_UPDATE_REQUEST", roomId, { timer: endTime }, (res) => {
        renderRoom(res);
    });
});

function changeCounters(change, max, tensId, onesId) {
    const tens = parseInt(document.getElementById(tensId).textContent);
    const ones = parseInt(document.getElementById(onesId).textContent);
    var total = (tens * 10) + ones + change;

    if (total < 0) {
        total += max;
    } else if (total >= max) {
        total -= max;
    }

    var counter = total.toString().split('');
    if (counter.length == 1) {
        counter.unshift('0');
    }
    document.getElementById(tensId).textContent = counter[0];
    document.getElementById(onesId).textContent = counter[1];
}

document.getElementById('minute-tens-up').addEventListener('click', () => changeCounters(10, 100, 'minute-tens', 'minute-ones'));
document.getElementById('minute-tens-down').addEventListener('click', () => changeCounters(-10, 100, 'minute-tens', 'minute-ones'));
document.getElementById('minute-ones-up').addEventListener('click', () => changeCounters(1, 100, 'minute-tens', 'minute-ones'));
document.getElementById('minute-ones-down').addEventListener('click', () => changeCounters(-1, 100, 'minute-tens', 'minute-ones'));

document.getElementById('second-tens-up').addEventListener('click', () => changeCounters(10, 60, 'second-tens', 'second-ones'));
document.getElementById('second-tens-down').addEventListener('click', () => changeCounters(-10, 60, 'second-tens', 'second-ones'));
document.getElementById('second-ones-up').addEventListener('click', () => changeCounters(1, 60, 'second-tens', 'second-ones'));
document.getElementById('second-ones-down').addEventListener('click', () => changeCounters(-1, 60, 'second-tens', 'second-ones'));
