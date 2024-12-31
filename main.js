let rocket;
let thrust = 0;
let turnLeft = 0;
let turnRight = 0;
let neuralNetwork;
let perceptron;
let stepCount = 0;

let replayBuffer = [];
let maxReplayBufferSize = 3500;

let epsilon = 1.0; // Начальная случайность
let epsilonDecay = 0.002 // Коэффициент уменьшения
let minEpsilon = 0.05; // Минимальная случайность

let rewardHistory = [];
let averageReward = 0;
let rewardWindow = 320;

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
            aiControllDuration = Math.floor(Math.random() * maxExplorationDuration * 1.5) + maxExplorationDuration / 2;
        }
        commands = currentExplorationAction;
        pilot = PILOT_AI;
    }


    thrust = keyState.thrust || commands.thrust;
    turnLeft = keyState.left || commands.turnLeft;
    turnRight = keyState.right || commands.turnRight;

    background(120);
    this.drawRewardGradient();
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
    if (enableTraining && stepCount % 300 === 0 && replayBuffer.length >= rewardWindow) {
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
    if (averageReward < -0.3 && epsilon < 0.49) {
        epsilon = Math.min(1.0, epsilon + 0.01); // Увеличиваем случайность
    } else if (averageReward > 0.5) {
        epsilon = Math.max(minEpsilon, epsilon - 0.01); // Уменьшаем случайность
    }


    if (enableReset) {
        currentExplorationTime--;

        if ((currentExplorationTime < 1 && aiControllDuration < 1) ||
            rocketState.isDestroyed ||
            rocketState.lifeTime >= maxExplorationTime) {

            rocket.initializeGameState();
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
            return -0.5; // Штраф за приземление в стартовой зоне
        } else if (state.touchDownZone === 'landing') {
            return 1; // Максимальная награда за посадку в зоне
        } else {
            reward += 500; // Награда за посадку вне стартовой зоны, но не в зоне посадки
        }
    }

    // Поощрение за нахождение в центре экрана
    const centerX = state.screen.width / 2;
    const centerY = state.screen.height / 2;
    const distanceFromCenter = dist(state.position.x, state.position.y, centerX, centerY);

    // Чем ближе к центру, тем выше награда, и наоборот
    const maxDistance = dist(0, 0, centerX, centerY); // Максимальное расстояние от центра
    const centerReward = map(distanceFromCenter, 0, maxDistance, 800, -800); // Штраф/поощрение
    reward += centerReward;

    if (state.position.y <= 10) {
        return -1;
    }

    // Штраф за отклонение ориентации от вертикали
    // const orientationVector = createVector(state.orientation.x, state.orientation.y);
    // const verticalVector = createVector(0, -1);
    // const angle = degrees(orientationVector.angleBetween(verticalVector));
    // const orientationPenalty = map(abs(angle), 0, 180, 0, 100); // Чем больше угол, тем сильнее штраф
    // reward -= orientationPenalty;

    // Штраф за высокую горизонтальную скорость
    const horizontalSpeed = abs(state.velocity.x);
    const speedPenalty = map(horizontalSpeed, 0, 5, 0, 600); // Линейное увеличение штрафа
    reward -= speedPenalty;

    // Бонус за стабильную скорость
    // const verticalSpeed = abs(state.velocity.y);
    // const stableSpeedBonus = map(verticalSpeed, 0, 2, 150, 0); // Чем ближе к 0, тем больше бонус
    // reward += stableSpeedBonus;

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

function drawRewardGradient() {
    const centerX = width / 2;
    const centerY = height / 2;
    const maxRadius = Math.min(width, height) / 2; // Максимальный радиус градиента

    noFill();
    for (let r = maxRadius; r > 0; r -= 10) {
        const alpha = map(r, 0, maxRadius, 255, 0); // Альфа-канал (прозрачность)
        const colorValue = map(r, 0, maxRadius, 0, 255); // Цвет от центра к краю

        stroke(colorValue, 255 - colorValue, 0, alpha); // Градиент от зелёного к красному
        strokeWeight(2);
        ellipse(centerX, centerY, r * 2); // Рисуем окружности для градиента
    }
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

    robotIcon = loadImage('data:image/jpeg;base64,UklGRiYGAABXRUJQVlA4WAoAAAAgAAAARQAARQAAVlA4IAgGAABwGwCdASpGAEYAPpk6mEgloyIhMfbdELATCWoAvKITWH6d5ueGZ9xRv1H+VH0WvMV+1XpTepj0AP9J/Zus29ADpZ/27oXfJL6sf59tH9V5Z/57w797SddiV9QL2D+ef637bPSa1I++GuSyC+hzosetUmSr1OrR8aqbiuFL15OFYGtVFE1R4JHx0OiIB5T0l/pAMYH4meFGUqv+xpR0a//YDZuP6zFUbxKU3qsCGkxGawAHHxlEcK+Aul7CaOJhEhey2AfImW9xx7dUYMI46aSURmJkL+5D7KwWnzsS+/uvjFUxbgAA/vVNgydKurDOMoFTrfhuiUQ7z9jIuolLBnKpmqP6xW7ppy7TMNvT0o3qvWHjAI6AFWU5Bs+fwYgWUmNt10Km4ItgakmbecWnzWAddAmEqlAe/q483do2SQeggf7ESYA4RGp8rMOD22xECx4/5yin52xnq5uMuMterEEdLcU5Y0IhIMDyk9K80ov6EcOl/SwHvOBNV5vxbs4V8p5ZD+J61VdmkJry9pEwAAK2rN5s+4yidPi8vDGEVlw7EsiVlwJg9JH+rFBMjurRkYehQZ9hjAUVjqs4vEVvUdzR1bKij+86E7pfVqcWMTmDTe8vPQS6nSq13HR32+otsYrGZ++I+gTLAx/h6zzc1YFi0Ss6vRmuE8Ot5hDbKcze4mj+2ORL1YJIckiL/jfFYdoN2c+dxuSdPO9qG8jvrectZQm7JTA7eZR02AdAp1wsSjnLeG6zve5AR2ZIxGj8m5mIkYVRXkA4gWUO2JIBP35ps9DX969zZ/XnWKDOUIWzfd/J5vhmlI3dwHIoImQd0XiHnPeiRNd0NZQpoEhGxd2Vq/iFPvlmxgLllPbxymOUr6mdGubBeSsE+P+7d56BqK4Waz+tdsLxtxT2VdzOrfW1Fe8JPbTSw2ksAQKYPCsJUhdo6+70xTYbV8YrZm+lb4Cvez9CrfoMncDu4d3iLDlGckn1GmXToAGi1WvzHmuFw7r92rrBG1w0jkvcgzk0sMs4QeA5RcFyPl+aTo0Z+GbHteMVnCiY3+Hxn4u2heWW0Ar0uFFqSv486tDbk7/975bOdxNxt1d6hxhyvF4PdDYidAOiu8g3RPd4pkzY2WNSgRyDaqugX+YniMCbkTeL5kOtd8GeYoKH22n/w/gJEXCcx1QCRTH2NvZJQqs/i0Eg/qxYupT4U7rNrkiEflRamO7PuP+s0qulYozhrbgIYKV6tnc8LvpjwJAKhYGP0ykBvnq1phf1GCLBPYiuhW/XrLyq/bd7il9L/0zRKDpKr//HIiZEATeCEKXqEt66Pnk+uEdHOs1kIZ5tiOa4XULjQ9ACnDWW8HRlSM31oFThafwgTLJbtcV9r+7LLPaKqdvZdKswgH57QNlYPA5dJ5GcflpzKNqSbpUilF61mXt9HIMx15LjH859AtfKzwd+TO6oU6ylh/X0tRqINQ6BSQ/7DxHicPAgjwk9+MKzrzv+1RkcF/NWd2uUrbOq13ICwurf/uadzcpMjr2d2XF9AjUD4GJjYlskPmH9WmaMgLk9aDveNBUuvJH27cS2BNeRNUoIEVQr/B6sUKA1lcWXdcs1fGe6DI3MWHzgru2ChdFNKcRo3dKQppQl4/DyeMw5LUWfZVTqztkH5pz1rwNho1ealMrQO2lfrF7b+6YoJZoApGHj+D0ntBQBw+X4IO1EFOXdJTWhRF54m+Y4Cx7Jqfu6Xrijkvb/+UkcNTrlwMB7YvD1hSdNBa2lbLG0AKYk3N7Gsc5Bm4g/NZM84PCRsO+DU2Qf2++HxuSZO+wVVmDbfEGHabTZaVbJcgJc+ERD5PApUrp3XwLLZo3QLGJkM4aKTENE4ufcmXWuOPXIF42rG8uuXkru0Sygtu7cwyAhrSGpypgiOSLsrngzOkIxglK6Vyo+HE1vHbc6sES9vVgn9rhL3J9fIM0C3PJn7+rQlThlNsT3iDNKZoJvG7ULfa9GYQ7T6WGE4bTkDQQM+zjNawfo8/fv9l2GdWKwz5Tx096g8w634RiT6LzdY66K9XRX4GC6LyjLuEAAAA==');
}
