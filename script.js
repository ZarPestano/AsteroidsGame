const FPS = 30; // frames per second
const FRICTION = 0.7; // friction coefficient of space (0 = no friction, 1 = max friction)

const GAME_LIVES = 3; // starting number of lives

const ROIDS_JAG = 0.38; // jaggedness of the asteroids (0 = none, 1 = lots)
const ROIDS_NUM = 3; // starting number of asteroids
const ROIDS_SIZE = 100; // starting size of asteroids in pixels
const ROIDS_SPD = 50; // max starting speed of asteroids in pixels per second
const ROIDS_VERT = 10; // average number of vertices on each asteroid
const ROIDS_PTS_LGE = 20; // points scored for large asteroid
const ROIDS_PTS_MED = 50; // points scored for medium asteroid
const ROIDS_PTS_SML = 100; // points scored for small asteroid

const SHIP_SIZE = 30; // ship height in pixels
const SHIP_THRUST = 5; // acceleration of the ship in pixels per second per second
const TURN_SPEED = 360; // turn speed in degrees per second
const SHIP_EXPLODE_DUR = 0.3; // duration of the ship's explosion in seconds
const SHIP_INV_DUR = 3; // duration of the ship's invincibility in seconds
const SHIP_BLINK_DUR = 0.1; // duration of the ship's blinking during invincibility in seconds

const LASER_MAX = 10; // maximum number of lasers on screen at once
const LASER_SPD = 500; // speed of lasers in pixels per second
const LASER_DIST = 0.6; // maximum distance laser can travel as fraction of screen width
const LASER_EXPLODE_DUR = 0.1; // duration of the laser's explosion in seconds

const SHOW_BOUNDING = false; // show or hide collision boundaing
const SHOW_CENTRE_DOT = false; // show or hide ship's centre dot

const TEXT_FADE_TIME = 2.5; // text fade time in seconds
const TEXT_SIZE = 40; // text font height in pixels

const SAVE_KEY_SCORE = "highscore"; // save key for local storage of highscore

/** @type {HTMLCanvasElement} */
var canv = document.getElementById("gameCanvas");
var ctx = canv.getContext("2d");

// set up the game parameters
var level, lives, roids, score, scoreHigh, ship, text, textAlpha;
newGame();

// set up event handlers
document.addEventListener("keydown", keyDown);
document.addEventListener("keyup", keyUp);

// set up the game loop
setInterval(update, 1000 / FPS);

function createAsteroidBelt() {
  roids = [];
  var x, y;
  for (var i = 0; i < ROIDS_NUM + level; i++) {
    do {
      x = Math.floor(Math.random() * canv.width);
      y = Math.floor(Math.random() * canv.height);
    } while (distBetweenPoints(ship.x, ship.y, x, y) < ROIDS_SIZE * 2 + ship.r);
    roids.push(newAsteroid(x, y, Math.ceil(ROIDS_SIZE / 2)));
  }
}

function destroyAsteroid(index) {
  var x = roids[index].x;
  var y = roids[index].y;
  var r = roids[index].r;

  // split the asteroid in two if necessary
  if (r === Math.ceil(ROIDS_SIZE / 2)) {
    roids.push(newAsteroid(x, y, Math.ceil(ROIDS_SIZE / 4)));
    roids.push(newAsteroid(x, y, Math.ceil(ROIDS_SIZE / 4)));
    score += ROIDS_PTS_LGE;
  } else if (r === Math.ceil(ROIDS_SIZE / 4)) {
    roids.push(newAsteroid(x, y, Math.ceil(ROIDS_SIZE / 8)));
    roids.push(newAsteroid(x, y, Math.ceil(ROIDS_SIZE / 8)));
    roids.push(newAsteroid(x, y, Math.ceil(ROIDS_SIZE / 8)));
    roids.push(newAsteroid(x, y, Math.ceil(ROIDS_SIZE / 8)));
    score += ROIDS_PTS_MED;
  } else {
    score += ROIDS_PTS_SML;
  }

  // check high score
  if (score > scoreHigh) {
    scoreHigh = score;
    localStorage.setItem(SAVE_KEY_SCORE, scoreHigh);
  }

  // destroy the asteroid
  roids.splice(index, 1);

  // new level when no more asteroids
  if (roids.length === 0) {
    level++;
    newLevel();
  }
}

