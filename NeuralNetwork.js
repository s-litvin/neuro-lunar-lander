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

    init(learningRate = 0.0001, dropOutRate = 0.1, firstLayerCount = 15, secondLayerCount = 5) {
        this.epoch = 0;
        this.perceptron = new Perceptron(learningRate, 0.0001);

        this.perceptron.createLayers([
            {size: 8, activation: Cell.LINEAR},
            {size: firstLayerCount, activation: Cell.RELU},
            {size: secondLayerCount, activation: Cell.RELU},
            {size: 4, activation: Cell.LINEAR},
        ]);

        this.perceptron.setDropoutRate(dropOutRate);

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

            // rocketState.done * 1,
            rocketState.timestep / 1200,
            // Math.abs(rocketState.position.x - rocketState.dronBoatPosition.x) / rocketState.screen.width
        ];

        this.perceptron.setInputVector(inputs);
        this.targetNeuralNetwork.setInputVector(inputs);
    }

    setPerceptron(perceptron) {
        this.perceptron = perceptron;
    }

    getPerceptron() {
        return this.perceptron;
    }

    getOutputCommands() {
        const qValues = this.perceptron.getOutputVector();

        let action;
        action = qValues.indexOf(Math.max(...qValues));

        return {
            thrust: action === 0,
            turnLeft: action === 1,
            turnRight: action === 2,
            doNothing: action === 3,
            index: action,
            values: qValues
        };
    }

    trainFromBatch(batch, gamma) {
        let stepCounter = 0;
        this.networkError = 0;

        batch.forEach(transition => {
            const { state, action, reward, nextState } = transition;

            // Current Q-values
            this.setInput(state);
            this.perceptron.forwardPass();
            const qValues = this.perceptron.getOutputVector();


            // Q-vaules for next state
            this.setInput(nextState);
            this.targetNeuralNetwork.forwardPass();
            const qValuesTarget = this.targetNeuralNetwork.getOutputVector();
            const maxNextQ = Math.max(...qValuesTarget);

            // New array for Q-values
            const targetQValues = [...qValues];
            const maxQValue = 10;
            const minQValue = -10;
            targetQValues[action] = nextState.isDestroyed
                ? 0
                : Math.min(Math.max(reward + gamma * maxNextQ, minQValue), maxQValue);

            // console.log("Q-values before update:", qValues);
            // console.log("Target Q-values:", targetQValues, 'action:' + action);

            // Learn
            this.setInput(state);
            this.perceptron.setOutputVector(targetQValues);
            this.perceptron.backPropagation();
            this.networkError += this.perceptron.getNetError();

            stepCounter++;

            if (Math.min(stepCounter % 250, batch.length) === 0) {
                this.syncTargetNetwork();
            }
        });

        this.epoch++;
        lossGraph.push(this.networkError / batch.length); // Avg error
        if (lossGraph.length > graphMaxPoints) {
            lossGraph.shift();
        }

    }


}


