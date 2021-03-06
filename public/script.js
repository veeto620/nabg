var currentPlayer;
var stage;
var queue;
var sprites;
var FPS = 30;
var playerSprite;
var checkingForMovement = false;
var socket;
var gameReady = false;
var playerSprites = [];
var explosionSprite;
var playerData = [];
var titlePlayerList = [];
var dead = false;
var winnerName;
var powerups = {};
var powerupDrops = [];
var playersInGameText = false;
var CANVAS_HEIGHT = 600;
var CANVAS_WIDTH = 800;
var isGameOver = false;
var levelChoice = 0;
const HOLD = 0;
const CONSTRUCT = 100;
const TITLE = 200;
const INSTRUCTIONS = 300;
const START_GAME = 400;
const START_LEVEL = 500;
const IN_GAME = 600;
const GAME_OVER = 700;
const RESET = 800;

var gameState = HOLD;

$('document').ready(function () {
    socket = io();
    $('#message_form').hide();

    $('#client_info').submit(function (evt) {
        evt.preventDefault();
        var temp = '';
        socket.emit('get clients', temp);
        socket.emit('getlevelchoice');
    });

    //need to add a player to the divs and the new players need to have all the players that were there first
    //when someone disconnects they need to dissapear

    //    socket.on("client joined", function(newestPlayer) {
    //    });

    //    $('#lives').submit(function (evt) {
    //        evt.preventDefault();
    //        var temp = {
    //            name: currentPlayer.name
    //        }
    //        socket.emit('life changed', temp);
    //    });
    //
    //    $('#message_form').submit(function (evt) {
    //        evt.preventDefault();
    //        var temp = {
    //            name: currentPlayer.name,
    //            msg: $('#msg').val()
    //        }
    //        socket.emit('chat message', temp);
    //        $('#msg').val("");
    //    });
    //
    //    $('#name_form').submit(function (evt) {
    //        evt.preventDefault();
    //        var playerName = document.getElementById('name').value;
    //        currentPlayer = {
    //            range: 1,
    //            bomb: {},
    //            bombClones: [],
    //            lives: 3,
    //            moveSpeed: 4,
    //            name: playerName,
    //            powerup: 'None',
    //            ready: false,
    //            score: 0,
    //            sid: socket.id,
    //            sprite: playerSprite
    //        };
    //        socket.emit('new player', playerName);
    //        $('#message_form').show();
    //        $('#name_form').hide();
    //    });
    //
    //    $('#powerup').submit(function (evt) {
    //        evt.preventDefault();
    //        var temp = {
    //            name: currentPlayer.name,
    //            power: 'cat'
    //        };
    //        socket.emit('powerup changed', temp);
    //    });
    //
    //    $('#score').submit(function (evt) {
    //        evt.preventDefault();
    //        var temp = {
    //            name: currentPlayer.name
    //        };
    //        socket.emit('score changed', temp);
    //    });

    socket.on("bomb place recieved", function (bombRecieved) {
        placeBomb(bombRecieved);
    });

    socket.on("chat received", function (data) {
        $('#messages').prepend($('<li>').text(data.name + ' says: ' + data.message));
    });

    socket.on("coords change", function (coords) {
        if (coords.name != currentPlayer.name) {
            playerSprites[coords.who].x = coords.x;
            playerSprites[coords.who].y = coords.y;
            if (playerSprites[coords.who].lastAnimation != coords.animation) {
                playerSprites[coords.who].gotoAndPlay(coords.animation);
                playerSprites[coords.who].lastAnimation = coords.animation;
            }
            stage.update();
        }
    });

    socket.on("game state change", function (state) {
        // console.log("new state: " + state);
        if (gameState === GAME_OVER) { isGameOver = true; }
        gameState = state;
    });

    socket.on('life change', function (life) {
        // $('#messages').prepend($('<li>').text(life.name + ' now has ' + life.num + ' lives'));
        // $('#' + life.name + 'Lives').text('Lives: ' + life.num);

        for (var i = 0; i < playerData.length; i++) {
            if (life.name == playerData[i].name) {
                playerData[i].lives = life.num;
                updateLifeCounter(i);
                playerData[i].livesText.text = life.num;
                if (life.num === 0) {
                    socket.emit("dead", life.name);//currentPlayer.name);
                    redXArray[i].visible = true;
                    playerSprites[i].visible = false; //stage.removeChild(playerSprites[i])//currentPlayer.playerSprite);
                    if (life.name === currentPlayer.name) {
                        dead = true;
                    }
                }
            }
        }
        stage.update();
        // updateHUD();
    });

    socket.on('name received', function (players) {
        //currentPlayer = players[players.length - 1].name; //setting up player when form is submitted
        var newestPlayer = players[players.length - 1].name;
        document.getElementById('players').innerHTML = '';
        playerData = []; // playerData needs to be reset so that there aren't extra player objects in the game
        for (var i = 0; i < players.length; i++) {
            playerSprites[i].x = players[i].coords.x;
            playerSprites[i].y = players[i].coords.y;
            addPlayer(players[i].name, players[i].score, players[i].lives, players[i].powerup, players[i].playerSlotId);
            if (players[i].name == currentPlayer.name) {
                currentPlayer.sprite = playerSprites[i];
            }
        }

        $('#messages').prepend($('<li>').text(newestPlayer + ' has joined the game'));
    });

    socket.on('players reset', function (players) {
        playerData = [];
        titlePlayerList = [];
        for (var i = 0; i < players.length; i++) {
            playerSprites[i].x = players[i].coords.x;
            playerSprites[i].y = players[i].coords.y;
            addPlayer(players[i].name, players[i].score, players[i].lives, players[i].powerup, players[i].playerSlotId);
            if (players[i].name == currentPlayer.name) {
                currentPlayer.sprite = playerSprites[i];
                currentPlayer.range = 1;
                currentPlayer.lives = 3;
                currentPlayer.ready = false;
                currentPlayer.moveSpeed = 4;
                dead = false;
            }
        }
    });

    // socket.on('new player join successful', function (playerInfo) {
    //     if (socket.id === playerInfo) {
    //         console.log('join successful');
    //         currentPlayer = playerInfo.player;
    //     }
    // });

    socket.on('player ready check', function (areAllPlayersReady) {
        if (areAllPlayersReady) {
            gameReady = true;
            playerData.forEach(function (player, index) {
                player.ready = true;
            })
            // console.log('allPlayersReady');
            gameState = START_GAME;
        }
    });

    socket.on('powerup dropped', function (powerup) {
        // console.log(powerup.name);
        var newPD = powerups[powerup.name].clone();
        newPD.name = powerup.name;
        newPD.x = powerup.x;
        newPD.y = powerup.y;
        newPD.frameSet = frameCount;
        newPD.visible = true;
        powerupDrops.push(newPD);
        stage.addChild(newPD);
    });

    socket.on('powerup change', function (powerup) {
        $('#messages').prepend($('<li>').text(powerup.name + ' got ' + powerup.power + ' powerup'));
        // console.log(powerup.name + ":" + powerup.power);
        switch (powerup.power) {
            case "bomb":
                MAX_BOMBS_DEPLOYABLE++;
                cloneBombs();
                break;
            case "range":
                currentPlayer.range++;
                break;
            case "move":
                currentPlayer.moveSpeed += 2;
                break;
            default:
                // console.log("Power up error");
                break;
        }
    });

    socket.on('remove player', function (idToRemove) {
        // console.log('remove player handler');

        var containerToRemove = stage.getChildByName("player" + idToRemove);

        stage.removeChild(containerToRemove);
        stage.update();

        // $('#player' + idToRemove).remove();
    });

    socket.on('score change', function (score) {
        // $('#messages').prepend($('<li>').text(score.name + ' now has ' + score.num + ' points'));
        // $('#' + score.name + 'Score').text('Score: ' + score.num);

        for (var i = 0; i < playerData.length; i++) {
            if (score.name == playerData[i].name) {
                playerData[i].score = score.num;
                var scoreText = stage.getChildByName("player" + playerData[i].slotId + "score");
                scoreText.text = "Score: " + score.num;
            }
        }
    });

    socket.on('disconnected', function () {
        alert('Sorry but this game is full');
    });

    socket.on('winner', function (name) {
        winnerName.text = name + " survived!";
        winnerName.x = 240;
        winnerName.y = 200;
        stage.addChild(winnerName);
    });

    initGame();
});

