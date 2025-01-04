class NeuralNetwork {

    targetNeuralNetwork;
    perceptron;
    epoch = 0;
    networkError = 0;

    syncTargetNetwork()
    {
        this.targetNeuralNetwork = Object.create(
            Object.getPrototypeOf(this.perceptron),
            Object.getOwnPropertyDescriptors(this.perceptron)
        );
    }

    init() {
        this.epoch = 0;
        this.perceptron = new Perceptron(0.00005, 0.0001);

        this.perceptron.createLayers([
            {size: 9, activation: Cell.LINEAR},
            {size: 25, activation: Cell.RELU},
            {size: 4, activation: Cell.LINEAR},
        ]);

        this.perceptron.setDropoutRate(0.0);

        this.syncTargetNetwork();
    }

    setInput(rocketState) {
        const inputs = [
            rocketState.position.x / rocketState.screen.width,
            rocketState.position.y / rocketState.screen.height,

            rocketState.velocity.x / 12,
            rocketState.velocity.y / 12,

            rocketState.velocity.mag / 12,

            rocketState.orientation.x,
            rocketState.orientation.y,

            // rocketState.acceleration.x * 10,
            // rocketState.acceleration.y * 10,

            // rocketState.thrust.x / 6.5,
            // rocketState.thrust.y / 6.5,

            rocketState.done * 1,
            rocketState.timestep / 1200,
            // Math.abs(rocketState.position.x - rocketState.dronBoatPosition.x) / rocketState.screen.width
        ];

        this.perceptron.setInputVector(inputs);
        this.targetNeuralNetwork.setInputVector(inputs);
    }

    getPerceptron() {
        return this.perceptron;
    }

    getOutputCommands() {
        const qValues = this.perceptron.getOutputVector();

        let action;
        // Выбор действия с максимальным Q-значением (эксплуатация)
        action = qValues.indexOf(Math.max(...qValues));

        // Преобразуем индекс действия в команды
        return {
            thrust: action === 0,
            turnLeft: action === 1,
            turnRight: action === 2,
            doNothing: action === 3,
            index: action
        };
    }

    trainFromBatch(batch, gamma) {
        let stepCounter = 0; // Счётчик шагов
        this.networkError = 0;

        batch.forEach(transition => {
            const { state, action, reward, nextState } = transition;

            // Текущие Q-значения
            this.setInput(state);
            this.perceptron.forwardPass();
            const qValues = this.perceptron.getOutputVector();


            // Q-значения следующего состояния
            this.setInput(nextState);
            this.targetNeuralNetwork.forwardPass();
            const qValuesTarget = this.targetNeuralNetwork.getOutputVector();
            const maxNextQ = Math.max(...qValuesTarget);

            // Создание нового массива целевых Q-значений
            const targetQValues = [...qValues];
            const maxQValue = 10; // Максимальное значение Q
            const minQValue = -10; // Минимальное значение Q
            targetQValues[action] = nextState.isDestroyed
                ? reward
                : Math.min(Math.max(reward + gamma * maxNextQ, minQValue), maxQValue);

            // Логирование значений
            // console.log("Q-values before update:", qValues);
            // console.log("Target Q-values:", targetQValues, 'action:' + action);

            // Обучение
            this.setInput(state);
            this.perceptron.setOutputVector(targetQValues);
            this.perceptron.backPropagation();
            this.networkError += this.perceptron.getNetError();

            // Увеличиваем счётчик шагов
            stepCounter++;

            // Периодическая синхронизация целевой сети
            if (stepCounter % 5 === 0) {
                this.syncTargetNetwork();
            }
        });

        this.epoch++;
        lossGraph.push(this.networkError / batch.length); // Средняя ошибка
        if (lossGraph.length > graphMaxPoints) {
            lossGraph.shift();
        }

    }


}


