let environment;
let agentCount = 7;

let actionThrust = 0;
let actionTurnLeft = 0;
let actionTurnRight = 0;
let qValues = [];
let neuralNetwork;
let perceptron;
let stepCount = 0;

let experienceBuffer = [];
let maxBufferSize = 25000;

let epsilon = 1.0;
let epsilonDecay = 0.005
let minEpsilon = 0.05;

let rewardBuffer = [];
let averageReward = 0;
let batchSize = 350;

let currentExplorationActions = [];
let explorationDuration = 0;
let aiControllDuration = 0;
let maxExplorationDuration = 100;

let maxExplorationTime = 1200;
let currentExplorationTime = maxExplorationTime;

let rewardGraph = [];
let lossGraph = [];
let graphMaxPoints = 300;

let lrSlider, agentCountSlider, explorationDurationSlider, gammaSlider, epsilonSlider, bufferSlider, batchSlider, dropOutRateSlider,
    greedCheckbox, trainingCheckbox, resetCheckbox, learningRate = 0.0001, dropOutRate = 0.01, pauseCheckbox, epsilonLabel,
    firstLayerCountSlider, secondLayerCountSlider;

let firstLayerCount = 20;
let secondLayerCount = 10;

let enableTraining = true;
let enableGreed = true;
let enableReset = true;
let pause = false;

let gamma = 0.999;

let targetPosition = {x: 0, y: 0};

const MODE_AI = 'ai';
const MODE_AGENT = 'robot';
const MODE_MANUAL = 'human';
let controlMode = MODE_AI;

let manualInput = {
    left: false,
    right: false,
    thrust: false
};

function setup()
{
    initEnv();

    initNeuralNetwork();

    initUI()
}

function draw() {
    if (pause) {
        noLoop();
    }

    let rocketsAlive = 0;

    for (let agentNumber = 0; agentNumber < agentCount; agentNumber++) {

        let rocketState = environment.observe(agentNumber);
        let commands;

        if (rocketState.isDestroyed || rocketState.done) {
            continue;
        }

        rocketsAlive++;

        neuralNetwork.setInput(rocketState);

        perceptron.forwardPass();

        if (enableGreed && explorationDuration > 0) {
            if (agentNumber === agentCount - 1) {
                explorationDuration--;
            }
            commands = currentExplorationActions[agentNumber];
            commands = heuristicPolicy(rocketState);
            controlMode = MODE_AGENT;
        } else if (enableGreed && Math.random() < epsilon && aiControllDuration === 0) {
            let action = Math.floor(random(0, 4));
            currentExplorationActions[agentNumber] = {
                thrust: action === 0,
                turnLeft: action === 1,
                turnRight: action === 2,
                doNothing: action === 3,
                index: action
            };
            explorationDuration = Math.floor(Math.random() * maxExplorationDuration) + 1;
            commands = currentExplorationActions[agentNumber];
            controlMode = MODE_AGENT;
        } else {
            if (aiControllDuration > 0) {
                if (agentNumber === agentCount - 1) {
                    aiControllDuration--;
                }
            } else {
                // aiControllDuration = Math.floor(Math.random() * maxExplorationDuration * 1.5) + maxExplorationDuration / 2;
                aiControllDuration = Math.floor(maxExplorationDuration / 3);
            }

            currentExplorationActions[agentNumber] = neuralNetwork.getOutputCommands();
            commands = currentExplorationActions[agentNumber];
            controlMode = MODE_AI;
        }

        if (controlMode !== MODE_AI && agentNumber === 0) {
            currentExplorationActions[0].values = neuralNetwork.getOutputCommands()['values'];
        }

        qValues = currentExplorationActions[0].values || [0, 0, 0, 0];

        if (agentNumber === 0) {
            actionThrust = manualInput.thrust || commands.thrust;
            actionTurnLeft = manualInput.left || commands.turnLeft;
            actionTurnRight = manualInput.right || commands.turnRight;
        } else {
            actionThrust = commands.thrust;
            actionTurnLeft = commands.turnLeft;
            actionTurnRight = commands.turnRight;
        }

        environment.updateState(actionThrust, actionTurnLeft, actionTurnRight, agentNumber);

        const nextState = environment.observe(agentNumber);

        const reward = calculateReward(rocketState, nextState);

        experienceBuffer.push({
            state: rocketState,
            action: commands.index,
            reward: reward,
            nextState: nextState
        });

        if (experienceBuffer.length > maxBufferSize) {
            experienceBuffer.shift();
        }

        if (agentNumber === 0) {
            rewardBuffer.push(reward);
            if (rewardBuffer.length > batchSize) {
                rewardBuffer.shift();
            }
        }
    }

    stepCount++;
    if (enableTraining && stepCount % (batchSize * 2) === 0 && experienceBuffer.length >= batchSize) {
        const batch = sampleBatch(experienceBuffer, batchSize);
        // console.log(`Step ${stepCount}: Training batch`, batch);
        perceptron.setLearningRate(learningRate);
        neuralNetwork.trainFromBatch(batch, gamma); // gamma = 0.99

        // console.log(batch);
        if (epsilon > minEpsilon) {
            epsilon = epsilon - epsilonDecay;
        }
    }

    averageReward = rewardBuffer.reduce((a, b) => a + b, 0) / rewardBuffer.length;
    if (averageReward < -0.4 && epsilon < 0.19) {
        epsilon = Math.min(1.0, epsilon + 0.01);
    }

    background(120);
    this.renderRewardZone();

    environment.render();

    this.renderGraphs();
    this.renderControlMode();
    this.renderAIControls();


    if (enableReset) {
        currentExplorationTime--;

        if ((currentExplorationTime < 1 && aiControllDuration < 1) || rocketsAlive === 0) {
            environment.initRockets();
            console.log("Rocket restarted...");
            explorationDuration = 0;
            aiControllDuration = 0;
            currentExplorationTime = maxExplorationTime;

            // targetPosition = {
            //     x: Math.floor(random(50, environment.width - 50)),
            //     y: Math.floor(random(50, environment.height - 20))
            // };
        }
    }

    if (stepCount % 300 === 0) {
        rewardGraph.push(averageReward);
        if (rewardGraph.length > graphMaxPoints) {
            rewardGraph.shift();
        }
    }

    batchSize = batchSlider.value();
    dropOutRate = dropOutRateSlider.value();
    learningRate = lrSlider.value();
    enableGreed = greedCheckbox.checked();
    enableTraining = trainingCheckbox.checked();
    enableReset = resetCheckbox.checked();
    pause = pauseCheckbox.checked();
    if (epsilonSlider.value() !== epsilon) {
        epsilonSlider.value(epsilon);
        epsilonLabel.html(`ε: ${epsilon.toFixed(2)}`);
    }
}

