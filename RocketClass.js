class Rocket {


    width = 840;
    height = 480;
    radius = 40;
    dronBoatHeight = 20;
    dronBoatVelocity = 0.01;

    v1;
    mass = 100;
    cfr = 0.01;
    gravity;
    thrust;
    velocity;
    acceleration;
    orientation;
    tmpVector;
    touchDown = false;
    isDestroyed = false;


    setup() {
        createCanvas(840, 480);
        this.initializeGameState();
        this.initializeUI();
    }

    initializeGameState() {
        this.v1 = createVector(Math.floor(random(0, this.width)), this.height - this.radius * 3);
        this.thrust = createVector(random(-6.5, 6.5), random(-6.5, 6.5));
        this.gravity = createVector(0, 0.04);
        this.acceleration = createVector(0, 0);
        this.velocity = createVector(0, 0);
        this.orientation = createVector(0.1, -0.99);
        // this.orientation = createVector(random(-1, 1), random(-1, 1));
        this.tmpVector = createVector(0, 0);
        this.dronBoat = createVector(this.width / 2, this.height - this.dronBoatHeight);
        this.dVel = createVector(0, 0);
        this.dAcc = createVector(0.01, 0);
        this.isDestroyed = false;
    }


    initializeUI() {
        // this.slider = createSlider(1, 60, 55, 1);
        // this.slider.position(10, 10);
        // this.slider.style('this.width', '80px');
    }


    drawAll(thrust=null, turnLeft=null, turnRight=null) {
        // frameRate(this.slider.value());
        background(120);

        this.resetAcceleration();

        this.handleInput(thrust, turnLeft, turnRight);
        this.handleCollisions();

        if (!this.isDestroyed) {
            this.applyTouchDown();
            this.applyEnvironmentalForces();
        }

        this.updateDronBoat();

        this.updateRocketVector();

        ///////////// VISUALISATIONS //////////////

        this.drawRocket();
        this.drawOrientationVisualization();
        this.drawDronBoat();
        this.drawTelemetry();
    }

    updateRocketVector() {
        this.velocity.add(this.acceleration);
        this.velocity.limit(12);
        this.v1.add(this.velocity);
    }

    resetAcceleration() {
        this.acceleration.mult(0);
    }

    handleInput(thrust=nul0, turnLeft=0, turnRight=0, doNothing=0) {

        if (this.isDestroyed) {
            return;
        }

        const ROTATION_ANGLE = 1; // угол вращения в градусах
        const THRUST_FORCE = 6.5; // сила тяги

        if (keyIsPressed || thrust > 0 || turnLeft > 0 || turnRight > 0) {
            if (keyCode === LEFT_ARROW || turnLeft > 0) {
                this.orientation = this.rotateNew(this.orientation.x, this.orientation.y, -ROTATION_ANGLE);
                // console.log('Rotate LEFT');
            } else if (keyCode === RIGHT_ARROW || turnRight > 0) {
                this.orientation = this.rotateNew(this.orientation.x, this.orientation.y, ROTATION_ANGLE);
                // console.log('Rotate RIGHT');
            }

            if (keyCode === 32 || this.thrust > 0 || thrust > 0) {
                this.thrust = createVector(this.orientation.x, this.orientation.y);
                this.thrust.normalize();
                this.thrust.mult(THRUST_FORCE);
                this.applyForce(this.thrust);
            }
        }

        this.drawInputs(thrust, turnLeft, turnRight);
    }

    handleCollisions() {

        const landingThreshold = this.height - this.radius;

        // Если ракета приземлилась (жесткое касание)
        if (this.v1.y + this.velocity.y >= landingThreshold) {
            this.v1.y = landingThreshold; // Установить позицию на уровне земли
            const orientationVector = createVector(this.orientation.x, this.orientation.y);
            const verticalVector = createVector(0, -1);
            const angle = degrees(orientationVector.angleBetween(verticalVector));
            const tolerance = 15; // Допустимое отклонение в градусах

            if (Math.abs(angle) > tolerance || this.velocity.mag() > 2) {
                this.isDestroyed = true; // Ракета разбита
                this.velocity.set(0, 0); // Обнуляем скорость
                this.acceleration.set(0, 0); // Обнуляем ускорение
                this.thrust.set(0, 0);   // Выключаем тягу
                console.log("Rocket destroyed!");
            } else {
                // Мягкое приземление
                this.velocity.y = 0;
                this.velocity.x *= 0.96; // Трение
            }
        }

        // Handle collisions on the X axis
        if ((this.v1.x + this.velocity.x) > (this.width - this.radius)) {
            this.v1.x = 0;
        } else if ((this.v1.x + this.velocity.x) < 0) {
            this.v1.x = this.width - this.radius;
        }

        // Handle collisions with the top boundary
        if ((this.v1.y + this.velocity.y) <= 0) {
            this.v1.y = 0; // Set position at the top boundary
            if (this.velocity.y < 0) { // If moving upwards
                this.velocity.y *= -0.5; // Lose energy upon collision
            }
        }

        // Handle collisions with the ground
        if ((this.v1.y + this.velocity.y) >= (this.height - this.radius)) {
            this.v1.y = this.height - this.radius; // Set position at ground level

            if (this.velocity.y > 0) { // If falling
                this.velocity.y *= -0.5; // Lose energy upon collision
            }

            // Stop completely if speed is very low and no thrust is applied
            if (Math.abs(this.velocity.y) < 0.1 && this.thrust.mag() === 0) {
                this.velocity.y = 0;
            }

            // Apply friction on the ground
            this.velocity.x *= 0.96;
        }

        // Eliminate jitter at low horizontal speeds
        if (Math.abs(this.velocity.x) < 0.01) {
            this.velocity.x = 0;
        }
    }

    getState() {
        return {
            position: { x: this.v1.x, y: this.v1.y },
            velocity: { x: this.velocity.x, y: this.velocity.y, mag: this.velocity.mag() },
            orientation: { x: this.orientation.x, y: this.orientation.y },
            acceleration: { x: this.acceleration.x, y: this.acceleration.y },
            touchDown: this.touchDown,
            dronBoatPosition: { x: this.dronBoat.x, y: this.dronBoat.y },
            screen: { width: this.width, height: this.height },
            thrust: { x: this.thrust.x, y: this.thrust.y },
            isDestroyed: this.isDestroyed
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

    drawOrientationVisualization() {
        // Центр ракеты
        const centerX = this.v1.x + this.radius / 2;
        const centerY = this.v1.y + this.radius / 2;

        // Вектор тяги
        let thrustVector = createVector(this.orientation.x, this.orientation.y);
        const thrustMagnitude = this.velocity.mag(); // Длина стрелки для тяги
        const thrustArrowLength = map(thrustMagnitude, 0, 12, 20, 160); // Масштабирование

        const thrustEndX = centerX + thrustVector.x * thrustArrowLength;
        const thrustEndY = centerY + thrustVector.y * thrustArrowLength;

        // Рисуем стрелку для вектора тяги
        stroke(255, 100, 0); // Оранжевый цвет
        strokeWeight(2);
        drawingContext.setLineDash([5, 5]); // Штриховая линия
        line(centerX, centerY, thrustEndX, thrustEndY);
        drawingContext.setLineDash([]); // Сбрасываем штриховку

        fill(255, 100, 0);
        noStroke();
        let arrowSize = 6;
        let direction = thrustVector.copy().normalize();
        let perp = direction.copy().rotate(HALF_PI).mult(arrowSize / 2);
        triangle(
            thrustEndX, thrustEndY,
            thrustEndX - direction.x * arrowSize + perp.x, thrustEndY - direction.y * arrowSize + perp.y,
            thrustEndX - direction.x * arrowSize - perp.x, thrustEndY - direction.y * arrowSize - perp.y
        );

        // Вектор движения
        this.tmpVector = createVector(this.velocity.x, this.velocity.y);
        const velocityMagnitude = this.tmpVector.mag(); // Длина стрелки для движения
        const velocityArrowLength = constrain(
            map(velocityMagnitude, 0, 12, 20, 160), // Масштабирование
            0,
            thrustArrowLength // Ограничение длины вектора движения
        );

        const velocityEndX = centerX + this.tmpVector.x * velocityArrowLength / velocityMagnitude;
        const velocityEndY = centerY + this.tmpVector.y * velocityArrowLength / velocityMagnitude;

        // Рисуем стрелку для вектора движения
        stroke(0, 0, 255); // Синий цвет
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

        // Легенда
        const legendX = 750; // Позиция легенды по горизонтали
        const legendY = 400; // Позиция легенды по вертикали

        fill(255, 100, 0);
        noStroke();
        textSize(12);
        text("Thrust Vector", legendX, legendY);

        fill(0, 0, 255);
        text("Velocity Vector", legendX, legendY + 20);
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

    updateDronBoat() {
        const MAX_SPEED = 0.1;
        const MOVEMENT_RANGE = 3 * this.dronBoatHeight;

        // Update this.acceleration and this.velocity
        this.dAcc.x += this.dronBoatVelocity;
        this.dVel.add(this.dAcc);
        this.dVel.limit(MAX_SPEED);

        // Reverse direction at edges
        if (this.dronBoat.x > this.width / 2 + MOVEMENT_RANGE || this.dronBoat.x < this.width / 2 - MOVEMENT_RANGE) {
            this.dVel.mult(-1);
            this.dronBoatVelocity *= -1;
        }

        // Update position
        this.dronBoat.add(this.dVel);

        // Reset this.acceleration
        this.dAcc.mult(0);
    }

    applyTouchDown() {
        this.touchDown =
            (this.v1.y + this.velocity.y) >= (this.height - this.radius - this.dronBoatHeight - 2) &&
            (this.v1.y + this.velocity.y) <= (this.height - this.radius - this.dronBoatHeight) &&
            (this.v1.x + this.velocity.x >= this.dronBoat.x - this.radius / 2) &&
            ((this.v1.x + this.velocity.x + this.radius) <= (this.dronBoat.x + this.dronBoatHeight * 3 * 1.5));

        if (this.touchDown && this.thrust.x === 0) {
            this.velocity.x = this.dronBoatVelocity;
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
        const centerX = this.v1.x + this.radius / 2;
        const centerY = this.v1.y + this.radius / 2;

        // Баундери бокс
        stroke(22, 22, 22);
        strokeWeight(0.5);
        drawingContext.setLineDash([5, 5]); // Пунктир
        noFill();
        rect(this.v1.x, this.v1.y, this.radius, this.radius);
        drawingContext.setLineDash([]); // Сбрасываем пунктир

        // Рисуем лунный модуль
        push();
        translate(centerX, centerY); // Перемещаем систему координат в центр ракеты
        const angle = atan2(this.orientation.y, this.orientation.x);
        rotate(angle + HALF_PI); // Поворачиваем в соответствии с вектором тяги

        // Основное тело модуля
        if (this.isDestroyed) {
            fill(150, 0, 0); // Красный цвет для разбитой ракеты
        } else {
            fill(180, 180, 180); // Обычный цвет
        }

        stroke(0);
        strokeWeight(2);
        beginShape();
        vertex(-this.radius / 2, this.radius / 2); // Левая нижняя точка
        vertex(0, -this.radius / 2); // Верхняя точка
        vertex(this.radius / 2, this.radius / 2); // Правая нижняя точка
        endShape(CLOSE);

        // Ножки модуля
        stroke(0);
        strokeWeight(2);
        line(8 + -this.radius / 2, this.radius / 2, 8 + -this.radius * 0.75, this.radius - 5); // Левая ножка
        line(-8 + this.radius / 2, this.radius / 2, -8 + this.radius * 0.75, this.radius - 5); // Правая ножка

        // Рисуем двигатель (ниже модуля)
        fill(255, 0, 90); // Оранжевый цвет двигателя
        noStroke();
        triangle(
            -this.radius * 0.2, this.radius / 2, // Левая нижняя точка двигателя
            this.radius * 0.2, this.radius / 2,  // Правая нижняя точка двигателя
            0, this.radius                        // Нижняя центральная точка двигателя
        );

        pop();

        // Центр ракеты
        fill(0);
        noStroke();
        circle(centerX, centerY, 4); // Маленький круг для обозначения центра
    }


    drawTelemetry() {
        fill(240);
        textSize(14);
        noStroke();

        text("grv > " + nf(this.gravity.x, 0, 3) + " : " + nf(this.gravity.y, 0, 3), 10, 50);
        text("acc > " + nf(this.acceleration.x, 0, 3) + " : " + nf(this.acceleration.y, 0, 3), 10, 65);
        text("vel > " + nf(this.velocity.x, 0, 3) + " : " + nf(this.velocity.y, 0, 3), 10, 80);
        text("pos > " + nf(this.v1.x, 0, 2) + " : " + nf(this.v1.y, 0, 2), 10, 95);
        text("mag > " + nf(this.velocity.mag(), 0, 5), 10, 110);
        text("this.mass > " + nf(this.mass, 0, 3), 10, 125);
        text("this.cfr > " + nf(this.cfr, 0, 4), 10, 140);
        text("ori > " + nf(this.orientation.x, 0, 2) + " : " + nf(this.orientation.y, 0, 2), 10, 155);
        text("thr > " + nf(this.thrust.x, 0, 4) + " : " + nf(this.thrust.y, 0, 2), 10, 170);

        strokeWeight(1);
    }

    drawInputs(thrust=null, turnLeft=null, turnRight=null) {
        fill(240);
        textSize(14);

        text("Thrust button: " + (thrust > 0 ? 'ON' : 'OFF'), 10, 200);
        text("Left button: " + (turnLeft > 0 ? 'ON' : 'OFF'), 10, 215);
        text("Right button: " + (turnRight > 0 ? 'ON' : 'OFF'), 10, 230);
    }
}