function updateLifeCounter(playerIndex) {
    if (playerData[playerIndex].lives == 1) {
        lifeSprites[playerIndex][0].visible = true;
        lifeSprites[playerIndex][1].visible = false;
        lifeSprites[playerIndex][2].visible = false;
    } else if (playerData[playerIndex].lives == 2) {
        lifeSprites[playerIndex][0].visible = true;
        lifeSprites[playerIndex][1].visible = true;
        lifeSprites[playerIndex][2].visible = false;
    } else if (playerData[playerIndex].lives == 3) {
        lifeSprites[playerIndex][0].visible = true;
        lifeSprites[playerIndex][1].visible = true;
        lifeSprites[playerIndex][2].visible = true;
    }
}

function initGame() {
    winnerName = new createjs.Text(name + " survived!", "36px Arial", "#000");
    setupCanvas();
    loadFiles();
}

function setupCanvas() {
    var canvas = document.getElementById("game");
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    stage = new createjs.Stage(canvas);
    stage.enableMouseOver();
}

var cacheVersion = new Date().getTime();
var jsEnd = ".js?a=" + cacheVersion;

manifest = [
    {
        src: "scripts/visibility" + jsEnd
    },
    {
        src: "scripts/init" + jsEnd
    },
    {
        src: "scripts/build_buttons" + jsEnd
    },
    {
        src: "scripts/build_screens" + jsEnd
    },
    {
        src: "scripts/game_timer" + jsEnd
    },
    {
        src: "scripts/key_commands" + jsEnd
    },
    {
        src: "scripts/game_loop" + jsEnd
    },
    {
        src: "scripts/game_data" + jsEnd
    },
    {
        src: "scripts/game_player" + jsEnd
    },
    {
        src: "scripts/ndgmr.Collision" + jsEnd
    },
    {
        src: "images/game over.png",
        id: "gameOverScreen"
    },
    {
        src: "images/instructions.png",
        id: "instructionsScreen"
    },
    {
        src: "images/levelone bg.png",
        id: "playAreaScreen1"
    },
    {
        src: "images/leveltwo bg.png",
        id: "playAreaScreen2"
    },
    {
        src: "images/level three bg.png",
        id: "playAreaScreen3"
    },
    {
        src: "images/title.png",
        id: "titleScreen"
    },
    {
        src: "images/sprite0.png",
        id: "playerSprite0"
    },
    {
        src: "images/sprite1.png",
        id: "playerSprite1"
    },
    {
        src: "images/sprite2.png",
        id: "playerSprite2"
    },
    {
        src: "images/sprite3.png",
        id: "playerSprite3"
    },
    {
        src: "images/explosion.png",
        id: "explosion"
    },
    {
        src: "images/ready.png",
        id: "readyBtn"
    },
    {
        src: "images/start button.png",
        id: "playBtn"
    },
    {
        src: "images/instructions button.png",
        id: "instructionsBtn"
    },
    {
        src: "images/main menu button.png",
        id: "mainmenuBtn"
    },
    {
        src: "images/extrabomb.png",
        id: "bombPowerUp"
    },
    {
        src: "images/increasemovement.png",
        id: "movePowerUp"
    },
    {
        src: "images/increaserange.png",
        id: "rangePowerUp"
    },
    {
        src: "images/regbomb.png",
        id: "regularBomb"
    },
    {
        src: "images/breakableflower.png",
        id: "flower"
    },
    {
        src: "images/unbreakabletree.png",
        id: "tree"
    },
    {
        src: "images/breakableshrub.png",
        id: "shrub"
    },
    {
        src: "images/unbreakablefountain.png",
        id: "fountain"
    },
    {
        src: "images/breakablerock.png",
        id: "brock"
    },
    {
        src: "images/unbreakablerock.png",
        id: "urock"
    },
    {
        src: "images/RedX.png",
        id: "redX"
    },
    {
        src: "images/enterName.png",
        id: "enterNameButton"
    },
    {
        src: "sounds/explosion.mp3",
        id: "explosionSound"
    }

];