function initEnv() {
    environment = new Environment(agentCount);
    environment.setup();

    targetPosition = {x:environment.width / 2, y:environment.height}
}

function initNeuralNetwork() {
    neuralNetwork = new NeuralNetwork();
    neuralNetwork.init(learningRate, dropOutRate, firstLayerCount, secondLayerCount);

    perceptron = neuralNetwork.getPerceptron();
}

function calculateReward(state, nextState) {
    let reward = 0;

    if (nextState.isDestroyed) {
        return -1;
    }

    if (nextState.touchDown === true) {
        if (nextState.touchDownZone === 'landing') {
            return 1;
        } else {
            reward += 400;
        }
    }

    const distanceToTarget = dist(state.position.x, state.position.y, targetPosition.x, targetPosition.y);

    // Чем ближе к центру, тем выше награда, и наоборот
    const maxDistance = dist(0, 0, environment.width, environment.height);
    const targetReward = map(distanceToTarget, 0, maxDistance, 10, -10);
    reward += targetReward;

    if (state.position.y <= 10) {
        return -1;
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

    reward -= state.timestep / 2;

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
        manualInput.left = true;
    }
    if (keyCode === RIGHT_ARROW) {
        manualInput.right = true;
    }
    if (keyCode === 32) { // Spacebar for thrust
        manualInput.thrust = true;
    }
}

function keyReleased() {
    if (keyCode === LEFT_ARROW) {
        manualInput.left = false;
    }
    if (keyCode === RIGHT_ARROW) {
        manualInput.right = false;
    }
    if (keyCode === 32) { // Spacebar for thrust
        manualInput.thrust = false;
    }
}