function newAsteroid(x, y, r) {
  var lvlMult = 1 + 0.1 * level;
  var roid = {
    x: x,
    y: y,
    xv:
      ((Math.random() * ROIDS_SPD * lvlMult) / FPS) *
      (Math.random() < 0.5 ? 1 : -1),
    yv:
      ((Math.random() * ROIDS_SPD * lvlMult) / FPS) *
      (Math.random() < 0.5 ? 1 : -1),
    r: r,
    a: Math.random() * Math.PI * 2, // in  radians
    vert: Math.floor(Math.random() * (ROIDS_VERT + 1) + ROIDS_VERT / 2),
    offs: [],
  };

  // create the vertex offsets array
  for (var i = 0; i < roid.vert; i++) {
    roid.offs.push(Math.random() * ROIDS_JAG * 2 + 1 - ROIDS_JAG);
  }
  return roid;
}

function drawShip(x, y, a, colour = "white") {
  ctx.strokeStyle = colour;
  ctx.lineWidth = SHIP_SIZE / 20;
  ctx.beginPath();
  ctx.moveTo(
    // nose of the ship
    x + (4 / 3) * ship.r * Math.cos(a),
    y - (4 / 3) * ship.r * Math.sin(a)
  );
  ctx.lineTo(
    // rear left of the ship
    x - ship.r * ((2 / 3) * Math.cos(a) + Math.sin(a)),
    y + ship.r * ((2 / 3) * Math.sin(a) - Math.cos(a))
  );
  ctx.lineTo(
    // rear right of the ship
    x - ship.r * ((2 / 3) * Math.cos(a) - Math.sin(a)),
    y + ship.r * ((2 / 3) * Math.sin(a) + Math.cos(a))
  );
  ctx.closePath();
  ctx.stroke();
}

function explodeShip() {
  ship.explodeTime = Math.ceil(SHIP_EXPLODE_DUR * FPS);
}

function newShip() {
  return {
    x: canv.width / 2,
    y: canv.height / 2,
    r: SHIP_SIZE / 2,
    a: (90 / 180) * Math.PI, // convert to radians
    rot: 0,
    thrusting: false,
    thrust: {
      x: 0,
      y: 0,
    },
    explodeTime: 0,
    blinkTime: Math.ceil(SHIP_BLINK_DUR * FPS),
    blinkNum: Math.ceil(SHIP_INV_DUR / SHIP_BLINK_DUR),
    canShoot: true,
    lasers: [],
    dead: false,
  };
}

function shootLaser() {
  // create the laser object
  if (ship.canShoot && ship.lasers.length < LASER_MAX) {
    // from the nose of the ship
    ship.lasers.push({
      x: ship.x + (4 / 3) * ship.r * Math.cos(ship.a),
      y: ship.y - (4 / 3) * ship.r * Math.sin(ship.a),
      xv: (LASER_SPD * Math.cos(ship.a)) / FPS,
      yv: -(LASER_SPD * Math.sin(ship.a)) / FPS,
      dist: 0,
      explodeTime: 0,
    });
  }

  // preventer further shooting
  ship.canShoot = false;
}

function newGame() {
  level = 0;
  lives = GAME_LIVES;
  score = 0;
  ship = newShip();

  // get the high score from local store
  var scoreStr = localStorage.getItem(SAVE_KEY_SCORE);
  if (scoreStr === null) {
    scoreHigh = 0;
  } else {
    scoreHigh = parseInt(scoreStr);
  }

  newLevel();
}

function newLevel() {
  text = "Level " + (level + 1);
  textAlpha = 1.0;
  createAsteroidBelt();
}

function gameOver() {
  ship.dead = true;
  text = "Game Over";
  textAlpha = 1.0;
}

function distBetweenPoints(x1, y1, x2, y2) {
  return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
}

