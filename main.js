let rocket;
let thrust = 0;
let turnLeft = 0;
let turnRight = 0;
let neuralNetwork;
let perceptron;
let stepCount = 0;

let replayBuffer = [];
let maxReplayBufferSize = 2000;

let epsilon = 1.0; // Начальная случайность
let epsilonDecay = 0.02 // Коэффициент уменьшения
let minEpsilon = 0.1; // Минимальная случайность

let rewardHistory = [];
let averageReward = 0;
let rewardWindow = 60;

let currentExplorationAction = null;
let explorationDuration = 0;
let maxExplorationDuration = 60; // Максимальное число шагов для одного действия

let maxExplorationTime = 600; // Максимальное число шагов для исследования

let rewardHistoryGraph = [];
let errorHistoryGraph = [];
let graphMaxPoints = 300; // Максимальное количество точек на графике

let lrSlider, explorationDurationSlider, bufferSlider, batchSlider, greedCheckbox, trainingCheckbox, resetCheckbox, learningRate = 0.001, pauseCheckbox;
let enableTraining = true;
let enableGreed = true;
let enableReset = true;
let pause = false;

function setup()
{
    rocket = new Rocket();
    rocket.setup();

    neuralNetwork = new NeuralNetwork();
    neuralNetwork.init();

    initUI()
}

function draw()
{
    let rocketState = rocket.getState();

    let commands;

    if (pause) {
        noLoop();
    }

    if (enableGreed && Math.random() < epsilon) {
        // Случайное действие

        if (explorationDuration === 0) {
            // Случайное действие
            let action = Math.floor(random(0, 4));
            currentExplorationAction = {
                thrust: action === 0,
                turnLeft: action === 1,
                turnRight: action === 2,
                doNothing: action === 3,
                index: action
            };
            explorationDuration = Math.floor(Math.random() * maxExplorationDuration) + 1;
        }
        explorationDuration--;
        commands = currentExplorationAction;
    } else {
        // Действие, предсказанное нейросетью
        perceptron = neuralNetwork.getPerceptron();
        neuralNetwork.setInput(rocketState);
        perceptron.forwardPass();
        commands = neuralNetwork.getOutputCommands();
    }

    thrust = commands.thrust;
    turnLeft = commands.turnLeft;
    turnRight = commands.turnRight;

    rocket.drawAll(thrust, turnLeft, turnRight);
    this.drawGraphs();

    const nextState = rocket.getState();

    const reward = calculateReward(rocketState);

    replayBuffer.push({
        state: rocketState,
        action: commands.index, // Индекс действия (0, 1 или 2, 3 - do nothing)
        reward: reward,
        nextState: nextState
    });

    if (replayBuffer.length > maxReplayBufferSize) {
        replayBuffer.shift();
    }

    stepCount++;
    if (enableTraining && stepCount % 300 === 0 && replayBuffer.length >= rewardWindow && epsilon > minEpsilon) {
        const batch = sampleBatch(replayBuffer, rewardWindow);
        // console.log(`Step ${stepCount}: Training batch`, batch);
        neuralNetwork.trainFromBatch(batch, 0.99); // gamma = 0.99

        // console.log(batch);
        epsilon = epsilon - epsilonDecay;
    }

    rewardHistory.push(reward);
    if (rewardHistory.length > rewardWindow) {
        rewardHistory.shift();
    }

    averageReward = rewardHistory.reduce((a, b) => a + b, 0) / rewardHistory.length;

    if (enableReset && (stepCount % maxExplorationTime === 0 || rocketState.isDestroyed)) {

        rocket.setup(); // Перезапуск ракеты каждые 500 шагов или после уничтожения
        console.log("Rocket restarted...");
    }

    if (stepCount % 300 === 0) {
        rewardHistoryGraph.push(averageReward);
        if (rewardHistoryGraph.length > graphMaxPoints) {
            rewardHistoryGraph.shift();
        }
    }

    rewardWindow = batchSlider.value();
    enableGreed = greedCheckbox.checked();
    enableTraining = trainingCheckbox.checked();
    enableReset = resetCheckbox.checked();
    pause = pauseCheckbox.checked();
}

