class Environment {


    width = 840;
    height = 480;
    radius = 60;
    // dronBoatHeight = 20;
    // dronBoatVelocity = 0.01;

    position;
    mass = 100;
    cfr = 0.01;
    gravity;
    thrust;
    velocity;
    acceleration;
    orientation;
    tmpVector;
    touchDown = false;
    touchDownZone;
    isDestroyed = false;
    done = false;


    thrustEnabled = false;

    timestep = 1;

    obstacles = [];

    setup() {
        createCanvas(this.width, this.height);
        this.reset();
        this.initializeUI();
        this.createObstacles();
    }

    reset() {
        this.position = createVector(this.width / 4 - this.radius / 2, this.height - this.radius);
        this.thrust = createVector(0, 0);
        this.gravity = createVector(0, 0.04);
        this.acceleration = createVector(0, 0);
        this.velocity = createVector(0, 0);
        this.orientation = createVector(0, -1);
        this.tmpVector = createVector(0, 0);
        // this.dronBoat = createVector(this.width / 2, this.height - this.dronBoatHeight); // Зона посадки
        // this.dVel = createVector(0, 0);
        // this.dAcc = createVector(0.01, 0);
        this.isDestroyed = false;
        this.timestep = 0;
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


    render(thrust=false, turnLeft=false, turnRight=false) {
        // frameRate(this.slider.value());

        this.drawStartPlatform();
        this.drawLandingPlatform();

        this.resetAcceleration();

        this.applyAction(thrust, turnLeft, turnRight);
        this.handleCollisions();

        if (!this.isDestroyed && !this.done) {
            this.checkLanding();
            this.applyEnvironmentalForces()
            this.timestep++;
        }

        this.stepPhysics();

        ///////////// VISUALISATIONS //////////////

        this.drawRocket();
        this.drawObstacles();
        this.drawOrientationVisualization();
        this.drawTelemetry();
    }

    stepPhysics() {
        this.velocity.add(this.acceleration);
        this.velocity.limit(12);
        this.position.add(this.velocity);
    }

    resetAcceleration() {
        this.acceleration.mult(0);
    }

    applyAction(thrust = false, turnLeftEnabled = false, turnRightEnabled = false) {
        if (this.isDestroyed) {
            return;
        }

        const ROTATION_ANGLE = 1;
        const THRUST_FORCE = 6.5;

        if (turnLeftEnabled) {
            this.orientation = this.rotateNew(this.orientation.x, this.orientation.y, -ROTATION_ANGLE);
        }

        if (turnRightEnabled) {
            this.orientation = this.rotateNew(this.orientation.x, this.orientation.y, ROTATION_ANGLE);
        }

        if (thrust) {
            this.thrust = createVector(this.orientation.x, this.orientation.y);
            this.thrust.normalize();
            this.thrust.mult(THRUST_FORCE);
            this.applyForce(this.thrust);
            this.thrustEnabled = true;
        } else {
            this.thrustEnabled = false;
        }

        this.drawInputs(thrust, turnLeftEnabled, turnRightEnabled);
    }

    handleCollisions() {

        const landingThreshold = this.height - this.radius;

        if (this.position.y + this.velocity.y >= landingThreshold) {
            this.position.y = landingThreshold;
            const orientationVector = createVector(this.orientation.x, this.orientation.y);
            const verticalVector = createVector(0, -1);
            const angle = degrees(orientationVector.angleBetween(verticalVector));
            const tolerance = 15;

            // hard landing
            if (Math.abs(angle) > tolerance || this.velocity.mag() > 2) {
                this.isDestroyed = true;
                this.velocity.set(0, 0);
                this.acceleration.set(0, 0);
                this.thrust.set(0, 0);
                console.log("Rocket destroyed!");
            } else {
                // soft landing
                this.velocity.y = 0;
                this.velocity.x *= 0.96; // drag
            }
        }

        for (const obstacle of this.obstacles) {
            const obstacleLeft = obstacle.x - 40;
            const obstacleRight = obstacle.x + 40;
            const obstacleTop = obstacle.y - 50;
            const obstacleBottom = obstacle.y - 40;

            if (
                this.position.x + this.radius > obstacleLeft &&
                this.position.x - this.radius < obstacleRight &&
                this.position.y + this.radius > obstacleTop &&
                this.position.y - this.radius < obstacleBottom
            ) {
                this.isDestroyed = true;
                console.log("Rocket hit an obstacle!");
            }
        }

        // Handle collisions on the X axis
        if ((this.position.x + this.velocity.x) > (this.width - this.radius)) {
            this.position.x = 0;
        } else if ((this.position.x + this.velocity.x) < 0) {
            this.position.x = this.width - this.radius;
        }

        // Handle collisions with the top boundary
        if ((this.position.y + this.velocity.y) <= 0) {
            this.position.y = 0;
            if (this.velocity.y < 0) {
                this.velocity.y *= -0.5;
            }
        }

        // Handle collisions with the ground
        if ((this.position.y + this.velocity.y) >= (this.height - this.radius)) {
            this.position.y = this.height - this.radius;

            if (this.velocity.y > 0) {
                this.velocity.y *= -0.5;
            }

            if (Math.abs(this.velocity.y) < 0.1 && this.thrust.mag() === 0) {
                this.velocity.y = 0;
            }

            this.velocity.x *= 0.96;
        }

        if (Math.abs(this.velocity.x) < 0.01) {
            this.velocity.x = 0;
        }
    }

    observe() {
        return {
            position: { x: this.position.x, y: this.position.y },
            velocity: { x: this.velocity.x, y: this.velocity.y, mag: this.velocity.mag() },
            orientation: { x: this.orientation.x, y: this.orientation.y },
            acceleration: { x: this.acceleration.x, y: this.acceleration.y },
            touchDown: this.touchDown,
            touchDownZone: this.touchDownZone,
            // dronBoatPosition: { x: this.dronBoat.x, y: this.dronBoat.y },
            screen: { width: this.width, height: this.height },
            thrust: { x: this.thrust.x, y: this.thrust.y },
            isDestroyed: this.isDestroyed,
            done: this.done,
            timestep: this.timestep
        };
    }


    rotateNew(x, y, degree) {
        let tmpX = x;
        // convert degrees to radians needed
        x = x * cos(degree * 3.14 / 180) - y * sin(degree * 3.14 / 180);
        y = tmpX * sin(degree * 3.14 / 180) + y * cos(degree * 3.14 / 180);

        return createVector(x, y);
    }

    applyForce(force) {
        let f = p5.Vector.div(force, this.mass);
        this.acceleration.add(f);
    }

    drawObstacles() {
        fill(200, 0, 0);
        noStroke();
        for (const obstacle of this.obstacles) {
            rect(obstacle.x - obstacle.width / 2, obstacle.y - obstacle.height / 2, obstacle.width, obstacle.height);
        }
    }

    drawOrientationVisualization() {
        const centerX = this.position.x + this.radius / 2;
        const centerY = this.position.y + this.radius / 2;

        // let thrustVector = createVector(this.orientation.x, this.orientation.y);
        const thrustMagnitude = this.velocity.mag();
        const thrustArrowLength = map(thrustMagnitude, 0, 12, 20, 160);

        // const thrustEndX = centerX + thrustVector.x * thrustArrowLength;
        // const thrustEndY = centerY + thrustVector.y * thrustArrowLength;

        let arrowSize = 6;
        // Рисуем стрелку для вектора тяги
        // stroke(255, 100, 0); // Оранжевый цвет
        // strokeWeight(2);
        // drawingContext.setLineDash([5, 5]); // Штриховая линия
        // line(centerX, centerY, thrustEndX, thrustEndY);
        // drawingContext.setLineDash([]); // Сбрасываем штриховку
        //
        // fill(255, 100, 0);
        // noStroke();
        //
        // let direction = thrustVector.copy().normalize();
        // let perp = direction.copy().rotate(HALF_PI).mult(arrowSize / 2);
        // triangle(
        //     thrustEndX, thrustEndY,
        //     thrustEndX - direction.x * arrowSize + perp.x, thrustEndY - direction.y * arrowSize + perp.y,
        //     thrustEndX - direction.x * arrowSize - perp.x, thrustEndY - direction.y * arrowSize - perp.y
        // );

        this.tmpVector = createVector(this.velocity.x, this.velocity.y);
        const velocityMagnitude = this.tmpVector.mag();
        const velocityArrowLength = constrain(
            map(velocityMagnitude, 0, 12, 20, 160),
            0,
            thrustArrowLength
        );

        const velocityEndX = centerX + this.tmpVector.x * velocityArrowLength / velocityMagnitude;
        const velocityEndY = centerY + this.tmpVector.y * velocityArrowLength / velocityMagnitude;

        stroke(0, 0, 255);
        strokeWeight(2);
        line(centerX, centerY, velocityEndX, velocityEndY);

        fill(0, 0, 255);
        noStroke();
        let velocityDirection = this.tmpVector.copy().normalize();
        let velocityPerp = velocityDirection.copy().rotate(HALF_PI).mult(arrowSize / 2);
        triangle(
            velocityEndX, velocityEndY,
            velocityEndX - velocityDirection.x * arrowSize + velocityPerp.x, velocityEndY - velocityDirection.y * arrowSize + velocityPerp.y,
            velocityEndX - velocityDirection.x * arrowSize - velocityPerp.x, velocityEndY - velocityDirection.y * arrowSize - velocityPerp.y
        );
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
        const platformWidth = this.radius * 3;
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



    applyEnvironmentalForces() {
        // Apply this.gravity
        let gravityForce = createVector(this.gravity.x, this.gravity.y);
        gravityForce.mult(this.mass);
        this.applyForce(gravityForce);

        // Apply drag (air resistance)
        let dragForce = createVector(this.velocity.x, this.velocity.y);
        dragForce.normalize();
        dragForce.mult(-1);
        let speed = this.velocity.mag();
        dragForce.mult(this.cfr * speed * speed); // Quadratic drag
        this.applyForce(dragForce);
    }

    // updateDronBoat() {
    //     const MAX_SPEED = 0.1;
    //     const MOVEMENT_RANGE = 3 * this.dronBoatHeight;
    //
    //     // Update this.acceleration and this.velocity
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
    //     // Reset this.acceleration
    //     this.dAcc.mult(0);
    // }

    // applyTouchDown() {
    //     this.touchDown =
    //         (this.v1.y + this.velocity.y) >= (this.height - this.radius - this.dronBoatHeight - 2) &&
    //         (this.v1.y + this.velocity.y) <= (this.height - this.radius - this.dronBoatHeight) &&
    //         (this.v1.x + this.velocity.x >= this.dronBoat.x - this.radius / 2) &&
    //         ((this.v1.x + this.velocity.x + this.radius) <= (this.dronBoat.x + this.dronBoatHeight * 3 * 1.5));
    //
    //     if (this.touchDown && this.thrust.x === 0) {
    //         this.velocity.x = this.dronBoatVelocity;
    //     }
    // }

    checkLanding() {
        const landingThreshold = this.height - this.radius;

        // Координаты зон
        const landingZoneX = this.width * 0.7;
        const landingZoneWidth = 120;
        const startZoneX = this.width * 0.2;
        const startZoneWidth = 100;

        this.touchDown =
            (this.position.y + this.velocity.y) >= landingThreshold - 2 &&
            (this.position.y + this.velocity.y) <= landingThreshold;

        if (this.touchDown) {
            if (
                this.position.x >= startZoneX - startZoneWidth / 2 &&
                this.position.x <= startZoneX + startZoneWidth / 2
            ) {
                this.touchDownZone = "start";
            } else if (
                this.position.x >= landingZoneX - landingZoneWidth / 2 &&
                this.position.x <= landingZoneX + landingZoneWidth / 2
            ) {
                this.touchDownZone = "landing";
            } else {
                this.touchDownZone = "random";
            }
        } else {
            this.touchDownZone = null;
        }
    }


    drawDronBoat() {
        fill(200, 80, 180);

        if (this.touchDown) {
            fill(0, 222, 0);
        }

        rect(this.dronBoat.x, this.dronBoat.y, this.dronBoatHeight * 3, this.dronBoatHeight); // dron boat
        circle(this.dronBoat.x + this.dronBoatHeight * 3, this.height - this.dronBoatHeight, 4);
    }

    drawRocket() {
        const centerX = this.position.x + this.radius / 2;
        const centerY = this.position.y + this.radius / 2;

        // boundary box
        stroke(22, 22, 22);
        strokeWeight(0.5);
        drawingContext.setLineDash([5, 5]);
        noFill();
        rect(this.position.x, this.position.y, this.radius, this.radius);
        drawingContext.setLineDash([]);

        // lunar module
        push();
        translate(centerX, centerY);
        const angle = atan2(this.orientation.y, this.orientation.x);
        rotate(angle + HALF_PI);

        if (this.isDestroyed) {
            fill(150, 0, 0);
        } else {
            fill(180, 180, 180);
        }

        stroke(0);
        strokeWeight(2);
        beginShape();
        vertex(-this.radius / 3, this.radius / 3);
        vertex(0, -this.radius / 3 - 8);
        vertex(this.radius / 3, this.radius / 3);
        endShape(CLOSE);

        stroke(0);
        strokeWeight(2);
        line(-this.radius / 4, this.radius / 3, -this.radius / 3, this.radius / 2);
        line(this.radius / 4, this.radius / 3, this.radius / 3, this.radius /2);

        if (this.thrustEnabled) {
            fill(255, 0, 90);
            noStroke();
            triangle(
                -this.radius * 0.2, this.radius / 2.5,
                this.radius * 0.2, this.radius / 2.5,
                0, random(this.radius / 1.5, this.radius)
            );
        }

        pop();

        fill(0);
        noStroke();
        circle(centerX, centerY, 4);
    }


    drawTelemetry() {
        fill(240);
        textSize(14);
        noStroke();

        text("life > " + this.timestep, 10, 35);
        text("grv > " + nf(this.gravity.x, 0, 3) + " : " + nf(this.gravity.y, 0, 3), 10, 50);
        text("acc > " + nf(this.acceleration.x, 0, 3) + " : " + nf(this.acceleration.y, 0, 3), 10, 65);
        text("vel > " + nf(this.velocity.x, 0, 3) + " : " + nf(this.velocity.y, 0, 3), 10, 80);
        text("pos > " + nf(this.position.x, 0, 2) + " : " + nf(this.position.y, 0, 2), 10, 95);
        text("mag > " + nf(this.velocity.mag(), 0, 5), 10, 110);
        text("this.mass > " + nf(this.mass, 0, 3), 10, 125);
        text("this.cfr > " + nf(this.cfr, 0, 4), 10, 140);
        text("ori > " + nf(this.orientation.x, 0, 2) + " : " + nf(this.orientation.y, 0, 2), 10, 155);
        text("thr > " + nf(this.thrust.x, 0, 4) + " : " + nf(this.thrust.y, 0, 2), 10, 170);

        strokeWeight(1);
    }

    drawInputs(thrust=null, turnLeft=false, turnRight=false) {
        fill(240);
        textSize(14);

        text("Space btn: " + (this.thrustEnabled ? 'ON' : 'OFF'), 70, 200);
        text("L btn: " + (turnLeft ? 'ON' : 'OFF'), 70, 215);
        text("R btn: " + (turnRight ? 'ON' : 'OFF'), 70, 230);
    }
}