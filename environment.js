class Environment {

    agentsNumber = 1;
    rockets = [];
    width = 840;
    height = 480;

    // dronBoatHeight = 20;
    // dronBoatVelocity = 0.01;

    obstacles = [];

    constructor(agentsNumber=1) {
        this.agentsNumber = agentsNumber;
    }

    setup() {
        createCanvas(this.width, this.height);
        this.initRockets();
        this.initializeUI();
        this.createObstacles();
    }

    initRockets() {
        this.rockets = [];

        for (let i = 0; i < this.agentsNumber; i++) {
            this.rockets.push(new Rocket(this.width, this.height));
        }
    }

    createObstacles() {
        this.obstacles = [];
        const obstacleCount = 0;
        const obstacleWidth = 100;
        const obstacleHeight = 20;
        const obstacleSpacing = this.width / (obstacleCount + 3);

        for (let i = 1; i <= obstacleCount; i++) {
            const x = obstacleSpacing * i;
            const y = this.height / 2;
            this.obstacles.push({
                x,
                y,
                width: obstacleWidth,
                height: obstacleHeight,
            });
        }
    }

    initializeUI() {
        // this.slider = createSlider(1, 60, 55, 1);
        // this.slider.position(10, 10);
        // this.slider.style('this.width', '80px');
    }

    updateState(thrust=false, turnLeft=false, turnRight=false, agentNumber=0) {
        ////////////// UPDATE STATE
        this.rockets[agentNumber].updateState(thrust, turnLeft, turnRight);
        this.handleCollisions(agentNumber);
    }

    render() {
        // frameRate(this.slider.value());

        // if (!this.rockets[agentNumber].isDestroyed && !this.rockets[agentNumber].done) {
        //     this.checkLanding(agentNumber);
        //     this.applyEnvironmentalForces(agentNumber)
        //     this.rockets[agentNumber].timestep++;
        // }
        //
        // this.stepPhysics(agentNumber);

        ///////////// VISUALISATIONS //////////////

        this.drawStartPlatform();
        this.drawLandingPlatform();
        this.drawObstacles();
        this.drawTelemetry();
        this.drawInputs();
        this.drawRockets();
    }

    handleCollisions(agentNumber = 0) {
        const rocket = this.rockets[agentNumber];
        const landingThreshold = this.height - rocket.radius;

        // landing detection
        if (rocket.position.y + rocket.velocity.y >= landingThreshold) {
            rocket.reactToLanding(landingThreshold);
        }

        // collision detection
        for (const obstacle of this.obstacles) {
            const obstacleLeft = obstacle.x - 40;
            const obstacleRight = obstacle.x + 40;
            const obstacleTop = obstacle.y - 50;
            const obstacleBottom = obstacle.y - 40;

            if (
                rocket.position.x + rocket.radius > obstacleLeft &&
                rocket.position.x - rocket.radius < obstacleRight &&
                rocket.position.y + rocket.radius > obstacleTop &&
                rocket.position.y - rocket.radius < obstacleBottom
            ) {
                rocket.reactToObstacleCollision();
            }
        }

        // edges detection
        rocket.handleBoundaryCollisions(this.width, this.height);
    }


    observe(agentNumber=0) {
        let state = this.rockets[agentNumber].state();
        state.screen = {width: this.width, height: this.height};

        return state;
    }


    drawObstacles() {
        fill(200, 0, 0);
        noStroke();
        for (const obstacle of this.obstacles) {
            rect(obstacle.x - obstacle.width / 2, obstacle.y - obstacle.height / 2, obstacle.width, obstacle.height);
        }
    }

    drawOrientationVisualization(i) {

        if (this.rockets[i].isDestroyed) {
            return;
        }

        const centerX = this.rockets[i].position.x + this.rockets[i].radius / 2;
        const centerY = this.rockets[i].position.y + this.rockets[i].radius / 2;

        const thrustMagnitude = this.rockets[i].velocity.mag();
        const thrustArrowLength = map(thrustMagnitude, 0, 12, 20, 160);

        let arrowSize = 6;

        this.rockets[i].tmpVector = createVector(this.rockets[i].velocity.x, this.rockets[i].velocity.y);
        const velocityMagnitude = this.rockets[i].tmpVector.mag();
        const velocityArrowLength = constrain(
            map(velocityMagnitude, 0, 12, 20, 160),
            0,
            thrustArrowLength
        );

        const velocityEndX = centerX + this.rockets[i].tmpVector.x * velocityArrowLength / velocityMagnitude;
        const velocityEndY = centerY + this.rockets[i].tmpVector.y * velocityArrowLength / velocityMagnitude;

        stroke(0, 0, 255);
        strokeWeight(2);
        line(centerX, centerY, velocityEndX, velocityEndY);

        fill(0, 0, 255);
        noStroke();
        let velocityDirection = this.rockets[i].tmpVector.copy().normalize();
        let velocityPerp = velocityDirection.copy().rotate(HALF_PI).mult(arrowSize / 2);
        triangle(
            velocityEndX, velocityEndY,
            velocityEndX - velocityDirection.x * arrowSize + velocityPerp.x, velocityEndY - velocityDirection.y * arrowSize + velocityPerp.y,
            velocityEndX - velocityDirection.x * arrowSize - velocityPerp.x, velocityEndY - velocityDirection.y * arrowSize - velocityPerp.y
        );
        strokeWeight(0);
        noStroke();
    }

    drawStartPlatform() {
        const platformWidth = 100;
        const platformHeight = 10;
        const platformX = this.width / 4 - platformWidth / 2;
        const platformY = this.height - platformHeight;

        fill(150, 150, 150);
        noStroke();
        rect(platformX, platformY, platformWidth, platformHeight); // start plate
    }

    drawLandingPlatform() {
        const platformWidth = this.rockets[0].radius * 3;
        const platformHeight = 10;
        const platformX = (this.width * 3) / 4 - platformWidth / 2;
        const platformY = this.height - platformHeight;

        // Platform
        fill(100, 100, 200);
        noStroke();
        rect(platformX, platformY, platformWidth, platformHeight);

        // Flags
        const flagHeight = 30;
        const flagBaseWidth = 5;
        const flagXPositions = [
            platformX,                       // left edge
            platformX + platformWidth - 5    // right edge
        ];

        fill(255, 0, 0);
        for (let x of flagXPositions) {
            stroke(100);
            strokeWeight(2);
            line(x, platformY, x, platformY - flagHeight);

            noStroke();
            triangle(
                x, platformY - flagHeight,
                x + flagBaseWidth, platformY - flagHeight / 2,
                x, platformY - flagHeight / 2
            );
        }
    }

    // updateDronBoat() {
    //     const MAX_SPEED = 0.1;
    //     const MOVEMENT_RANGE = 3 * this.dronBoatHeight;
    //
    //     // Update this.rockets[i].acceleration and this.rockets[i].velocity
    //     this.dAcc.x += this.dronBoatVelocity;
    //     this.dVel.add(this.dAcc);
    //     this.dVel.limit(MAX_SPEED);
    //
    //     // Reverse direction at edges
    //     if (this.dronBoat.x > this.width / 2 + MOVEMENT_RANGE || this.dronBoat.x < this.width / 2 - MOVEMENT_RANGE) {
    //         this.dVel.mult(-1);
    //         this.dronBoatVelocity *= -1;
    //     }
    //
    //     // Update position
    //     this.dronBoat.add(this.dVel);
    //
    //     // Reset this.rockets[i].acceleration
    //     this.dAcc.mult(0);
    // }

    // applyTouchDown() {
    //     this.touchDown =
    //         (this.v1.y + this.rockets[i].velocity.y) >= (this.height - this.rockets[i].radius - this.dronBoatHeight - 2) &&
    //         (this.v1.y + this.rockets[i].velocity.y) <= (this.height - this.rockets[i].radius - this.dronBoatHeight) &&
    //         (this.v1.x + this.rockets[i].velocity.x >= this.dronBoat.x - this.rockets[i].radius / 2) &&
    //         ((this.v1.x + this.rockets[i].velocity.x + this.rockets[i].radius) <= (this.dronBoat.x + this.dronBoatHeight * 3 * 1.5));
    //
    //     if (this.touchDown && this.thrust.x === 0) {
    //         this.rockets[i].velocity.x = this.dronBoatVelocity;
    //     }
    // }

    checkLanding(agentNumber) {
        return;
        const landingThreshold = this.height - this.rockets[agentNumber].radius;

        // zones coordinates
        const landingZoneX = this.width * 0.7;
        const landingZoneWidth = 120;
        const startZoneX = this.width * 0.2;
        const startZoneWidth = 100;

        this.touchDown =
            (this.rockets[agentNumber].position.y + this.rockets[agentNumber].velocity.y) >= landingThreshold - 2 &&
            (this.rockets[agentNumber].position.y + this.rockets[agentNumber].velocity.y) <= landingThreshold;

        if (this.touchDown) {
            if (
                this.rockets[agentNumber].position.x >= startZoneX - startZoneWidth / 2 &&
                this.rockets[agentNumber].position.x <= startZoneX + startZoneWidth / 2
            ) {
                this.rockets[agentNumber].touchDownZone = "start";
            } else if (
                this.rockets[agentNumber].position.x >= landingZoneX - landingZoneWidth / 2 &&
                this.rockets[agentNumber].position.x <= landingZoneX + landingZoneWidth / 2
            ) {
                this.rockets[agentNumber].touchDownZone = "landing";
            } else {
                this.rockets[agentNumber].touchDownZone = "random";
            }
        } else {
            this.rockets[agentNumber].touchDownZone = null;
        }
    }


    drawDronBoat() {
        fill(200, 80, 180);

        rect(this.dronBoat.x, this.dronBoat.y, this.dronBoatHeight * 3, this.dronBoatHeight); // dron boat
        circle(this.dronBoat.x + this.dronBoatHeight * 3, this.height - this.dronBoatHeight, 4);
    }

    drawRockets() {

        for (let i = this.agentsNumber - 1; i >= 0; i--) {

            const centerX = this.rockets[i].position.x + this.rockets[i].radius / 2;
            const centerY = this.rockets[i].position.y + this.rockets[i].radius / 2;

            // boundary box
            stroke(22, 22, 22);
            strokeWeight(0.5);
            drawingContext.setLineDash([5, 5]);
            noFill();
            rect(this.rockets[i].position.x, this.rockets[i].position.y, this.rockets[i].radius, this.rockets[i].radius);
            drawingContext.setLineDash([]);

            // lunar module
            push();
            translate(centerX, centerY);
            const angle = atan2(this.rockets[i].orientation.y, this.rockets[i].orientation.x);
            rotate(angle + HALF_PI);

            if (this.isDestroyed) {
                fill(150, 0, 0);
            } else if (i === 0) {
                fill(10, 180, 180);
            } else {
                fill(180, 180, 11);
                // fill(180, 180, 180, 30);
            }

            stroke(0);
            strokeWeight(2);
            beginShape();
            vertex(-this.rockets[i].radius / 3, this.rockets[i].radius / 3);
            vertex(0, -this.rockets[i].radius / 3 - 8);
            vertex(this.rockets[i].radius / 3, this.rockets[i].radius / 3);
            endShape(CLOSE);

            stroke(0);
            strokeWeight(2);
            line(-this.rockets[i].radius / 4, this.rockets[i].radius / 3, -this.rockets[i].radius / 3, this.rockets[i].radius / 2);
            line(this.rockets[i].radius / 4, this.rockets[i].radius / 3, this.rockets[i].radius / 3, this.rockets[i].radius /2);

            if (this.rockets[i].thrustEnabled) {
                fill(255, 0, 90);
                noStroke();
                triangle(
                    -this.rockets[i].radius * 0.2, this.rockets[i].radius / 2.5,
                    this.rockets[i].radius * 0.2, this.rockets[i].radius / 2.5,
                    0, random(this.rockets[i].radius / 1.5, this.rockets[i].radius)
                );
            }

            pop();

            fill(0);
            noStroke();
            circle(centerX, centerY, 4);

            this.drawOrientationVisualization(i);
        }
    }

    drawTelemetry() {

        fill(240);
        textSize(14);
        noStroke();

        text("life > " + this.rockets[0].timestep, 10, 35);
        text("grv > " + nf(this.rockets[0].gravity.x, 0, 3) + " : " + nf(this.rockets[0].gravity.y, 0, 3), 10, 50);
        text("acc > " + nf(this.rockets[0].acceleration.x, 0, 3) + " : " + nf(this.rockets[0].acceleration.y, 0, 3), 10, 65);
        text("vel > " + nf(this.rockets[0].velocity.x, 0, 3) + " : " + nf(this.rockets[0].velocity.y, 0, 3), 10, 80);
        text("pos > " + nf(this.rockets[0].position.x, 0, 2) + " : " + nf(this.rockets[0].position.y, 0, 2), 10, 95);
        text("mag > " + nf(this.rockets[0].velocity.mag(), 0, 5), 10, 110);
        text("mass > " + nf(this.rockets[0].mass, 0, 3), 10, 125);
        text("this.cfr > " + nf(this.rockets[0].cfr, 0, 4), 10, 140);
        text("ori > " + nf(this.rockets[0].orientation.x, 0, 2) + " : " + nf(this.rockets[0].orientation.y, 0, 2), 10, 155);
        text("thr > " + nf(this.rockets[0].thrust.x, 0, 4) + " : " + nf(this.rockets[0].thrust.y, 0, 2), 10, 170);

        strokeWeight(1);
    }

    drawInputs(thrust=null, turnLeft=false, turnRight=false) {

        fill(240);
        textSize(14);

        text("Space btn: " + (this.rockets[0].thrustEnabled ? 'ON' : 'OFF'), 70, 200);
        text("L btn: " + (turnLeft ? 'ON' : 'OFF'), 70, 215);
        text("R btn: " + (turnRight ? 'ON' : 'OFF'), 70, 230);
    }
}