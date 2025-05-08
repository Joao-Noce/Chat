const socket = io();

const form = document.getElementById('formPrompt');
const input = document.getElementById('input');
const messages = document.getElementById('messages');
const roomForm = document.getElementById('roomForm');
const roomName = document.getElementById('roomName');
const roomPassword = document.getElementById('roomPassword');
const joinRoom = document.getElementById('joinRoom');
const createRoom = document.getElementById('createRoom');
const user = document.getElementById('user');
const containerSalas = document.getElementById('containerSalas');

let salas;
roomForm.style.display = "none";
form.style.display = "none";
caixaMessages.style.display = "none";
header.style.display = "none";
socket.emit('ver salas');

socket.on('ver salas', (data) => {
    salas = data.rows;
    tabelaSalas.innerHTML = `
    <div class="linha" style="background: transparent; border: solid white 1px;" onclick="abrirFormCreate()"><i class="fa-regular fa-circle-xmark fa-rotate-by" style="--fa-rotate-angle: 45deg; font-size: 30px; color: white;"></i></div>
    `;

    salas.forEach(dataAtual => {
        tabelaSalas.innerHTML += `
            <div class="linha" onclick="abrirForm('${dataAtual.nomeSala}')">
                <div style="border-right: solid black 2px;">Nome da sala: ${dataAtual.nomeSala}</div>
                <div style="border-right: solid black 2px;">Criador: ${dataAtual.criador}</div>
                <div>Usuários online: ${dataAtual.totalOnline}</div>
            </div>`;
    });
});

function pesquisar(valor) {
    console.log(salas);

    if (valor.length > 0) {
        const salasFiltradas = salas.filter(sala => sala.nomeSala.toLowerCase().startsWith(valor.toLowerCase()));
        tabelaSalas.innerHTML = `
    <div class="linha" style="background: transparent; border: solid white 1px;" onclick="abrirFormCreate()"><i class="fa-regular fa-circle-xmark fa-rotate-by" style="--fa-rotate-angle: 45deg; font-size: 30px; color: white;"></i></div>
    `;
        if (salasFiltradas.length == 0) {
            tabelaSalas.innerHTML += `
            <div class="linha">
                <div>No matching room!</div>
            </div>`;
        } else {
            salasFiltradas.forEach(sala => {
                tabelaSalas.innerHTML += `
            <div class="linha" onclick="abrirForm('${sala.nomeSala}')">
                <div style="border-right: solid black 2px;">Nome da sala: ${sala.nomeSala}</div>
                <div style="border-right: solid black 2px;">Criador: ${sala.criador}</div>
                <div>Jogadores online: ${sala.totalOnline}</div>
            </div>`;
            });
        }
    } else {
        tabelaSalas.innerHTML = `
    <div class="linha" style="background: transparent; border: solid white 1px;" onclick="abrirFormCreate()"><i class="fa-regular fa-circle-xmark fa-rotate-by" style="--fa-rotate-angle: 45deg; font-size: 30px; color: white;"></i></div>
    `;
        salas.forEach(sala => {
            tabelaSalas.innerHTML += `
            <div class="linha" onclick="abrirForm('${sala.nomeSala}')">
                <div style="border-right: solid black 2px;">Nome da sala: ${sala.nomeSala}</div>
                <div style="border-right: solid black 2px;">Criador: ${sala.criador}</div>
                <div>Jogadores online: ${sala.totalOnline}</div>
            </div>`;
        });
    }
}

function abrirForm(sala) {
    roomForm.style.display = "flex";
    containerSalas.style.display = "none";
    currentRoom = sala;
    roomName.style.display = "none";
    createRoom.style.display = "none";
    joinRoom.style.display = "unset";
    roomPassword.value = '';
    user.value = '';
}

function abrirFormCreate() {
    roomForm.style.display = "flex";
    containerSalas.style.display = "none";
    roomName.style.display = "unset";
    createRoom.style.display = "unset";
    joinRoom.style.display = "none";
    roomPassword.value = '';
    user.value = '';
}

function sairContainerEntrar() {
    roomForm.style.display = "none";
    containerSalas.style.display = "flex";
}

let currentRoom = null;
let userName = user.value;
let criador = null;