function calculateReward(state) {
    let reward = 0;

    // Штраф за разрушение
    if (state.isDestroyed) {
        return -1; // Максимальный штраф
    }

    // Штраф за отклонение ориентации от вертикали
    const orientationVector = createVector(state.orientation.x, state.orientation.y);
    const verticalVector = createVector(0, -1);
    const angle = degrees(orientationVector.angleBetween(verticalVector));
    const orientationPenalty = map(abs(angle), 0, 180, 0, 100); // Чем больше угол, тем сильнее штраф
    reward -= orientationPenalty;

    // Штраф за высокую горизонтальную скорость
    const horizontalSpeed = abs(state.velocity.x);
    const speedPenalty = map(horizontalSpeed, 0, 5, 0, 600); // Линейное увеличение штрафа
    reward -= speedPenalty;

    // Бонус за стабильную скорость
    const verticalSpeed = abs(state.velocity.y);
    const stableSpeedBonus = map(verticalSpeed, 0, 2, 150, 0); // Чем ближе к 0, тем больше бонус
    reward += stableSpeedBonus;

    reward += state.lifeTime * 2;

    // Ограничение награды в диапазоне [-1, 1]
    const maxReward = 1000;
    reward = Math.max(Math.min(reward, maxReward), -maxReward);
    reward /= maxReward;

    return reward;
}


function sampleBatch(buffer, batchSize) {
    const batch = [];
    for (let i = 0; i < batchSize; i++) {
        const randomIndex = Math.floor(Math.random() * buffer.length);
        batch.push(buffer[randomIndex]);
    }

    return batch;
}

function drawGraphs() {
    const graphWidth = 300;  // Ширина графика
    const graphHeight = 150; // Высота графика
    const offsetX = 530;      // Отступ слева
    const offsetY = 50;      // Отступ сверху для начала графиков

    // Полупрозрачный фон графиков
    fill(255, 255, 255, 50); // Белый с прозрачностью
    stroke(0);
    rect(offsetX, offsetY, graphWidth, graphHeight); // Фон графика средней награды
    rect(offsetX, offsetY + graphHeight + 10, graphWidth, graphHeight); // Фон графика ошибки

    // Сетка для графиков
    stroke(200); // Светло-серый цвет сетки
    for (let i = 0; i <= 4; i++) { // Горизонтальные линии
        const y = offsetY + (graphHeight / 4) * i;
        line(offsetX, y, offsetX + graphWidth, y);
        line(offsetX, y + graphHeight + 10, offsetX + graphWidth, y + graphHeight + 10);
    }
    for (let i = 0; i <= 4; i++) { // Вертикальные линии
        const x = offsetX + (graphWidth / 4) * i;
        line(x, offsetY, x, offsetY + graphHeight);
        line(x, offsetY + graphHeight + 10, x, offsetY + graphHeight + 10 + graphHeight);
    }

    // График средней награды (линии и точки)
    stroke(0, 255, 0); // Зеленый цвет линий
    noFill();
    beginShape();
    for (let i = 0; i < rewardHistoryGraph.length; i++) {
        const x = map(i, 0, rewardHistoryGraph.length, offsetX, offsetX + graphWidth);
        const y = map(rewardHistoryGraph[i], -1, 1, offsetY + graphHeight, offsetY);
        vertex(x, y); // Прямые линии между точками
    }
    endShape();

    // Точки для средней награды
    fill(0, 255, 0); // Зеленый цвет
    noStroke();
    for (let i = 0; i < rewardHistoryGraph.length; i++) {
        const x = map(i, 0, rewardHistoryGraph.length, offsetX, offsetX + graphWidth);
        const y = map(rewardHistoryGraph[i], -1, 1, offsetY + graphHeight, offsetY);
        circle(x, y, 3);
    }
    fill(0);
    textSize(12);
    text("Reward avg", offsetX + 5, offsetY + 15);
    text("1", offsetX - 8, offsetY + 5);
    text("0", offsetX - 12, offsetY + graphHeight/2);
    text("-1", offsetX - 12, offsetY + graphHeight);

    // График ошибки (линии и точки)
    stroke(255, 0, 0); // Красный цвет линий
    noFill();
    beginShape();
    for (let i = 0; i < errorHistoryGraph.length; i++) {
        const x = map(i, 0, errorHistoryGraph.length, offsetX, offsetX + graphWidth);
        const y = map(errorHistoryGraph[i], 0, Math.max(...errorHistoryGraph, 1), offsetY + graphHeight + 10 + graphHeight, offsetY + graphHeight + 10);
        vertex(x, y); // Прямые линии между точками
    }
    endShape();

    // Точки для ошибки сети
    fill(255, 0, 0); // Красный цвет
    noStroke();
    for (let i = 0; i < errorHistoryGraph.length; i++) {
        const x = map(i, 0, errorHistoryGraph.length, offsetX, offsetX + graphWidth);
        const y = map(errorHistoryGraph[i], 0, Math.max(...errorHistoryGraph, 1), offsetY + graphHeight + 10 + graphHeight, offsetY + graphHeight + 10);
        circle(x, y, 3);
    }
    fill(0);
    textSize(12);
    text("Network error", offsetX + 5, offsetY + graphHeight + 25);

    text("Epoch:" + neuralNetwork.epoch + "     Epsilon greedy: " + epsilon.toFixed(3) + "   Reward avg:" + averageReward.toFixed(3), offsetX + 5, offsetY - 35);
}