function renderGraphs() {
    const graphWidth = 300;
    const graphHeight = 150;
    const offsetX = 530;
    const offsetY = 50;

    // Полупрозрачный фон графиков
    fill(255, 255, 255, 50);
    stroke(0);
    rect(offsetX, offsetY, graphWidth, graphHeight);
    // rect(offsetX, offsetY + graphHeight + 10, graphWidth, graphHeight);

    // Сетка для графиков
    stroke(200);
    for (let i = 0; i <= 4; i++) {
        const y = offsetY + (graphHeight / 4) * i;
        if (i === 2) {
            strokeWeight(1.5);
        } else {
            strokeWeight(0.5);
        }
        line(offsetX, y, offsetX + graphWidth, y);
        // line(offsetX, y + graphHeight + 10, offsetX + graphWidth, y + graphHeight + 10);
    }
    for (let i = 0; i <= 4; i++) {
        const x = offsetX + (graphWidth / 4) * i;
        line(x, offsetY, x, offsetY + graphHeight);
        // line(x, offsetY + graphHeight + 10, x, offsetY + graphHeight + 10 + graphHeight);
    }

    // График средней награды (линии и точки)
    stroke(0, 122, 0);
    noFill();
    beginShape();
    for (let i = 0; i < rewardGraph.length; i++) {
        const x = map(i, 0, rewardGraph.length, offsetX, offsetX + graphWidth);
        const y = map(rewardGraph[i], -1, 1, offsetY + graphHeight, offsetY);
        vertex(x, y);
    }
    endShape();

    // Точки для средней награды
    fill(0, 255, 0);
    noStroke();
    for (let i = 0; i < rewardGraph.length; i++) {
        const x = map(i, 0, rewardGraph.length, offsetX, offsetX + graphWidth);
        const y = map(rewardGraph[i], -1, 1, offsetY + graphHeight, offsetY);
        circle(x, y, 3);
    }
    textSize(12);
    text("Reward avg", offsetX + 5, offsetY + 15);
    text("1", offsetX - 8, offsetY + 5);
    text("0", offsetX - 12, offsetY + graphHeight/2);
    text("-1", offsetX - 12, offsetY + graphHeight);

    // График ошибки (линии и точки)
    stroke(255, 0, 0);
    noFill();
    beginShape();
    for (let i = 0; i < lossGraph.length; i++) {
        const x = map(i, 0, lossGraph.length, offsetX, offsetX + graphWidth);
        const y = map(lossGraph[i], 0, Math.max(...lossGraph, 1), offsetY + graphHeight, offsetY);
        vertex(x, y);
    }
    endShape();

    // Точки для ошибки сети
    fill(155, 0, 0);
    noStroke();
    for (let i = 0; i < lossGraph.length; i++) {
        const x = map(i, 0, lossGraph.length, offsetX, offsetX + graphWidth);
        const y = map(lossGraph[i], 0, Math.max(...lossGraph, 1), offsetY + graphHeight, offsetY);
        circle(x, y, 3);
    }
    textSize(12);
    text("Network error", offsetX + 5, offsetY + 30);

    fill(0);
    text("Epoch:" + neuralNetwork.epoch + "     ε-greedy: " + epsilon.toFixed(3) + "   Reward avg:" + averageReward.toFixed(3), offsetX + 5, offsetY - 35);
    text("Replay buffer:" + experienceBuffer.length, offsetX + 5, offsetY - 22);
}

function renderRewardZone() {
    noStroke();
    fill(255, 100, 0);
    ellipse(targetPosition.x, targetPosition.y, 20, 20);
}


function renderControlMode() {
    if (controlMode === MODE_AI) {
        image(AIIcon, 10, 185, 50, 50);
    } else if (controlMode === MODE_AGENT) {
        image(robotIcon, 10, 185, 50, 50);
    }
}

