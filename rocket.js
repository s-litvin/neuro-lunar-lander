class Rocket {

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
    radius = 60;
    timestep = 1;

    constructor(screenWidth, screenHeight) {
        this.position = createVector(Math.floor(random(10, screenWidth - 10)), Math.floor(random(10, screenHeight - 10)));
        this.thrust = createVector(0, 0);
        this.gravity = createVector(0, 0.04);
        this.acceleration = createVector(0, 0);
        this.velocity = createVector(random(-1, 1), random(-1, 0));
        this.orientation = createVector(0, -1);
        this.tmpVector = createVector(random(-0.1, 0.1), -1);
        this.isDestroyed = false;
        this.timestep = 0;
    }

    state() {
        return {
            position: {x: this.position.x, y: this.position.y},
            velocity: {
                x: this.velocity.x,
                y: this.velocity.y,
                mag: this.velocity.mag()
            },
            orientation: {x: this.orientation.x, y: this.orientation.y},
            acceleration: {x: this.acceleration.x, y: this.acceleration.y},
            touchDown: this.touchDown,
            touchDownZone: this.touchDownZone,
            thrust: {x: this.thrust.x, y: this.thrust.y},
            isDestroyed: this.isDestroyed,
            done: this.done,
            timestep: this.timestep
        };
    }

    updateState(thrust=false, turnLeft=false, turnRight=false) {

        this.resetAcceleration();

        if (this.isDestroyed) {
            this.done = true;
            return;
        }

        this.applyAction(thrust, turnLeft, turnRight);
        this.handleTimer();

        if (!this.isDestroyed && !this.done) {
            this.applyEnvironmentalForces();
            this.timestep++;
        }

        this.stepPhysics();
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

        const ROTATION_ANGLE = 1;
        const THRUST_FORCE = 6.5;

        if (this.isDestroyed || this.done) {
            return;
        }

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

    applyEnvironmentalForces() {
        // Apply gravity
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

    reactToLanding() {

        // this.position.y = landingThreshold;
        const orientationVector = createVector(this.orientation.x, this.orientation.y);
        const verticalVector = createVector(0, -1);
        const angle = degrees(orientationVector.angleBetween(verticalVector));
        const tolerance = 15;

        if (Math.abs(angle) > tolerance || this.velocity.mag() > 2) {
            this.isDestroyed = true;
            this.velocity.set(0, 0);
            this.acceleration.set(0, 0);
            this.thrust.set(0, 0);
            this.done = true;

            console.log("Rocket destroyed!");
        } else {
            this.velocity.y = 0;
            this.velocity.x *= 0.96; // drag

            this.thrust.set(0, 0);
            this.velocity.set(0, 0);
            this.acceleration.set(0, 0);
            this.done = true;

            console.log("Rocket landed in " + this.touchDownZone + " zone");
        }
    }

    reactToObstacleCollision() {
        this.isDestroyed = true;
        console.log("Rocket hit an obstacle!");
    }

    handleBoundaryCollisions(screenWidth, screenHeight) {
        // left and right side collision
        if (this.position.x + this.velocity.x > screenWidth - this.radius) {
            this.position.x = 0;
        } else if (this.position.x + this.velocity.x < 0) {
            this.position.x = screenWidth - this.radius;
        }

        // top collision
        if (this.position.y + this.velocity.y <= 0) {
            this.position.y = 0;
            if (this.velocity.y < 0) {
                this.velocity.y *= -0.5;
            }
        }

        // bottom collision
        if (this.position.y + this.velocity.y >= screenHeight - this.radius) {
            this.position.y = screenHeight - this.radius;
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

    handleTimer() {
        if (this.timestep >= 1200) {
            this.isDestroyed = true;
            this.done = true;
        }
    }
}