function loadFiles(event) {
    createjs.Sound.alternateExtensions = ["mp3"];
    queue = new createjs.LoadQueue(true, "assets/");

    queue.installPlugin(createjs.Sound);
    queue.on("complete", loadComplete, this);
    queue.loadManifest(manifest);
}

function startLoop() {
    createjs.Ticker.addEventListener('tick', loop);
    createjs.Ticker.setFPS(FPS);
}

function setImageStack() {
    stage.addChild(gameOverScreen);
    stage.addChild(titleScreen);
    stage.addChild(playAreaScreen1);
    stage.addChild(playAreaScreen2);
    stage.addChild(playAreaScreen3);
    stage.addChild(instructionScreen);

    stage.addChild(nameInput);
    stage.addChild(nameInputButton);
    switch (levelChoice) {
        case 0: playAreaScreen = playAreaScreen1; break;
        case 1: playAreaScreen = playAreaScreen2; break;
        case 2: playAreaScreen = playAreaScreen3; break;
        default:
            // console.log("Level decision error"); 
            break;
    }

    hideItems(titleScreen, playAreaScreen1, playAreaScreen2, playAreaScreen3, instructionScreen, gameOverScreen);
}

function loadComplete(event) {
    if (!getCurrentHighScore()) document.cookie = "highscore=0;";
    titleScreen = new createjs.Bitmap(queue.getResult("titleScreen"));
    playAreaScreen1 = new createjs.Bitmap(queue.getResult("playAreaScreen1"));
    playAreaScreen2 = new createjs.Bitmap(queue.getResult("playAreaScreen2"));
    playAreaScreen3 = new createjs.Bitmap(queue.getResult("playAreaScreen3"));
    instructionScreen = new createjs.Bitmap(queue.getResult("instructionsScreen"));
    gameOverScreen = new createjs.Bitmap(queue.getResult("gameOverScreen"));

    nameInput = new createjs.Text("Name: ", "14px Arial", "#FFFFFF");
    nameInput.x = 20;
    nameInput.y = 500;

    //nameInputButton

    document.onkeydown = function (evt) {
        if (!evt) { var evt = window.event; }
        // console.log(evt);


        if (evt.keyCode === 8 && nameInput.text.length > 6) {
            // console.log(nameInput);
            evt.preventDefault();
            nameInput.text = nameInput.text.substring(0, nameInput.text.length - 1);
        } else if (evt.keyCode > 47 && evt.keyCode < 91) {
            nameInput.text += evt.key;
        }
    }
    nameInputButton = new createjs.Bitmap(queue.getResult("enterNameButton"));
    nameInputButton.x = 20;
    nameInputButton.y = 525;
    nameInputButton.visible = true;

    nameInputButton.on('click', function () {
        var name = nameInput.text.substring(6);
        currentPlayer = {
            range: 1,
            bomb: {},
            bombClones: [],
            lives: 3,
            moveSpeed: 4,
            name: name,
            powerup: 'None',
            ready: false,
            score: 0,
            sid: socket.id,
            sprite: playerSprite
        };
        socket.emit('new player', name);
        nameInputButton.visible = false;
        document.onkeydown = handleKeyDown;
    });

    gameState = CONSTRUCT;
    initPowerups();
    setImageStack();

    playerSpriteInit();
    explosionSpriteInit();
    startLoop();
}