function keyUp(/** @type [KeyboardEvent] */ ev) {
  if (ship.dead) {
    return;
  }

  // space bar (allow shooting again)
  if (ev.keyCode === 32) {
    ship.canShoot = true;
  }

  // left arrow arrow (stop rotating left)
  if (ev.keyCode === 37) {
    ship.rot = 0;
  }

  // up arrow (stop thrusting ship forward)
  else if (ev.keyCode === 38) {
    ship.thrusting = false;
  }

  // right arrow (stop rotating right)
  else if (ev.keyCode === 39) {
    ship.rot = 0;
  }
}

function keyDown(/** @type [KeyboardEvent] */ ev) {
  if (ship.dead) {
    return;
  }

  // space bar (shoot laser)
  if (ev.keyCode === 32) {
    shootLaser();
  }

  // left arrow (rotate ship left)
  if (ev.keyCode === 37) {
    ship.rot = ((TURN_SPEED / 180) * Math.PI) / FPS;
  }

  // up arrow (thrust ship forward)
  else if (ev.keyCode === 38) {
    ship.thrusting = true;
  }

  // right arrow (rotate ship right)
  else if (ev.keyCode === 39) {
    ship.rot = -((TURN_SPEED / 180) * Math.PI) / FPS;
  }
}

function update() {
  var blinkOn = ship.blinkNum % 2 === 0;
  var exploding = ship.explodeTime > 0;
  // draw space
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, canv.width, canv.height);

  if (ship.thrusting && !ship.dead) {
    ship.thrust.x += (SHIP_THRUST * Math.cos(ship.a)) / FPS;
    ship.thrust.y -= (SHIP_THRUST * Math.sin(ship.a)) / FPS;

    // draw thruster
    if (!exploding && blinkOn) {
      ctx.fillStyle = "red";
      ctx.strokeStyle = "yellow";
      ctx.lineWidth = SHIP_SIZE / 10;
      ctx.beginPath();
      ctx.moveTo(
        // rear left
        ship.x - ship.r * ((2 / 3) * Math.cos(ship.a) + 0.5 * Math.sin(ship.a)),
        ship.y + ship.r * ((2 / 3) * Math.sin(ship.a) - 0.5 * Math.cos(ship.a))
      );
      ctx.lineTo(
        // rear center
        ship.x - (5 / 3) * ship.r * Math.cos(ship.a),
        ship.y + (5 / 3) * ship.r * Math.sin(ship.a)
      );
      ctx.lineTo(
        // rear right of the ship
        ship.x - ship.r * ((2 / 3) * Math.cos(ship.a) - 0.5 * Math.sin(ship.a)),
        ship.y + ship.r * ((2 / 3) * Math.sin(ship.a) + 0.5 * Math.cos(ship.a))
      );
      ctx.closePath();
      ctx.stroke();
      ctx.fill();
    }
  } else {
    ship.thrust.x -= (FRICTION * ship.thrust.x) / FPS;
    ship.thrust.y -= (FRICTION * ship.thrust.y) / FPS;
  }

  // draw triangular ship
  if (!exploding) {
    if (blinkOn && !ship.dead) {
      drawShip(ship.x, ship.y, ship.a);
    }

    // handle blinking
    if (ship.blinkNum > 0) {
      // reduce the blink time
      ship.blinkTime--;

      //reduce the blink num;
      if (ship.blinkTime === 0) {
        ship.blinkTime = Math.ceil(SHIP_BLINK_DUR * FPS);
        ship.blinkNum--;
      }
    }
  } else {
    // draw the explosion
    ctx.fillStyle = "darkred";
    ctx.beginPath();
    ctx.arc(ship.x, ship.y, ship.r * 1.7, 0, Math.PI * 2, false);
    ctx.stroke();
    ctx.fill();
    ctx.fillStyle = "red";
    ctx.beginPath();
    ctx.arc(ship.x, ship.y, ship.r * 1.5, 0, Math.PI * 2, false);
    ctx.stroke();
    ctx.fill();
    ctx.fillStyle = "orange";
    ctx.beginPath();
    ctx.arc(ship.x, ship.y, ship.r * 1.1, 0, Math.PI * 2, false);
    ctx.stroke();
    ctx.fill();
    ctx.fillStyle = "yellow";
    ctx.beginPath();
    ctx.arc(ship.x, ship.y, ship.r * 0.8, 0, Math.PI * 2, false);
    ctx.stroke();
    ctx.fill();
    ctx.fillStyle = "white";
    ctx.beginPath();
    ctx.arc(ship.x, ship.y, ship.r * 0.5, 0, Math.PI * 2, false);
    ctx.stroke();
    ctx.fill();
  }

  if (SHOW_BOUNDING) {
    ctx.strokeStyle = "lime";
    ctx.beginPath();
    ctx.arc(ship.x, ship.y, ship.r, 0, Math.PI * 2, false);
    ctx.stroke();
  }

  // draw the lasers
  for (var i = 0; i < ship.lasers.length; i++) {
    if (ship.lasers[i].explodeTime === 0) {
      ctx.fillStyle = "salmon";
      ctx.beginPath();
      ctx.arc(
        ship.lasers[i].x,
        ship.lasers[i].y,
        SHIP_SIZE / 15,
        0,
        Math.PI * 2,
        false
      );
      ctx.fill();
    } else {
      // draw the explosion
      ctx.fillStyle = "orangered";
      ctx.beginPath();
      ctx.arc(
        ship.lasers[i].x,
        ship.lasers[i].y,
        ship.r * 0.75,
        0,
        Math.PI * 2,
        false
      );
      ctx.fill();
      ctx.fillStyle = "salmon";
      ctx.beginPath();
      ctx.arc(
        ship.lasers[i].x,
        ship.lasers[i].y,
        ship.r * 0.5,
        0,
        Math.PI * 2,
        false
      );
      ctx.fill();
      ctx.fillStyle = "pink";
      ctx.beginPath();
      ctx.arc(
        ship.lasers[i].x,
        ship.lasers[i].y,
        ship.r * 0.25,
        0,
        Math.PI * 2,
        false
      );
      ctx.fill();
    }
  }

  // draw the game text
  if (textAlpha >= 0) {
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "rgba(255, 255, 255, " + textAlpha + ")";
    ctx.font = "small-caps " + TEXT_SIZE + "px dejavu sans mono";
    ctx.fillText(text, canv.width / 2, canv.height * 0.75);
    textAlpha -= 1.0 / TEXT_FADE_TIME / FPS;
  } else if (ship.dead) {
    newGame();
  }

  // draw the lives
  var lifeColour;
  for (var i = 0; i < lives; i++) {
    lifeColour = exploding && i === lives - 1 ? "red" : "white";
    drawShip(
      SHIP_SIZE + i * SHIP_SIZE * 1.2,
      SHIP_SIZE,
      0.5 * Math.PI,
      lifeColour
    );
  }

  // draw the score
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "white";
  ctx.font = TEXT_SIZE + "px dejavu sans mono";
  ctx.fillText(score, canv.width - SHIP_SIZE / 2, SHIP_SIZE);

  // draw the high score
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "white";
  ctx.font = TEXT_SIZE * 0.75 + "px dejavu sans mono";
  ctx.fillText("Highscore: " + scoreHigh, canv.width / 2, SHIP_SIZE);

  // detect laser hits on asteroids
  var ax, ay, ar, lx, lt, ly;
  for (var i = roids.length - 1; i >= 0; i--) {
    // grab the asteroid properties
    ax = roids[i].x;
    ay = roids[i].y;
    ar = roids[i].r;

    // loop over the lasers
    for (var j = ship.lasers.length - 1; j >= 0; j--) {
      // grab the laser properties
      lx = ship.lasers[j].x;
      ly = ship.lasers[j].y;

      // detect hits
      if (
        ship.lasers[j].explodeTime === 0 &&
        distBetweenPoints(ax, ay, lx, ly) < ar
      ) {
        // destroy the asteroid and activate the laser explosion
        destroyAsteroid(i);
        ship.lasers[j].explodeTime = Math.ceil(LASER_EXPLODE_DUR * FPS);

        break;
      }
    }
  }

  // draw the asteroids
  ctx.fillStyle = "slategrey";
  ctx.lineWidth = SHIP_SIZE / 20;
  var x, y, r, a, vert, offs;
  for (var i = 0; i < roids.length; i++) {
    ctx.strokeStyle = "slategrey";
    // get the asteroid properties
    x = roids[i].x;
    y = roids[i].y;
    r = roids[i].r;
    a = roids[i].a;
    vert = roids[i].vert;
    offs = roids[i].offs;

    // draw a path
    ctx.beginPath();
    ctx.moveTo(x + r * offs[0] * Math.cos(a), y + r * offs[0] * Math.sin(a));
    // draw the polygon
    for (var j = 1; j < vert; j++) {
      ctx.lineTo(
        x + r * offs[j] * Math.cos(a + (j * Math.PI * 2) / vert),
        y + r * offs[j] * Math.sin(a + (j * Math.PI * 2) / vert)
      );
    }
    ctx.closePath();
    ctx.stroke();
    ctx.fill();

    if (SHOW_BOUNDING) {
      ctx.strokeStyle = "lime";
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2, false);
      ctx.stroke();
    }
  }

  if (!exploding) {
    // check for asteroid collisions
    if (ship.blinkNum === 0 && !ship.dead) {
      for (var i = 0; i < roids.length; i++) {
        if (
          distBetweenPoints(ship.x, ship.y, roids[i].x, roids[i].y) <
          ship.r + roids[i].r
        ) {
          explodeShip();
          destroyAsteroid(i);
          break;
        }
      }
    }

    // rotate ship
    ship.a += ship.rot;

    // move ship
    ship.x += ship.thrust.x;
    ship.y += ship.thrust.y;
  } else {
    ship.explodeTime--;

    // reset the ship after explosion has finished
    if (ship.explodeTime === 0) {
      lives--;
      if (lives === 0) {
        gameOver();
      } else {
        ship = newShip();
      }
    }
  }

  // handle edge of screen
  if (ship.x < 0 - ship.r) {
    ship.x = canv.width + ship.r;
  } else if (ship.x > canv.width + ship.r) {
    ship.x = 0 - ship.r;
  }
  if (ship.y < 0 - ship.r) {
    ship.y = canv.height + ship.r;
  } else if (ship.y > canv.height + ship.r) {
    ship.y = 0 - ship.r;
  }

  // move the lasers
  for (var i = ship.lasers.length - 1; i >= 0; i--) {
    // check distance travelled
    if (ship.lasers[i].dist > LASER_DIST * canv.width) {
      ship.lasers.splice(i, 1);
      continue;
    }

    // handle the explosion
    if (ship.lasers[i].explodeTime > 0) {
      ship.lasers[i].explodeTime--;

      // destroy the laser after the duration is up
      if (ship.lasers[i].explodeTime === 0) {
        ship.lasers.splice(i, 1);
        continue;
      }
    } else {
      // move laser
      ship.lasers[i].x += ship.lasers[i].xv;
      ship.lasers[i].y += ship.lasers[i].yv;

      // calculate the distance travelled
      ship.lasers[i].dist += Math.sqrt(
        Math.pow(ship.lasers[i].xv, 2) + Math.pow(ship.lasers[i].yv, 2)
      );

      // handle edge of screen
      if (ship.lasers[i].x < 0) {
        ship.lasers[i].x = canv.width;
      } else if (ship.lasers[i].x > canv.width) {
        ship.lasers[i].x = 0;
      }
      if (ship.lasers[i].y < 0) {
        ship.lasers[i].y = canv.height;
      } else if (ship.lasers[i].y > canv.height) {
        ship.lasers[i].y = 0;
      }
    }
  }

  // move the asteroid
  for (i = 0; i < roids.length; i++) {
    roids[i].x += roids[i].xv;
    roids[i].y += roids[i].yv;
    // handle edge of screen
    if (roids[i].x < 0 - roids[i].r) {
      roids[i].x = canv.width + roids[i].r;
    } else if (roids[i].x > canv.width + roids[i].r)
      roids[i].x = 0 - roids[i].r;
    if (roids[i].y < 0 - roids[i].r) {
      roids[i].y = canv.height + roids[i].r;
    } else if (roids[i].y > canv.height + roids[i].r)
      roids[i].y = 0 - roids[i].r;
  }

  // centre dot
  if (SHOW_CENTRE_DOT) {
    ctx.fillStyle = "red";
    ctx.fillRect(ship.x - 1, ship.y - 1, 2, 2);
  }
}
