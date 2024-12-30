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
let epsilonDecay = 0.01 // Коэффициент уменьшения
let minEpsilon = 0.1; // Минимальная случайность

let rewardHistory = [];
let averageReward = 0;
let rewardWindow = 130;

let currentExplorationAction = null;
let explorationDuration = 0;
let aiControllDuration = 0;
let maxExplorationDuration = 100; // Максимальное число шагов для одного действия

let maxExplorationTime = 1200; // Максимальное число шагов для исследования
let currentExplorationTime = maxExplorationTime;

let rewardHistoryGraph = [];
let errorHistoryGraph = [];
let graphMaxPoints = 300; // Максимальное количество точек на графике

let lrSlider, explorationDurationSlider, bufferSlider, batchSlider, greedCheckbox, trainingCheckbox, resetCheckbox, learningRate = 0.001, pauseCheckbox;
let enableTraining = true;
let enableGreed = true;
let enableReset = true;
let pause = false;

const PILOT_AI = 'ai';
const PILOT_ROBOT = 'robot';
const PILOT_HUMAN = 'human';
let pilot = PILOT_AI;

let keyState = {
    left: false,
    right: false,
    thrust: false
};

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

    if (enableGreed && explorationDuration > 0) {
        // Продолжаем выполнять текущее случайное действие
        explorationDuration--;
        commands = currentExplorationAction;
        pilot = PILOT_ROBOT;
    } else if (enableGreed && Math.random() < epsilon && aiControllDuration === 0) {
        // Начинаем новое случайное действие
        let action = Math.floor(random(0, 4));
        currentExplorationAction = {
            thrust: action === 0,
            turnLeft: action === 1,
            turnRight: action === 2,
            doNothing: action === 3,
            index: action
        };
        explorationDuration = Math.floor(Math.random() * maxExplorationDuration) + 1;
        commands = currentExplorationAction;
        pilot = PILOT_ROBOT;
    } else {
        if (aiControllDuration > 0) {
            aiControllDuration--;
        } else {
            perceptron = neuralNetwork.getPerceptron();
            neuralNetwork.setInput(rocketState);
            perceptron.forwardPass();
            currentExplorationAction = neuralNetwork.getOutputCommands();
            aiControllDuration = Math.floor(Math.random() * maxExplorationDuration) + 1;
        }
        commands = currentExplorationAction;
        pilot = PILOT_AI;
    }


    thrust = keyState.thrust || commands.thrust;
    turnLeft = keyState.left || commands.turnLeft;
    turnRight = keyState.right || commands.turnRight;

    rocket.drawAll(thrust, turnLeft, turnRight);
    this.drawGraphs();
    this.drawPilot();

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
    if (enableTraining && stepCount % 200 === 0 && replayBuffer.length >= rewardWindow) {
        const batch = sampleBatch(replayBuffer, rewardWindow);
        // console.log(`Step ${stepCount}: Training batch`, batch);
        neuralNetwork.trainFromBatch(batch, 0.99); // gamma = 0.99

        // console.log(batch);
        if (epsilon > minEpsilon) {
            epsilon = epsilon - epsilonDecay;
        }
    }

    rewardHistory.push(reward);
    if (rewardHistory.length > rewardWindow) {
        rewardHistory.shift();
    }

    averageReward = rewardHistory.reduce((a, b) => a + b, 0) / rewardHistory.length;

    if (enableReset) {
        currentExplorationTime--;

        if (currentExplorationTime < 1 || rocketState.isDestroyed) {
            rocket.initializeGameState();
            // if (rocketState.isDestroyed) {
            //     console.log(replayBuffer);exit();
            // }
            console.log("Rocket restarted...");
            explorationDuration = 0;
            aiControllDuration = 0;
            currentExplorationTime = maxExplorationTime;
        }
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

    if (state.touchDown === true) {
        // Проверка нахождения в стартовой зоне
        if (state.touchDownZone === 'start') {
            return -0.5;
        } else if (state.touchDownZone === 'landing') {
            return 1;
        } else {
            reward += 500
        }
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

    // Бонус за время жизни
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

function keyPressed() {
    if (keyCode === LEFT_ARROW) {
        keyState.left = true;
    }
    if (keyCode === RIGHT_ARROW) {
        keyState.right = true;
    }
    if (keyCode === 32) { // Spacebar for thrust
        keyState.thrust = true;
    }
}

function keyReleased() {
    if (keyCode === LEFT_ARROW) {
        keyState.left = false;
    }
    if (keyCode === RIGHT_ARROW) {
        keyState.right = false;
    }
    if (keyCode === 32) { // Spacebar for thrust
        keyState.thrust = false;
    }
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
    // rect(offsetX, offsetY + graphHeight + 10, graphWidth, graphHeight); // Фон графика ошибки

    // Сетка для графиков
    stroke(200); // Светло-серый цвет сетки
    for (let i = 0; i <= 4; i++) { // Горизонтальные линии
        const y = offsetY + (graphHeight / 4) * i;
        if (i == 2) {
            strokeWeight(1.5);
        } else {
            strokeWeight(0.5);
        }
        line(offsetX, y, offsetX + graphWidth, y);
        // line(offsetX, y + graphHeight + 10, offsetX + graphWidth, y + graphHeight + 10);
    }
    for (let i = 0; i <= 4; i++) { // Вертикальные линии
        const x = offsetX + (graphWidth / 4) * i;
        line(x, offsetY, x, offsetY + graphHeight);
        // line(x, offsetY + graphHeight + 10, x, offsetY + graphHeight + 10 + graphHeight);
    }

    // График средней награды (линии и точки)
    stroke(0, 122, 0); // Зеленый цвет линий
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
        const y = map(errorHistoryGraph[i], 0, Math.max(...errorHistoryGraph, 1), offsetY + graphHeight, offsetY);
        vertex(x, y); // Прямые линии между точками
    }
    endShape();

    // Точки для ошибки сети
    fill(155, 0, 0); // Красный цвет
    noStroke();
    for (let i = 0; i < errorHistoryGraph.length; i++) {
        const x = map(i, 0, errorHistoryGraph.length, offsetX, offsetX + graphWidth);
        const y = map(errorHistoryGraph[i], 0, Math.max(...errorHistoryGraph, 1), offsetY + graphHeight, offsetY);
        circle(x, y, 3);
    }
    textSize(12);
    text("Network error", offsetX + 5, offsetY + 30);

    fill(0);
    text("Epoch:" + neuralNetwork.epoch + "     Epsilon greedy: " + epsilon.toFixed(3) + "   Reward avg:" + averageReward.toFixed(3), offsetX + 5, offsetY - 35);
    text("Replay buffer:" + replayBuffer.length, offsetX + 5, offsetY - 22);
}

function drawPilot() {
    if (pilot === PILOT_AI) {
        image(AIIcon, 10, 185, 50, 50);
    } else if (pilot === PILOT_ROBOT) {
        image(robotIcon, 10, 185, 50, 50);
    }
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
    let lrLabel = createP(`Learning Rate: ${learningRate.toFixed(4)}`).position(posX, posY + 0 * lineHeight - 8);
    lrSlider = createSlider(0.0001, 0.01, learningRate, 0.0001);
    lrSlider.style('width', '200px').position(posX, posY + 1 * lineHeight);
    lrSlider.input(() => {
        learningRate = lrSlider.value();
        lrLabel.html(`Learning Rate: ${learningRate.toFixed(4)}`);
    });

    // Replay Buffer Size Slider
    let bufferLabel = createP(`Replay Buffer Size: ${maxReplayBufferSize}`).position(posX, posY + 2 * lineHeight - 8);
    bufferSlider = createSlider(200, 10000, maxReplayBufferSize, 100);
    bufferSlider.style('width', '200px').position(posX, posY + 3 * lineHeight);
    bufferSlider.input(() => {
        maxReplayBufferSize = bufferSlider.value();

        if (replayBuffer.length > maxReplayBufferSize) {
            replayBuffer = replayBuffer.slice(-maxReplayBufferSize);
        }

        bufferLabel.html(`Replay Buffer Size: ${maxReplayBufferSize}`);
    });

    // Batch Size Slider
    let batchLabel = createP(`Batch Size: ${rewardWindow}`).position(posX, posY + 4 * lineHeight - 8);
    batchSlider = createSlider(30, 1000, rewardWindow, 10);
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

function preload() {
    AIIcon = loadImage('data:image/jpeg;base64,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');
    robotIcon = loadImage('data:image/jpeg;base64,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');
}