function initPowerups() {
    powerups = {
        "bomb": new createjs.Bitmap(queue.getResult("bombPowerUp")),
        "range": new createjs.Bitmap(queue.getResult("rangePowerUp")),
        "move": new createjs.Bitmap(queue.getResult("movePowerUp")),
    }
}

function updateHUD() {
    for (var i = 0; i < playerData.length; i++) {
        playerData[i].nameText = playerData[i].name;
        playerData[i].scoreText = "Score: " + playerData[i].score;
        playerData[i].livesText = playerData[i].lives;
        playerData[i].powerupText = playerData[i].powerup;
    }
    stage.update();
}


function addPlayer(name, score, lives, powerup, slotId) {
    var existingContainer = stage.getChildByName("player" + slotId);
    if (existingContainer) {
        stage.removeChild(existingContainer);
    }
    if (!playersInGameText) {
        playersInGameText = new createjs.Text("Players In Game:", "14px Arial", '#000');
        playersInGameText.x = 20;
        playersInGameText.y = 18;
        stage.addChild(playersInGameText);

    }
    var playerContainer = new createjs.Container();

    var playerName = new createjs.Text(name, "12px Arial", "#000");
    playerName.x = 20;
    playerName.y = 35 + slotId * 15 //75 * slotId + 20;
    playerName.name = "player" + slotId + "name";
    titlePlayerList.push(playerName);
    stage.addChild(playerName);

    if (stage.getChildByName("player" + slotId + "score") !== null) {
        var textToDelete = stage.getChildByName("player" + slotId + "score");
        stage.removeChild(textToDelete);
    }

    var playerScore = new createjs.Text("Score: " + score, "12px Arial", "#000");
    playerScore.x = 20;
    playerScore.y = 75 * slotId + 35;
    playerScore.name = "player" + slotId + "score";
    playerScore.visible = false;
    stage.addChild(playerScore);

    var playerLives = new createjs.Text(lives, "12px Arial", "#000");
    playerLives.x = 20;
    playerLives.y = 75 * slotId + 50;
    playerLives.name = "player" + slotId + "lives";
    playerLives.visible = false;
    stage.addChild(playerLives);

    var playerPowerUp = new createjs.Text(powerup, "12px Arial", "#000");
    playerPowerUp.x = 20;
    playerPowerUp.y = 75 * slotId + 65;
    playerPowerUp.name = "player" + slotId + "powerup";
    playerPowerUp.visible = false;
    stage.addChild(playerPowerUp);

    playerContainer.name = "player" + slotId;

    stage.addChild(playerContainer);

    playerData.push({
        name: name,
        nameText: playerName,
        score: score,
        scoreText: playerScore,
        lives: lives,
        livesText: playerLives,
        powerup: powerup,
        powerupText: playerPowerUp,
        ready: false,
        slotId: slotId
    });


    // var playerDiv = document.createElement('div');
    // var playerName = document.createElement('p');
    // playerName.innerHTML = name;

    // var playerScore = document.createElement('p');
    // playerScore.setAttribute('id', name + 'Score');
    // playerScore.innerHTML = 'Score: ' + score;

    // var playerLives = document.createElement('p');
    // playerLives.setAttribute('id', name + 'Lives');
    // playerLives.innerHTML = 'Lives: ' + lives;

    // var playerPowerUp = document.createElement('p');
    // playerPowerUp.setAttribute('id', name + 'PowerUp');
    // playerPowerUp.innerHTML = 'Power Up: ' + powerup;

    // playerDiv.appendChild(playerName);
    // playerDiv.appendChild(playerScore);
    // playerDiv.appendChild(playerLives);
    // playerDiv.appendChild(playerPowerUp);

    // playerDiv.id = 'player' + slotId;
    // $('#players').append(playerDiv);
}


