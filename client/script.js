// Создание соединения с сервером через WebSocket
const socket = io();

// Глобальные переменные
let selectedCard = null; // Выбранная карта
let currentPlayer = "";  // Текущий игрок
let gameId = "";         // ID игры
let playerId = "";       // ID игрока

// Функция для присоединения к игре
function joinGame() {
  console.log("Функция joinGame вызвана!"); // Временный лог
  gameId = "room123"; // ID игры
  playerId = prompt("Введите ваш ID игрока (например, player1):"); // Запрос ID игрока

  if (!playerId || playerId.trim() === "") {
    alert("ID игрока не может быть пустым!");
    return;
  }

  const data = { gameId, playerId }; // Создаём объект данных
  console.log(`Отправляем join-game:`, data); // Временный лог
  socket.emit("join-game", data); // Отправляем запрос на присоединение
  document.getElementById("start-button").disabled = true; // Блокируем кнопку "Начать игру"
}

// Функция для отображения карт игрока
function renderCards(playerCards) {
  const cardsContainer = document.getElementById("cards-container");
  if (!cardsContainer) {
    console.error("Элемент cards-container не найден!");
    return;
  }
  cardsContainer.innerHTML = ""; // Очищаем предыдущие карты

  playerCards.forEach((card, index) => {
    const cardElement = document.createElement("div");
    cardElement.className = "card";
    cardElement.dataset.card = card; // Сохраняем название карты в data-атрибуте

    // Создаём элемент <img> для изображения карты
    const imgElement = document.createElement("img");
    imgElement.src = `images/${card}.png`; // Путь к изображению
    imgElement.alt = card; // Альтернативный текст
    imgElement.style.width = "80px";
    imgElement.style.height = "120px";

    // Добавляем обработчик клика для выбора карты
    cardElement.addEventListener("click", () => {
      if (selectedCard !== null) {
        document.querySelector(".card.selected")?.classList.remove("selected");
      }
      cardElement.classList.add("selected");
      selectedCard = card;

      // Активируем кнопку "Сделать ход"
      const playCardButton = document.getElementById("play-card-button");
      if (playCardButton) playCardButton.disabled = false;
    });

    cardElement.appendChild(imgElement); // Добавляем изображение в карточку
    cardsContainer.appendChild(cardElement); // Добавляем карточку в контейнер
  });
}

// Функция для завершения игры
function endGame() {
  const playCardButton = document.getElementById("play-card-button");
  const startButton = document.getElementById("start-button");

  if (playCardButton) playCardButton.disabled = true;
  if (startButton) startButton.disabled = false;

  selectedCard = null;
  currentPlayer = "";
}

// Обработчик кнопки "Начать игру"
const startButton = document.getElementById("start-button");
if (startButton) {
  startButton.addEventListener("click", () => {
    console.log("Кнопка 'Начать игру' нажата!"); // Временный лог
    joinGame(); // Присоединяемся к игре
  });
} else {
  console.error("Элемент start-button не найден!");
}

// Обработчик кнопки "Сделать ход"
const playCardButton = document.getElementById("play-card-button");
if (playCardButton) {
  playCardButton.addEventListener("click", () => {
    if (!selectedCard) return;

    console.log(`Отправляем ход: ${selectedCard}`); // Временный лог

    // Отправляем ход на сервер
    socket.emit("play-card", { gameId, player: playerId, card: selectedCard });

    const resultDiv = document.getElementById("result");
    if (resultDiv) {
      resultDiv.textContent = `Игрок ${playerId} положил: ${selectedCard}`;
    }

    // Сбрасываем выбранную карту
    selectedCard = null;
    playCardButton.disabled = true;
  });
} else {
  console.error("Элемент play-card-button не найден!");
}

// Получение обновлений от сервера
socket.on("update-game", (data) => {
  console.log("Обновление игры:", data);

  const resultDiv = document.getElementById("result");
  if (resultDiv) {
    resultDiv.textContent = `Игрок ${
      data.currentPlayer === "player1" ? "player2" : "player1"
    } сделал ход.`;

    // Если дама — объявляем победителя
    if (
      data.player1 === "queen" ||
      data.player2 === "queen"
    ) {
      resultDiv.textContent += " — Победа!";
      endGame();
    }
  }

  // Обновляем карты на столе
  const tableCardsDiv = document.getElementById("table-cards");
  if (tableCardsDiv) {
    tableCardsDiv.innerHTML = ""; // Очищаем предыдущие карты на столе

    // Добавляем все карты на столе
    if (data.player1) {
      addCardToTable(tableCardsDiv, data.player1, "player1");
    }
    if (data.player2) {
      addCardToTable(tableCardsDiv, data.player2, "player2");
    }
  } else {
    console.error("Элемент table-cards не найден!");
  }
});

// Функция для добавления карты на стол
function addCardToTable(tableCardsDiv, card, player) {
  console.log(`Добавляем карту ${card} для игрока ${player}`); // Временный лог

  const tableCardElement = document.createElement("div");
  tableCardElement.className = "card";

  const imgElement = document.createElement("img");
  imgElement.src = `images/${card}.png`;
  imgElement.alt = card;
  imgElement.style.width = "80px";
  imgElement.style.height = "120px";

  tableCardElement.appendChild(imgElement);
  tableCardsDiv.appendChild(tableCardElement);
}

// Начало игры
socket.on("start-game", (data) => {
  console.log("Получено событие start-game:", data); // Временный лог

  // Отображаем карты текущего игрока
  if (data.cards[playerId]) {
    renderCards(data.cards[playerId]);
  } else {
    console.error(`Ошибка: Карты для игрока ${playerId} не найдены`);
  }

  const resultDiv = document.getElementById("result");
  if (resultDiv) {
    resultDiv.textContent = "Игра началась!";
  }
});

// Ожидание второго игрока
socket.on("waiting-for-player", (message) => {
  console.log("Получено сообщение waiting-for-player:", message); // Временный лог

  const resultDiv = document.getElementById("result");
  if (resultDiv) {
    resultDiv.textContent = message;
  }
});