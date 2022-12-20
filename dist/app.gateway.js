"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppGateway = void 0;
const common_1 = require("@nestjs/common");
const websockets_1 = require("@nestjs/websockets");
const socket_io_1 = require("socket.io");
const min = (a, b) => {
    return a < b ? a : b;
};
const max = (a, b) => {
    return a > b ? a : b;
};
class Game {
    constructor(server) {
        this.server = server;
        this.width = 800;
        this.height = 400;
        this.aspectRatio = 2;
        this.initBallX = this.width / 2;
        this.initBallY = this.height / 2;
        this.ballRadius = 10;
        this.ballSpeed = 3;
        this.paddleWidth = 10;
        this.paddleHeight = 100;
        this.paddleSpeed = 10;
        this.ballX = this.initBallX;
        this.ballY = this.initBallY;
        this.ballDirX = 1;
        this.ballDirY = 1;
        this.paddleOneX = 0;
        this.paddleOneY = 0;
        this.paddleTwoX = this.width - this.paddleWidth;
        this.paddleTwoY = 0;
        this.state = "waiting";
        this.players = [];
        this.room = "";
        this.scores = [0, 0];
        this.maxScore = 2;
        this.rounds = 2;
        this.roundsWin = [0, 0];
        this.winner = "";
        this.lastscored = "";
        this.mod = "";
    }
    setMod(name) { this.mod = name; }
    getMod() { return this.mod; }
    cleanup() {
        clearInterval(this.loop);
    }
    getPlayers() { return this.players; }
    playerDisconnect(id) {
        if (this.players[0] === id)
            this.winner = this.players[1];
        else
            this.winner = this.players[0];
        this.setState("disconnect");
        this.server.to(this.room).emit("gameState", this.getGameState());
        this.cleanup();
    }
    addPlayer(id) {
        if (this.players.length < 2) {
            this.players.push(id);
        }
        if (this.players.length === 2) {
            console.log("players are ready");
            this.lastscored = this.players[0];
            this.run();
            this.setState("init");
        }
    }
    addSpec(id) {
        this.spectators.push(id);
    }
    setRoomName(name) { this.room = name; }
    getRoomName() { return this.room; }
    ;
    setState(state) { this.state = state; }
    getState() { return this.state; }
    async run() {
        let fps = 60;
        let i = 0;
        this.loop = setInterval(() => {
            if (this.state != "init") {
                this.updateBall();
                this.handlePaddleOneBounce();
                this.handlePaddleTwoBounce();
                this.updateScore();
            }
            if (i % 200 === 0) {
                console.log("room is " + this.room);
                console.log("y paddle one " + this.getGameState().paddleOneY);
                console.log("y paddle two " + this.getGameState().paddleTwoY);
                console.log("base y paddle one " + this.paddleOneY);
                console.log("base y paddle two " + this.paddleTwoY);
            }
            i++;
            this.server.to(this.room).emit("gameState", this.getGameState());
        }, 1000 / fps);
    }
    initRound(id) {
        this.scores[0] = 0;
        this.scores[1] = 0;
        console.log("player " + this.players.indexOf(id) + " inited the round");
        if (id === this.players[0]) {
            this.ballX = this.width / 10;
            this.ballY = this.height / 5;
            this.ballDirX *= -1;
        }
        else if (id === this.players[1]) {
            this.ballX = this.width * (9 / 10);
            this.ballY = this.height / 5;
            this.ballDirX *= -1;
        }
    }
    initGame(id) {
        if (id === this.players[0]) {
            this.ballX = this.width / 10;
            this.ballY = this.height / 5;
            this.ballDirX *= -1;
        }
        else if (id === this.players[1]) {
            this.ballX = this.width * (9 / 10);
            this.ballY = this.height / 5;
            this.ballDirX *= -1;
        }
    }
    updateBall() {
        this.ballX += this.ballSpeed * this.ballDirX;
        this.ballY += this.ballSpeed * this.ballDirY;
        if (this.ballX + this.ballRadius / 2 >= this.width || this.ballX - this.ballRadius / 2 <= 0)
            this.ballDirX *= -1;
        if (this.ballY + this.ballRadius / 2 >= this.height || this.ballY - this.ballRadius / 2 <= 0)
            this.ballDirY *= -1;
    }
    updateScore() {
        if (this.ballX > this.paddleTwoX) {
            console.log("scored1");
            this.scores[0]++;
            this.lastscored = this.players[0];
            if (this.scores[0] === this.maxScore) {
                this.roundsWin[0]++;
                this.winner = this.players[0];
                this.setState("endRound");
                this.cleanup();
            }
            else {
                this.setState("scored");
                this.cleanup();
            }
        }
        else if (this.ballX < this.paddleOneX + this.paddleWidth) {
            console.log("scored2");
            this.scores[1]++;
            this.lastscored = this.players[1];
            if (this.scores[1] === this.maxScore) {
                this.roundsWin[1]++;
                this.winner = this.players[1];
                this.setState("endRound");
                this.cleanup();
            }
            else {
                this.setState("scored");
                this.cleanup();
            }
        }
        if (this.roundsWin[0] === this.rounds) {
            this.winner = this.players[0];
            this.setState("endGame");
            this.cleanup();
        }
        else if (this.roundsWin[1] === this.rounds) {
            this.winner = this.players[1];
            this.setState("endGame");
            this.cleanup();
        }
    }
    handlePaddleOneBounce() {
        if (this.ballDirX === -1
            && this.ballY > this.paddleOneY
            && this.ballY < this.paddleOneY + this.paddleHeight) {
            if (this.ballX - this.ballRadius / 2 - this.paddleWidth <= 0)
                this.ballDirX *= -1;
        }
    }
    handlePaddleTwoBounce() {
        if (this.ballDirX === 1
            && this.ballY > this.paddleTwoY
            && this.ballY < this.paddleTwoY + this.paddleHeight) {
            if (this.ballX + this.ballRadius / 2 + this.paddleWidth >= this.width)
                this.ballDirX *= -1;
        }
    }
    updatePaddleOne(input) {
        if (input === "DOWN") {
            console.log("PADDLE ONE _____DOWN");
            console.log("room is " + this.room);
            this.paddleOneY += this.paddleSpeed;
            this.paddleOneY = min(this.paddleOneY, this.height - this.paddleHeight);
            console.log("moving " + this.paddleOneY);
        }
        else {
            console.log("PADDLE ONE _____UP");
            console.log("room is " + this.room);
            this.paddleOneY -= this.paddleSpeed;
            this.paddleOneY = max(this.paddleOneY, 0);
            console.log("moving " + this.paddleOneY);
        }
    }
    updatePaddleTwo(input) {
        if (input === "DOWN") {
            console.log("PADDLE TWO _____DOWN");
            console.log("room is " + this.room);
            this.paddleTwoY += this.paddleSpeed;
            this.paddleTwoY = min(this.paddleTwoY, this.height - this.paddleHeight);
            console.log("moving " + this.paddleTwoY);
        }
        else {
            console.log("PADDLE TWO _____UP");
            console.log("room is " + this.room);
            this.paddleTwoY -= this.paddleSpeed;
            this.paddleTwoY = max(this.paddleTwoY, 0);
            console.log("moving " + this.paddleTwoY);
        }
    }
    handleInput(payload) {
        if ((this.state === "endRound") && payload.input === "SPACE") {
            this.initRound(payload.userId);
            this.cleanup();
            this.run();
            this.setState("play");
        }
        else if ((this.state === "scored" || this.state === "init") && payload.input === "SPACE") {
            this.initGame(payload.userId);
            this.cleanup();
            this.run();
            this.setState("play");
        }
        else if (payload.input !== "SPACE") {
            if (payload.userId === this.players[0])
                this.updatePaddleOne(payload.input);
            else
                this.updatePaddleTwo(payload.input);
        }
    }
    getGameState() {
        return {
            ballX: this.ballX,
            ballY: this.ballY,
            ballDirX: this.ballDirX,
            ballDirY: this.ballDirY,
            paddleOneX: this.paddleOneX,
            paddleOneY: this.paddleOneY,
            paddleTwoX: this.paddleTwoX,
            paddleTwoY: this.paddleTwoY,
            state: this.state,
            players: this.players,
            scores: this.scores,
            maxScore: this.maxScore,
            winner: this.winner,
            lastscored: this.lastscored,
            rounds: this.rounds,
            roundsWin: this.roundsWin,
            width: this.width,
            height: this.height,
            aspectRatio: this.aspectRatio,
            paddleHeight: this.paddleHeight,
            paddleWidth: this.paddleWidth,
            ballRadius: this.ballRadius,
            mod: this.mod
        };
    }
}
let AppGateway = class AppGateway {
    constructor() {
        this.logger = new common_1.Logger("AppGateway");
        this.games = Array();
        this.playerToGameIndex = new Map();
    }
    afterInit(server) {
        this.server = server;
        this.logger.log("INITIALIZED");
    }
    handleConnection(client, ...args) {
        this.logger.log(`A player is connected ${client.id}`);
    }
    handleDisconnect(client) {
        this.logger.log(`A player is disconnected ${client.id}`);
        if (this.playerToGameIndex.has(client.id)) {
            console.log("game Index ", this.playerToGameIndex.get(client.id));
            this.games[this.playerToGameIndex.get(client.id)].playerDisconnect(client.id);
            this.playerToGameIndex.delete(client.id);
        }
    }
    spectJoinRoom(socket, payload) {
        console.log("spect trying to spectate this game : |" + payload.input + "|");
        socket.join(payload.input);
    }
    joinRoom(socket, payload) {
        const roomName = socket.id;
        console.log(roomName);
        if (this.games.length) {
            let i = 0;
            for (; i < this.games.length; i++) {
                console.log("-------players_number-------");
                console.log(this.games[i].getPlayers().length);
                console.log("-------payload_input-------");
                console.log(payload.input);
                console.log("-------game_mod-------");
                console.log(this.games[i].getMod());
                console.log("++++++++++++++++\n++++++++++++++++\n++++++++++++++++");
                if (this.games[i].getPlayers().length === 1 && this.games[i].getMod() == payload.input) {
                    this.games[i].addPlayer(socket.id);
                    socket.join(this.games[i].room);
                    console.log("Joined game address=" + this.games[i].room);
                    console.log("he joined game index | +" + i);
                    console.log("mod = |" + this.games[i].getMod() + "|");
                    this.playerToGameIndex.set(socket.id, i);
                    break;
                }
            }
            if (i === this.games.length) {
                this.games.push(new Game(this.server));
                this.games[i].setMod(payload.input);
                this.games[i].setRoomName(roomName);
                this.games[i].addPlayer(socket.id);
                socket.join(roomName);
                this.playerToGameIndex.set(socket.id, i);
                console.log("Created game Index=" + (i) + ",adress= " + roomName);
                console.log("mod = |" + this.games[i].getMod() + "|");
            }
        }
        else {
            this.games.push(new Game(this.server));
            this.games[0].setMod(payload.input);
            this.games[0].setRoomName(roomName);
            this.games[0].addPlayer(socket.id);
            socket.join(roomName);
            console.log("created game Index=" + 0, roomName);
            console.log("mod = |" + this.games[0].getMod() + "|");
            this.playerToGameIndex.set(socket.id, 0);
        }
    }
    handlePlayerInput(client, payload) {
        console.log("emmit received from + ", client.id);
        this.games[this.playerToGameIndex.get(client.id)].handleInput(Object.assign(Object.assign({}, payload), { userId: client.id }));
    }
};
__decorate([
    (0, websockets_1.SubscribeMessage)('spectJoined'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", void 0)
], AppGateway.prototype, "spectJoinRoom", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('playerJoined'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", void 0)
], AppGateway.prototype, "joinRoom", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('playerInput'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", void 0)
], AppGateway.prototype, "handlePlayerInput", null);
AppGateway = __decorate([
    (0, websockets_1.WebSocketGateway)(6001, {
        cors: {
            origin: '*',
        }
    })
], AppGateway);
exports.AppGateway = AppGateway;
//# sourceMappingURL=app.gateway.js.map