function playerSpriteInit() {
    var walksheets = [];
    for (var i = 0; i < 4; i++) {
        walksheets.push(new createjs.SpriteSheet({
            images: [queue.getResult("playerSprite" + i)],
            frames: [[0, 0, 28, 28], [28, 0, 28, 28], [56, 0, 28, 28], [0, 28, 28, 28], [28, 28, 28, 28], [56, 28, 28, 28], [0, 56, 28, 28], [28, 56, 28, 28], [56, 56, 28, 28], [0, 84, 28, 28], [28, 84, 28, 28], [56, 84, 28, 28]],
            animations: {
                walkDown: [0, 2, "walkDown", .25],
                walkLeft: [3, 5, "walkLeft", .25],
                walkRight: [6, 8, "walkRight", .25],
                walkUp: [9, 11, "walkUp", .25]
            }
        }));

        playerSprite = new createjs.Sprite(walksheets[i]);
        playerSprite.x = 10000;
        playerSprite.y = 10000;
        playerSprite.gotoAndPlay("walkDown");  //loops through the animation frames (1-12) as defined above
        playerSprite.visible = false;
        playerSprite.lastAnimation = "walkDown";
        stage.addChild(playerSprite);
        playerSprites.push(playerSprite);
    }
}

function explosionSpriteInit() {
    var explosion = new createjs.SpriteSheet({
        images: [queue.getResult("explosion")],
        frames: [[0, 0, 32, 32], [32, 0, 32, 32], [64, 0, 32, 32], [96, 0, 32, 32], [0, 32, 32, 32], [32, 32, 32, 32], [64, 32, 32, 32], [96, 32, 32, 32], [0, 64, 32, 32], [32, 64, 32, 32], [64, 64, 32, 32], [96, 64, 32, 32], [0, 96, 32, 32], [32, 96, 32, 32], [64, 96, 32, 32], [96, 96, 32, 32], [0, 0, 0, 0]],
        animations: {
            boom: [0, 15, "hidden"],
            hidden: [16]
        }
    });

    explosionSprite = new createjs.Sprite(explosion);
    explosionSprite.gotoAndPlay("boom");
    explosionSprite.visible = false;
}