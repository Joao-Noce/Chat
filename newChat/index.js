import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import path from "path";
import sqlite3 from "sqlite3";
import { open } from "sqlite";
import cluster from 'node:cluster';
import { fileURLToPath } from 'node:url';
import { createAdapter, setupPrimary } from '@socket.io/cluster-adapter';

const app = express();
const server = createServer(app);
const io = new Server(server);
if (cluster.isPrimary) {
  cluster.fork();

  setupPrimary();
} else {
  const port = 3000;
  const app = express();
  const server = createServer(app);
  const io = new Server(server, {
    connectionStateRecovery: {},
    adapter: createAdapter(),
  });
  const __dirname = path.dirname(fileURLToPath(import.meta.url));

  // Configuração do banco de dados
  const initDB = async () => {
    const db = await open({
      filename: path.join(__dirname, 'chat.db'),
      driver: sqlite3.Database,
    });

    await db.exec(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user TEXT,
      sala TEXT,
      content TEXT
    );
  `);

    return db;
  };

  const db = await initDB();

  
  app.use(express.static(path.join(__dirname, "public")));

  
  app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public/index.html"));
  });

  io.on('connection', (socket) => {

    socket.on('createRoom', async ({ nome, senha, user }) => {
      const rows = await db.all('SELECT nomeSala FROM sala WHERE nomeSala = ?', nome);
      if (rows.length == 0) {

        await db.run('INSERT INTO sala (nomeSala, senha, totalOnline, criador) VALUES (?, ?, ?, ?)', nome, senha, 1, user);
        socket.join(nome);
        socket.emit('roomCreated', { success: true });
      } else {
        socket.emit('roomCreated', { success: false, error: 'Room already exists.' });
      }
    });

    socket.on('joinRoom', async ({ nome, senha, user }, callback) => {
      const rowsSala = await db.all('SELECT idSala, nomeSala, senha, totalOnline, criador FROM sala WHERE nomeSala = ? AND senha = ?', nome, senha);
      if (rowsSala.length == 1) {
        await db.run(`UPDATE sala SET totalOnline = ${rowsSala[0].totalOnline + 1} WHERE idSala = ${rowsSala[0].idSala}`);
        socket.join(nome);
        try {
          const rowsMessage = await db.all('SELECT user, content FROM messages WHERE sala = ?', rowsSala[0].idSala);
          rowsMessage.forEach((row) => {
            socket.emit('chat message', { user: row.user, room: nome, message: row.content });
          });
          callback({ success: true });
        } catch (err) {
          console.error('Erro ao recuperar mensagens:', err.message);
          callback({ success: false, error: 'Erro ao recuperar mensagens.' });
        }
        const aviso = 'se juntou à festa';
        io.to(nome).emit('avisar sala', { room: nome, user, aviso, criador: rowsSala[0].criador });
      } else {
        callback({ success: false, error: 'Invalid room name or password.' });
      }
    });

    socket.on('ver salas', async () => {
      const rows = await db.all('SELECT nomeSala, totalOnline, criador FROM sala;');
        socket.emit('ver salas', { rows });
    });

    socket.on('chat message', ({ room, message, user }) => {
      (async () => {
        try {
          const rowsSala = await db.all('SELECT idSala FROM sala WHERE nomeSala = ?', room);

          await db.run('INSERT INTO messages (user, content, sala) VALUES (?, ?, ?)', user, message, rowsSala[0].idSala);
          io.to(room).emit('chat message', { user, room, message });
        } catch (err) {
          console.error('Erro ao salvar mensagem:', err.message);
        }
      })();
    });

    socket.on('sair', ({room, user}) => {
      
      (async () => {
        try {
          const rowsSala = await db.all('SELECT totalOnline FROM sala WHERE nomeSala = ?', room);
          
          await db.run(`UPDATE sala SET totalOnline = ${rowsSala[0].totalOnline - 1} WHERE nomeSala = ?`, room);
          const aviso = 'deslogou';
          io.to(room).emit('avisar sala', { user, room, aviso });
        } catch (err) {
          console.error('Erro ao sair:', err.message);
        }
      })();
    });

    socket.on('truncateTableMessages', () => {
      (async () => {
        try {
          await db.run('DELETE FROM messages');
          io.emit('truncateTable');
        } catch (err) {
          console.error('Erro ao limpar banco de dados:', err.message);
        }
      })();
    });

    socket.on('truncateTableSala', () => {
      (async () => {
        try {
          await db.run('DELETE FROM sala');
          io.emit('truncateTable');
        } catch (err) {
          console.error('Erro ao limpar banco de dados:', err.message);
        }
      })();
    });
  });

  server.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
  });

}