function togglePause() {
    pause = pauseCheckbox.checked(); // Получаем состояние чекбокса
    if (pause) {
        noLoop(); // Останавливаем цикл
    } else {
        loop(); // Возобновляем цикл
    }
}

function initUI()
{
    const posX = 10;
    const posY = 240;
    const lineHeight = 20;

    // Learning Rate Slider
    const lrLabel = createP(`Learning Rate: ${learningRate.toFixed(4)}`).position(posX, posY + 0 * lineHeight - 8);
    lrSlider = createSlider(0.0001, 0.01, learningRate, 0.0001);
    lrSlider.style('width', '200px').position(posX, posY + 1 * lineHeight);
    lrSlider.input(() => {
        learningRate = lrSlider.value();
        lrLabel.html(`Learning Rate: ${learningRate.toFixed(4)}`);
    });

    // Replay Buffer Size Slider
    const bufferLabel = createP(`Replay Buffer Size: ${maxReplayBufferSize}`).position(posX, posY + 2 * lineHeight - 8);
    bufferSlider = createSlider(200, 2000, maxReplayBufferSize, 50);
    bufferSlider.style('width', '200px').position(posX, posY + 3 * lineHeight);
    bufferSlider.input(() => {
        maxReplayBufferSize = bufferSlider.value();
        bufferLabel.html(`Replay Buffer Size: ${maxReplayBufferSize}`);
    });

    // Batch Size Slider
    const batchLabel = createP(`Batch Size: ${rewardWindow}`).position(posX, posY + 4 * lineHeight - 8);
    batchSlider = createSlider(30, 500, rewardWindow, 10);
    batchSlider.style('width', '200px').position(posX, posY + 5 * lineHeight);
    batchSlider.input(() => {
        rewardWindow = batchSlider.value();
        batchLabel.html(`Batch Size: ${rewardWindow}`);
    });

    // Checkboxes
    greedCheckbox = createCheckbox("Enable Greed", enableGreed).position(posX, posY + 6 * lineHeight);
    greedCheckbox.changed(() => {
        enableGreed = greedCheckbox.checked();
    });

    trainingCheckbox = createCheckbox("Enable Training", enableTraining).position(posX, posY + 7 * lineHeight);
    trainingCheckbox.changed(() => {
        enableTraining = trainingCheckbox.checked();
    });

    resetCheckbox = createCheckbox("Enable Reset", enableReset).position(posX, posY + 8 * lineHeight);
    resetCheckbox.changed(() => {
        enableReset = resetCheckbox.checked();
    });

    pauseCheckbox = createCheckbox("Pause", pause).position(posX, posY + 9 * lineHeight);
    pauseCheckbox.changed(togglePause);
}