function renderAIControls() {

    // let qValues = neuralNetwork.getOutputCommands()['values'] || [0,0,0,0];

    const maxQValue = Math.max(...qValues) + 2;
    const minQValue = Math.min(...qValues) - 2;

    const graphWidth = 200;
    const graphHeight = 100;
    const offsetX = 630;
    const offsetY = 250;
    const barWidth = graphWidth / qValues.length - 8;
    const fontSize = 10;

    fill(255, 255, 255, 50);
    stroke(0);
    rect(offsetX, offsetY, graphWidth, graphHeight);

    const labels = ['space', 'L', 'R', 'wait'];

    for (let i = 0; i < qValues.length; i++) {
        const normalizedHeight = map(qValues[i], minQValue, maxQValue, 0, graphHeight);
        const barX = offsetX + i * (barWidth + 10);
        const barY = offsetY + graphHeight - normalizedHeight;

        fill(i === currentExplorationActions[0].index && controlMode === MODE_AI ? 'rgba(0, 0, 255, 0.6)' : 'rgba(128, 128, 128, 0.6)');
        noStroke();
        rect(barX, barY, barWidth, normalizedHeight);

        fill(0);
        textSize(fontSize);
        text(qValues[i].toFixed(2), barX + barWidth / 2 - 15, offsetY + graphHeight - 2);
        text(labels[i], barX + barWidth / 2 - 15, offsetY + 10);
    }

    fill(0);
    textSize(fontSize);
    text("Q-Values", offsetX, offsetY - 3);
}



function togglePause() {
    pause = pauseCheckbox.checked();
    if (pause) {
        noLoop();
    } else {
        loop();
    }
}

function heuristicPolicy(state) {
    const { position, velocity, orientation } = state;

    let targetX = targetPosition.x;
    let targetY = targetPosition.y;

    let thrust = false;
    let turnLeft = false;
    let turnRight = false;

    if (position.y > targetY || velocity.y > 1) {
        thrust = random(0, 100) < 80;
    } else {
        thrust = random(0, 100) > 80;
    }

    if (thrust) {
        return {
            thrust: thrust,
            turnLeft: false,
            turnRight: false,
            doNothing: false,
            index: 0
        }
    }

    if (state.timestep % 10 < random(2, 9)) {
        if (orientation.x > 0.12) {
            turnLeft = random(0, 100) < 70;
        } else if (orientation.x < -0.12) {
            turnRight = random(0, 100) < 70;
        }
    } else {
        if (position.x < targetX - 20) {
            turnRight = random(0, 100) < 70;
        } else if (position.x > targetX + 20) {
            turnLeft = random(0, 100) < 70;
        }
    }

    if (turnLeft) {
        return {
            thrust: false,
            turnLeft: true,
            turnRight: false,
            doNothing: false,
            index: 1
        }
    } else if (turnRight) {
        return {
            thrust: false,
            turnLeft: false,
            turnRight: true,
            doNothing: false,
            index: 2
        }
    }

    return {
        thrust: false,
        turnLeft: false,
        turnRight: false,
        doNothing: true,
        index: 3
    };
}


