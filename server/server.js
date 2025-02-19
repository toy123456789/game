const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const path = require("path");

// Создание Express-приложения
const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Подключение статических файлов из папки "client"
app.use(express.static(path.join(__dirname, "../client")));

// Добавляем маршрут для корня (/)
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../client/index.html"));
});

// Хранилище игр
const games = {};

// Функция для раздачи карт
function dealCards() {
  const deck = ["jack", "queen", "king", "ace"];
  const shuffledDeck = deck.sort(() => Math.random() - 0.5);
  return {
    player1: shuffledDeck.slice(0, 2),
    player2: shuffledDeck.slice(2),
  };
}

// Обработка подключений
io.on("connection", (socket) => {
  console.log("Новый игрок подключился");

  // Присоединение к игре
  socket.on("join-game", (data) => {
    const { gameId, playerId } = data;

    if (!gameId || !playerId) {
      console.error(`Ошибка: Не переданы gameId или playerId. Полученные данные:`, data);
      return;
    }

    console.log(`Сервер получил join-game: gameId=${gameId}, playerId=${playerId}`); // Временный лог

    if (!games[gameId]) {
      games[gameId] = { players: {}, state: { cards: {}, currentPlayer: 1 } };
    }

    games[gameId].players[playerId] = socket.id;
    socket.join(gameId);

    console.log(`Игрок ${playerId} присоединился к игре ${gameId}`);

    // Если второй игрок присоединился, начинаем игру
    if (Object.keys(games[gameId].players).length === 2) {
      const cards = dealCards();
      games[gameId].state.cards.player1 = cards.player1;
      games[gameId].state.cards.player2 = cards.player2;

      // Отправляем начальное состояние игры обоим игрокам
      io.to(gameId).emit("start-game", {
        cards: games[gameId].state.cards,
        currentPlayer: games[gameId].state.currentPlayer,
      });
    } else {
      // Если только один игрок, ждём второго
      io.to(socket.id).emit("waiting-for-player", "Ожидание второго игрока...");
    }
  });

  // Отправка хода
  socket.on("play-card", (data) => {
    const { gameId, player, card } = data;

    if (!games[gameId]) {
      console.error(`Ошибка: Игра с ID ${gameId} не найдена`);
      return;
    }

    console.log(`Сервер получил play-card: gameId=${gameId}, player=${player}, card=${card}`); // Временный лог

    // Обновляем состояние игры
    games[gameId].state[player] = card; // Сохраняем карту текущего игрока
    games[gameId].currentPlayer = player === "player1" ? "player2" : "player1"; // Передаём ход другому игроку

    // Отправляем обновление всем игрокам
    io.to(gameId).emit("update-game", {
      currentPlayer: games[gameId].currentPlayer,
      player1: games[gameId].state.player1,
      player2: games[gameId].state.player2,
    });
  });

  // Отключение игрока
  socket.on("disconnect", () => {
    console.log("Игрок отключился");
    for (const gameId in games) {
      for (const playerId in games[gameId].players) {
        if (games[gameId].players[playerId] === socket.id) {
          delete games[gameId].players[playerId];
          if (Object.keys(games[gameId].players).length === 0) {
            delete games[gameId];
            console.log(`Игра ${gameId} завершена (все игроки отключились)`);
          }
        }
      }
    }
  });
});

// Запуск сервера
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  const os = require("os"); // Для получения IP-адреса
  const networkInterfaces = os.networkInterfaces();

  // Находим IPv4-адрес
  let localIp = "127.0.0.1";
  for (const key in networkInterfaces) {
    const iface = networkInterfaces[key].find(
      (details) => details.family === "IPv4" && !details.internal
    );
    if (iface) {
      localIp = iface.address;
      break;
    }
  }

  console.log(`Сервер запущен на порту ${PORT}`);
  console.log(`Доступен по адресу: http://${localIp}:${PORT}`);
});