roomForm.addEventListener('submit', (e) => {

    e.preventDefault();
    if (user.value && roomName.value && roomPassword.value) {
        console.log(user.value, roomName.value, roomPassword.value);

        socket.emit('createRoom', { nome: roomName.value, senha: roomPassword.value, user: user.value });
    }
});

socket.on('roomCreated', (data) => {
    if (data.success) {
        currentRoom = roomName.value;
        roomName.value = '';
        roomPassword.value = '';
        userName = user.value;
        criador = userName;
        user.value = '';
        form.style.display = "flex";
        caixaMessages.style.display = "unset";
        header.innerHTML = currentRoom;
        header.style.display = "unset";
        roomForm.style.display = "none";
        document.body.style = "background-position-x: 50%;";
        mudarIframe(true);
    } else console.log(data.error);
})

joinRoom.addEventListener('click', (e) => {
    e.preventDefault();

    if (user.value && currentRoom && roomPassword.value) {
        socket.emit('joinRoom', { nome: currentRoom, senha: roomPassword.value, user: user.value }, (response) => {
            if (response.success) {
                roomName.value = '';
                roomPassword.value = '';
                userName = user.value;
                user.value = '';
                form.style.display = "flex";
                caixaMessages.style.display = "unset";
                header.style.display = "unset";
                roomForm.style.display = "none";
                header.innerHTML = currentRoom;
                messages.innerHTML = `
                <div style="margin-bottom: 8vh;"></div>`;
                document.body.style = "background-position-x: 50%;";
                mudarIframe(true);
                console.log(`${userName} entrou na sala: ${currentRoom}`);
            } else {
                console.log(response.error);
            }
        });
    }
});

enviarMensagem.addEventListener('click', (e) => {
    e.preventDefault();
    enviar();
})

formPrompt.addEventListener('submit', (e) => {
    e.preventDefault();
    enviar();
})

function enviar() {
    if (userName && input.value && currentRoom) {
        socket.emit('chat message', { room: currentRoom, message: input.value, user: userName });
        input.value = '';
    }
}

socket.on('chat message', (data) => {
    if (data.room === currentRoom) {
        const linha = document.createElement('div');
        const item = document.createElement('div');
        linha.classList.add('linha');
        item.classList.add('mensagem');

        if (data.user === userName) {
            item.classList.add('rightMessage');
            linha.classList.add('linhaRight');
            item.textContent = `${data.message}`;
        } else {
            item.classList.add('leftMessage');
            linha.classList.add('linhaLeft');
            item.textContent = `${data.user} - ${data.message}`;
        }
        linha.appendChild(item);
        messages.appendChild(linha);
        messages.scrollTop = messages.scrollHeight;
    }
});

function mudarIframe(entrou) {
    if (entrou) tres_barras.innerHTML = `<i class="fa-solid fa-bars" onclick="mudarIframe(false)"></i>`;
    else {
        socket.emit('sair', { room: currentRoom, user: userName });
        socket.emit('ver salas');
        form.style.display = "none";
        caixaMessages.style.display = "none";
        header.style.display = "none";
        containerSalas.style.display = "flex";
        document.body.style = "background-position-x: 90%;";
        tres_barras.innerHTML = `<a href="menu.html"><i class="fa-solid fa-bars"></i></a>`;
    }
}

socket.on('avisar sala', (data) => {
    criador = data.criador;
    if (data.room == currentRoom && data.user != userName) {
        const linha = document.createElement('div');
        const item = document.createElement('div');
        linha.classList.add('linha');
        item.classList.add('mensagem');
        item.classList.add('centerMessage');
        linha.classList.add('linhaCenter');
        item.textContent = `${data.user} ${data.aviso}`;
        linha.appendChild(item);
        messages.appendChild(linha);
        messages.scrollTop = messages.scrollHeight;
    }
})

document.addEventListener("DOMContentLoaded", () => {
    const icons = document.getElementsByName("icon");
    icons.forEach(icon => {
        const randomTop = Math.random() * 100 - 10;
        const randomLeft = Math.random() * 100 - 10;
        const randomSize = Math.random() * 30 + 20;

        icon.style.top = `${randomTop}vh`;
        icon.style.left = `${randomLeft}vw`;
        icon.style.fontSize = `${randomSize}px`;
    });
});