function initUI() {
    const posX = width + 10;
    const posY = 0;
    const lineHeight = 20;

    // Learning Rate Slider
    let lrLabel = createP(`Learning Rate: ${learningRate.toFixed(4)}`).position(posX, posY + 0 * lineHeight - 8);
    lrSlider = createSlider(0.0001, 0.9, learningRate, 0.0001);
    lrSlider.style('width', '200px').position(posX, posY + 1 * lineHeight);
    lrSlider.input(() => {
        learningRate = lrSlider.value();
        perceptron.setLearningRate(learningRate);
        lrLabel.html(`Learning Rate: ${learningRate.toFixed(4)}`);
    });

    // Gamma Slider
    let gammaLabel = createP(`𝛾 (discount): ${gamma.toFixed(3)}`).position(posX, posY + 2 * lineHeight - 8);
    gammaSlider = createSlider(0.01, 0.999, gamma, 0.001);
    gammaSlider.style('width', '200px').position(posX, posY + 3 * lineHeight);
    gammaSlider.input(() => {
        gamma = gammaSlider.value();
        gammaLabel.html(`𝛾 (discount): ${gamma.toFixed(2)}`);
    });

    // Epsilon Slider

    epsilonLabel = createP(`ε: ${epsilon.toFixed(2)}`).position(posX, posY + 4 * lineHeight - 8);
    epsilonSlider = createSlider(0.0, 1.0, epsilon, 0.01);
    epsilonSlider.style('width', '200px').position(posX, posY + 5 * lineHeight);
    epsilonSlider.input(() => {
        epsilon = epsilonSlider.value();
        epsilonLabel.html(`ε: ${epsilon.toFixed(2)}`);
    });

    // Replay Buffer Size Slider
    let bufferLabel = createP(`Replay Buffer Size: ${maxBufferSize}`).position(posX, posY + 6 * lineHeight - 8);
    bufferSlider = createSlider(500, 50000, maxBufferSize, 100);
    bufferSlider.style('width', '200px').position(posX, posY + 7 * lineHeight);
    bufferSlider.input(() => {
        maxBufferSize = bufferSlider.value();
        if (experienceBuffer.length > maxBufferSize) {
            experienceBuffer = experienceBuffer.slice(-maxBufferSize);
        }
        bufferLabel.html(`Replay Buffer Size: ${maxBufferSize}`);
    });


    // Batch Size Slider
    let batchLabel = createP(`Batch Size: ${batchSize}`).position(posX, posY + 8 * lineHeight - 8);
    batchSlider = createSlider(100, 2000, batchSize, 50);
    batchSlider.style('width', '200px').position(posX, posY + 9 * lineHeight);
    batchSlider.input(() => {
        batchSize = batchSlider.value();
        batchLabel.html(`Batch Size: ${batchSize}`);
    });

    // DropOut Slider
    let dropOutLabel = createP(`Drop out rate: ${dropOutRate}`).position(posX, posY + 10 * lineHeight - 8);
    dropOutRateSlider = createSlider(0.001, 0.8, dropOutRate, 0.001);
    dropOutRateSlider.style('width', '200px').position(posX, posY + 11 * lineHeight);
    dropOutRateSlider.input(() => {
        dropOutRate = dropOutRateSlider.value();
        dropOutLabel.html(`Drop out rate: ${dropOutRate}`);
    });

    // NN layers Slider
    let firstLayerCountLabel = createP(`I layer neurons number: ${firstLayerCount}`).position(posX, posY + 12 * lineHeight - 8);
    firstLayerCountSlider = createSlider(1, 200, firstLayerCount, 1);
    firstLayerCountSlider.style('width', '200px').position(posX, posY + 13 * lineHeight);
    firstLayerCountSlider.input(() => {
        firstLayerCount = firstLayerCountSlider.value();
        firstLayerCountLabel.html(`I layer neurons number: ${firstLayerCount}`);
        initNeuralNetwork();
    });
    
    let secondLayerCountLabel = createP(`II layer neurons number: ${secondLayerCount}`).position(posX, posY + 14 * lineHeight - 8);
    secondLayerCountSlider = createSlider(1, 200, secondLayerCount, 1);
    secondLayerCountSlider.style('width', '200px').position(posX, posY + 15 * lineHeight);
    secondLayerCountSlider.input(() => {
        secondLayerCount = secondLayerCountSlider.value();
        secondLayerCountLabel.html(`II layer neurons number: ${secondLayerCount}`);
    });

    let agentsCountLabel = createP(`Agents count: ${agentCount}`).position(posX, posY + 16 * lineHeight - 8);
    agentCountSlider = createSlider(1, 200, agentCount, 1);
    agentCountSlider.style('width', '200px').position(posX, posY + 17 * lineHeight);
    agentCountSlider.input(() => {
        agentCount = agentCountSlider.value();
        agentsCountLabel.html(`Agents count: ${agentCount}`);
        initEnv();
    });

    // Checkboxes
    greedCheckbox = createCheckbox("Enable Greedy Exploration", enableGreed).position(posX, posY + 19 * lineHeight);
    greedCheckbox.changed(() => {
        enableGreed = greedCheckbox.checked();
    });

    trainingCheckbox = createCheckbox("Enable Training", enableTraining).position(posX, posY + 20 * lineHeight);
    trainingCheckbox.changed(() => {
        enableTraining = trainingCheckbox.checked();
    });

    resetCheckbox = createCheckbox("Enable Auto Reset", enableReset).position(posX, posY + 21 * lineHeight);
    resetCheckbox.changed(() => {
        enableReset = resetCheckbox.checked();
    });

    // Pause Checkbox
    pauseCheckbox = createCheckbox("Pause Simulation", pause).position(posX, posY + 22 * lineHeight);
    pauseCheckbox.changed(() => {
        togglePause();
    });

    // Reset Button
    let resetButton = createButton('Reset Simulation');
    resetButton.position(posX, posY + 24 * lineHeight);
    resetButton.mousePressed(() => {
        resetSimulation();
    });
}

function resetSimulation() {
    console.log("Simulation reset...");
    initEnv();
    initNeuralNetwork();
}



function preload() {
    AIIcon = loadImage('data:image/jpeg;base64,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');

    robotIcon = loadImage('data:image/jpeg;base64,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');
}
