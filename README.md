# Lunar Lander DQN

## Overview

This project combines a simulation inspired by the "Lunar Lander" mechanics with a JavaScript neural network implementation from "Neuro-JS".
The integration allows for the exploration of reinforcement learning (RL) in a dynamic environment with multiple agents. 
Users can simulate and train neural networks to guide virtual rockets (agents) for precise landings.

### Key Features:

- **Multi-Agent Simulation**
- **Neural Network Controller**
- **Reinforcement Learning (DQN)**
- **Visualization**
- **Customizable Hyperparameters**
- **Manual Controls**

## Project Structure

### 1. **Simulation Mechanics** (Lunar Lander)
The simulation mimics the classic Lunar Lander game, where agents (rockets) navigate a 2D environment with gravitational
forces and a designated landing zone.

#### Rocket Logic:
- **State Representation:** Each rocket tracks position, velocity, orientation, acceleration, and more.
- **Action Space:** Rockets can perform the following actions:
    - Thrust (upwards).
    - Rotate left or right.
    - Do nothing.
- **Termination Conditions:**
    - Successful landing.
    - Destruction from collisions.
    - Timeout after a fixed number of steps.

### 2. **Neural Network Implementation** (Neuro-JS)
The neural network is implemented using the Neuro-JS (https://github.com/s-litvin/neuro-js) library.

#### Neural Network Architecture:
- **Input Layer:** Encodes the rocket’s state:
    - Normalized position (x, y) and velocity (x, y).
    - Magnitude of velocity.
    - Orientation vector.
    - Time step information.
- **Hidden Layers:**
    - Fully connected layers with ReLU activation.
    - Configurable layer sizes and dropout rates.
- **Output Layer:** Predicts Q-values for each action (thrust, rotate left, rotate right, or do nothing).

#### Training Process:
- **Q-Learning Algorithm:**
    - Updates Q-values using the Bellman equation.
    - Incorporates reward signals based on agent performance.
- **Experience Replay:**
    - Stores past experiences in a replay buffer for batch training.
    - Stabilizes training by breaking correlation between consecutive experiences.
- **Epsilon-Greedy Exploration:**
    - Balances exploration (random actions) and exploitation (using learned policies).
    - Epsilon decays over time to shift focus toward exploitation.

### 3. **Integration**

The simulation and neural network are connected, allowing rockets to act as agents that take actions based on their 
observed states. The rockets act as agents within the environment, with the neural network providing actions based on 
observed states. Reinforcement learning enables continuous improvement of agent performance.

#### Reward Mechanism:
- Positive rewards for:
    - Successful landing in the target zone or small reward any other place.
    - Proximity to the target.
    - Stable vertical speed.
- Negative rewards for:
    - Destruction.
    - Deviation from vertical orientation.
    - High horizontal speed.

#### Visualization:
- Real-time graphs for average rewards and network loss.
- Visual feedback of rocket actions and state telemetry.
- Adjustable hyperparameters via an intuitive user interface.

## Usage

### Run:
1. Open demo: https://s-litvin.github.io/neuro-lunar-lander/.
2. Use the following controls:
    - **Spacebar:** Thrust (upwards).
    - **Left Arrow Key:** Rotate left.
    - **Right Arrow Key:** Rotate right.
4. Adjust hyperparameters using the sliders and controls in the UI.
5. Optionally, switch to manual control mode for testing and debugging.

### Hyperparameter Tuning:
- Learning rate: Controls the speed of network updates (default: `0.0001`, recommended: `0.0001 - 0.01`).
- γ (Gamma): Discount factor for future rewards (default: `0.999`, recommended: `0.9 - 0.999`).
- ε (Epsilon): Exploration probability (default: `1.0`, minimum: `0.05`, recommended: decay gradually to `0.1`).
- Replay buffer size: Determines the memory for experience replay (default: `50000`, recommended: `10000 - 50000`).
- Batch size: Number of samples per training step (default: `350`, recommended: `128 - 512`).
- Dropout rate: Prevents overfitting in the neural network (default: `0.2`, recommended: `0.1 - 0.5`).

## Inspirations and Dependencies

This project draws inspiration from the following open-source projects:

1. **[P5-LunarLander](https://github.com/s-litvin/p5-lunar-lander):**
    - Inspired the physics mechanics and simulation environment (Demo: [here](https://s-litvin.github.io/p5-lunar-lander/)).
2. **[Neuro-JS](https://github.com/s-litvin/neuro-js) (Demo: [here](https://s-litvin.github.io/neuro-js/), Tests: [here](https://s-litvin.github.io/neuro-js/tests.html)):**
    - Provided the neural network framework for building and training models.

Both components can function independently and are integrated here to showcase their combined potential.

### Demo 

Try it here: https://s-litvin.github.io/neuro-lunar-lander/

![](https://raw.githubusercontent.com/s-litvin/neuro-lunar-lander/master/preview.png)

https://github.com/user-attachments/assets/14d4f76b-29d6-44bb-a059-a3c490c75f19


