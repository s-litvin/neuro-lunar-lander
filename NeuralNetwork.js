class NeuralNetwork {

    targetNeuralNetwork;
    perceptron;
    epoch = 0;

    syncTargetNetwork()
    {
        this.targetNeuralNetwork = Object.create(
            Object.getPrototypeOf(this.perceptron),
            Object.getOwnPropertyDescriptors(this.perceptron)
        );
    }

    init() {
        this.epoch = 0;
        this.perceptron = new Perceptron(0.0005, 0.001);

        this.perceptron.createLayers([
            {size: 12, activation: Cell.LINEAR},
            {size: 28, activation: Cell.RELU},
            {size: 4, activation: Cell.LINEAR},
        ]);

        this.perceptron.setDropoutRate(0.01);

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

            rocketState.acceleration.x * 10,
            rocketState.acceleration.y * 10,

            rocketState.thrust.x / 6.5,
            rocketState.thrust.y / 6.5,

            rocketState.isDestroyed * 1,
            // Math.abs(rocketState.position.x - rocketState.dronBoatPosition.x) / rocketState.screen.width
        ];


        this.perceptron.setInputVector(inputs);
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
        let totalError = 0;

        batch.forEach(transition => {
            const { state, action, reward, nextState } = transition;

            // Текущие Q-значения
            this.setInput(state);
            this.perceptron.forwardPass();
            this.targetNeuralNetwork.forwardPass();
            const qValues = this.perceptron.getOutputVector();


            // Q-значения следующего состояния
            this.setInput(nextState);
            this.perceptron.forwardPass();
            // const nextQValues = this.perceptron.getOutputVector();
            const qValuesTarget = this.targetNeuralNetwork.getOutputVector();
            const maxNextQ = Math.max(...qValuesTarget);

            // Создание нового массива целевых Q-значений
            const targetQValues = [...qValues];
            const maxQValue = 10; // Максимальное значение Q
            const minQValue = -10; // Минимальное значение Q
            targetQValues[action] = Math.min(Math.max(reward + gamma * maxNextQ, minQValue), maxQValue);  // Обновляем только выбранное действие

            // Логирование значений
            // console.log("Q-values before update:", qValues);
            // console.log("Target Q-values:", targetQValues, 'action:' + action);

            // Обучение
            this.perceptron.setInputVector(state);
            this.perceptron.setOutputVector(targetQValues);
            this.perceptron.backPropagation();
            totalError += this.perceptron.getNetError();

            // Увеличиваем счётчик шагов
            stepCounter++;

            // Периодическая синхронизация целевой сети
            if (stepCounter % 5 === 0) {
                this.syncTargetNetwork();
            }
        });

        this.epoch++;
        console.log('Epoch: ' + this.epoch + '; Error: ' + totalError);

        errorHistoryGraph.push(totalError / batch.length); // Средняя ошибка
        if (errorHistoryGraph.length > graphMaxPoints) {
            errorHistoryGraph.shift();
        }

    }


}

