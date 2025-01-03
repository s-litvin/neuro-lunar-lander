class Rocket {


    width = 840;
    height = 480;
    radius = 60;
    // dronBoatHeight = 20;
    // dronBoatVelocity = 0.01;

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
    touchDownZone;
    isDestroyed = false;

    thrustEnabled = false;

    lifeTime = 1;


    setup() {
        createCanvas(this.width, this.height);
        this.initializeGameState();
        this.initializeUI();
    }

    initializeGameState() {
        this.v1 = createVector(this.width / 4 - this.radius / 2, this.height - this.radius); // Начальная позиция на стартовой площадке
        this.thrust = createVector(0, 0); // Без начального импульса
        this.gravity = createVector(0, 0.04); // Гравитация
        this.acceleration = createVector(0, 0); // Обнуление ускорения
        this.velocity = createVector(0, 0); // Обнуление скорости
        this.orientation = createVector(0, -1); // Ракета смотрит вверх
        this.tmpVector = createVector(0, 0);
        // this.dronBoat = createVector(this.width / 2, this.height - this.dronBoatHeight); // Зона посадки
        // this.dVel = createVector(0, 0);
        // this.dAcc = createVector(0.01, 0);
        this.isDestroyed = false;
        this.lifeTime = 0;
    }



    initializeUI() {
        // this.slider = createSlider(1, 60, 55, 1);
        // this.slider.position(10, 10);
        // this.slider.style('this.width', '80px');
    }


    drawAll(thrust=false, turnLeft=false, turnRight=false) {
        // frameRate(this.slider.value());

        this.drawStartPlatform();
        this.drawLandingPlatform();

        this.resetAcceleration();

        this.handleInput(thrust, turnLeft, turnRight);
        this.handleCollisions();

        if (!this.isDestroyed) {
            this.applyTouchDown();
            this.applyEnvironmentalForces()
            this.lifeTime++;
        }

        this.updateRocketVector();

        ///////////// VISUALISATIONS //////////////

        this.drawRocket();
        this.drawOrientationVisualization();
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

    handleInput(thrust = false, turnLeftEnabled = false, turnRightEnabled = false) {
        if (this.isDestroyed) {
            return;
        }

        const ROTATION_ANGLE = 1; // угол вращения в градусах
        const THRUST_FORCE = 6.5; // сила тяги

        // Проверка нажатий клавиш или команд
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
            touchDownZone: this.touchDownZone,
            // dronBoatPosition: { x: this.dronBoat.x, y: this.dronBoat.y },
            screen: { width: this.width, height: this.height },
            thrust: { x: this.thrust.x, y: this.thrust.y },
            isDestroyed: this.isDestroyed,
            lifeTime: this.lifeTime
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

        // fill(255, 100, 0);
        noStroke();
        textSize(12);
        // text("Thrust Vector", legendX, legendY);

        fill(0, 0, 255);
        text("Velocity Vector", legendX, legendY + 20);
    }

    drawStartPlatform() {
        const platformWidth = 100;
        const platformHeight = 10;
        const platformX = this.width / 4 - platformWidth / 2; // Стартовая площадка левее центра
        const platformY = this.height - platformHeight;

        fill(150, 150, 150); // Серый цвет
        noStroke();
        rect(platformX, platformY, platformWidth, platformHeight); // Рисуем стартовую площадку
    }

    drawLandingPlatform() {
        const platformWidth = this.radius * 3; // Посадочная площадка в 3 раза шире ракеты
        const platformHeight = 10;
        const platformX = (this.width * 3) / 4 - platformWidth / 2; // Посадочная площадка правее центра
        const platformY = this.height - platformHeight;

        // Платформа
        fill(100, 100, 200); // Синий цвет
        noStroke();
        rect(platformX, platformY, platformWidth, platformHeight);

        // Флажки
        const flagHeight = 30;
        const flagBaseWidth = 5;
        const flagXPositions = [
            platformX,                       // Левый край платформы
            platformX + platformWidth - 5    // Правый край платформы
        ];

        fill(255, 0, 0); // Красный цвет флажков
        for (let x of flagXPositions) {
            // Рисуем палочку
            stroke(100);
            strokeWeight(2);
            line(x, platformY, x, platformY - flagHeight);

            // Рисуем треугольник-флажок
            noStroke();
            triangle(
                x, platformY - flagHeight,           // Верх палочки
                x + flagBaseWidth, platformY - flagHeight / 2, // Нижняя правая точка
                x, platformY - flagHeight / 2       // Нижняя левая точка
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

    applyTouchDown() {
        const landingThreshold = this.height - this.radius;

        // Координаты зон
        const landingZoneX = this.width * 0.7; // Позиция посадочной зоны
        const landingZoneWidth = 120; // Ширина посадочной зоны
        const startZoneX = this.width * 0.2; // Позиция стартовой зоны
        const startZoneWidth = 100; // Ширина стартовой зоны

        this.touchDown =
            (this.v1.y + this.velocity.y) >= landingThreshold - 2 && // Проверка на соприкосновение с нижней частью экрана
            (this.v1.y + this.velocity.y) <= landingThreshold;       // Точный диапазон соприкосновения

        if (this.touchDown) {
            // Определяем, в какой зоне произошло соприкосновение
            if (
                this.v1.x >= startZoneX - startZoneWidth / 2 &&
                this.v1.x <= startZoneX + startZoneWidth / 2
            ) {
                this.touchDownZone = "start";
            } else if (
                this.v1.x >= landingZoneX - landingZoneWidth / 2 &&
                this.v1.x <= landingZoneX + landingZoneWidth / 2
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
        vertex(-this.radius / 3, this.radius / 3); // Левая нижняя точка
        vertex(0, -this.radius / 3 - 8); // Верхняя точка
        vertex(this.radius / 3, this.radius / 3); // Правая нижняя точка
        endShape(CLOSE);

        // Ножки модуля
        stroke(0);
        strokeWeight(2);
        line(-this.radius / 4, this.radius / 3, -this.radius / 3, this.radius / 2); // Левая ножка
        line(this.radius / 4, this.radius / 3, this.radius / 3, this.radius /2); // Правая ножка

        // Рисуем двигатель (ниже модуля)
        if (this.thrustEnabled) {
            fill(255, 0, 90); // Оранжевый цвет двигателя
            noStroke();
            triangle(
                -this.radius * 0.2, this.radius / 2.5, // Левая нижняя точка двигателя
                this.radius * 0.2, this.radius / 2.5,  // Правая нижняя точка двигателя
                0, random(this.radius / 1.5, this.radius)                        // Нижняя центральная точка двигателя
            );
        }

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

        text("life > " + this.lifeTime, 10, 35);
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

    drawInputs(thrust=null, turnLeft=false, turnRight=false) {
        fill(240);
        textSize(14);

        text("Space btn: " + (this.thrustEnabled ? 'ON' : 'OFF'), 70, 200);
        text("L btn: " + (turnLeft ? 'ON' : 'OFF'), 70, 215);
        text("R btn: " + (turnRight ? 'ON' : 'OFF'), 70, 230);
    }
}