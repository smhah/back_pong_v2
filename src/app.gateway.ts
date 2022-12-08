import { Logger } from '@nestjs/common';
import { SubscribeMessage, WebSocketGateway, OnGatewayInit,  OnGatewayConnection, OnGatewayDisconnect, MessageBody, WebSocketServer } from '@nestjs/websockets';
import {Socket, Server} from "socket.io"
import { WsResponse } from '@nestjs/websockets';
import { SocketAddress } from 'net';
import { stat } from 'fs';

const min = (a: number, b: number) => {
  return a < b ? a : b;
}
const max = (a: number, b: number) => {
  return a > b ? a : b;
}

interface UserInput {
  input: string;
  userId: string;
}

interface GameID {
  input: string;
}

interface Game {
  server: Server;

  //Constants
  width: number;
  height: number;
  aspectRatio : number;

  initBallX: number;
  initBallY: number;
  ballRadius: number;
  ballSpeed: number;

  paddleWidth: number;
  paddleHeight: number;
  paddleSpeed: number;

  // Game variables
  ballX: number;
  ballY: number;
  ballDirX: number;
  ballDirY: number;

  paddleOneX: number;
  paddleOneY: number;

  paddleTwoX: number;
  paddleTwoY: number;

  loop: NodeJS.Timer;

  // state: 0 | 1 | 2;
  state: string;// "waiting" | "play" | "scored" | "endGame"
  players: Array<string>;
  spectators: Array<string>;

  scores: Array<number>;
  maxScore: number;
  lastscored: string;

  // rounds: number;
  // roundsWin: Array<number>;

  winner : string;
  room: string;
}

interface GameState {
  // Window dimensions
  width: number;
  height: number;
  aspectRatio : number;

  // Game variables
  ballX: number;
  ballY: number;
  ballDirX: number;
  ballDirY: number;
  ballRadius: number;

  paddleOneX: number;
  paddleOneY: number;

  paddleTwoX: number;
  paddleTwoY: number;

  paddleWidth: number;
  paddleHeight: number;

  state: string; // "waiting" | "play" | "scored" | "endGame" | "disconnect"   "init"

  players : Array<string>;

  scores: Array<number>;
  maxScore: number;

  winner: string;
  lastscored: string;
}

class Game {
  constructor(server: Server) {
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

    // Game variables
    this.ballX = this.initBallX;
    this.ballY = this.initBallY;
    this.ballDirX = 1;
    this.ballDirY = 1;

    this.paddleOneX = 0;
    this.paddleOneY = 0;

    this.paddleTwoX = this.width - this.paddleWidth;
    this.paddleTwoY = 0;

    //this.state = 0;
    this.state = "waiting";
    this.players = [];
    this.room = "";

    this.scores = [0,0];
    this.maxScore = 2;
    this.winner = "";
    this.lastscored = "";
  }
  cleanup(): void {
    clearInterval(this.loop);
  }

  getPlayers(): Array<string> { return this.players }
  
  playerDisconnect(id: string): void{
    if(this.players[0] === id)
      this.winner = this.players[1];
    else
      this.winner = this.players[0];
    this.setState("disconnect");
    this.server.to(this.room).emit("gameState", this.getGameState());
    this.cleanup();
  } 

  addPlayer(id: string): void {
    if (this.players.length < 2)
    {
      this.players.push(id);
      console.log("player waiting for oppenent");
    }
    if (this.players.length === 2) {
      console.log("players are ready");
      this.lastscored = this.players[0];
      this.run();
      //this.cleanup();
      // for(let i = 0; i < 100000; i++)
      //   this.server.to(this.room).emit("gameState", this.getGameState());
      this.setState("init");
      // this.server.to(this.room).emit("gameState", this.getGameState());
      // this.toggleGameState();
    } 
  }

  addSpec(id: string): void {
    this.spectators.push(id);
  }

  setRoomName(name: string): void { this.room = name; }
  setState(state: string) : void{this.state = state}
  // toggleGameState(): void {
  //   this.state = (this.state === 0 ? 1 : 2)
  //   if (this.state === 2) this.cleanup();
  // }
  
  async run() {
    let fps: number = 60;
    this.loop = setInterval(() => {
      if(this.state != "init")
      {
        this.updateBall();
        this.handlePaddleOneBounce();
        this.handlePaddleTwoBounce();
        this.updateScore();
        console.log("width is "+ this.width);
        console.log("height is " + this.height);
      }
     
      this.server.to(this.room).emit("gameState", this.getGameState());
    }, 1000 / fps);
  }

  initGame(id: string)
  {
    if(id === this.players[0])
    {
      this.ballX = this.width / 10;
      this.ballY = this.height / 5;
      console.log("player1 trying to start");
      this.ballDirX *= -1;
    }
    else if(id === this.players[1])
    {
      this.ballX = this.width *  (9 / 10) ;
      this.ballY = this.height / 5;
      this.ballDirX *= -1;
      console.log("player2 trying to start");
    }
  }

  updateBall() {
    //update
    this.ballX += this.ballSpeed * this.ballDirX;
    this.ballY += this.ballSpeed * this.ballDirY;

    //no overlap ?
    // if (this.ballDirX > 0)
    //   this.ballX = min(this.ballX, this.width - this.ballRadius / 2);
    // else
    //   this.ballX = max(this.ballX, this.ballRadius / 2);
    // if (this.ballDirY > 0)
    //   this.ballY = min(this.ballY, this.height - this.ballRadius / 2);
    // else
    //   this.ballY = max(this.ballY, this.ballRadius / 2);

    //collision
    if (this.ballX + this.ballRadius / 2 >= this.width || this.ballX - this.ballRadius / 2 <= 0)
      this.ballDirX *= -1;
    if (this.ballY + this.ballRadius / 2 >= this.height || this.ballY - this.ballRadius / 2 <= 0)
      this.ballDirY *= -1;
  }

  updateScore(){
    if(this.ballX > this.paddleTwoX)
    {
        this.scores[0]++;
        console.log("scored1");
        this.setState("scored");
        this.lastscored = this.players[0];
        this.cleanup();
    }
    else if (this.ballX < this.paddleOneX + this.paddleWidth)
    {
      console.log("scored2");
        this.scores[1]++;
        this.setState("scored");
        this.lastscored = this.players[1];
        this.cleanup();
    }
    if(this.scores[0] === this.maxScore)
    {
      this.winner = this.players[0];
      this.setState("endGame");
      this.cleanup();
    }
    else if (this.scores[1] === this.maxScore)
    {
      this.winner = this.players[1];
      this.setState("endGame");
      this.cleanup();
    }
  }

  handlePaddleOneBounce() {

    if (
      this.ballDirX === -1
      && this.ballY > this.paddleOneY
      && this.ballY < this.paddleOneY + this.paddleHeight // ball in front of paddle and going toward paddle
    ) {
      // console.log("in paddle one range")
      //this.ballX = max(this.ballX, this.ballRadius / 2 + this.paddleWidth);
      if (this.ballX - this.ballRadius / 2 - this.paddleWidth <= 0)
        this.ballDirX *= -1;
    }
  }
  handlePaddleTwoBounce() {

    if (
      this.ballDirX === 1
      && this.ballY > this.paddleTwoY
      && this.ballY < this.paddleTwoY + this.paddleHeight // ball in front of paddle and going toward paddle
    ) {
      // console.log("in paddle two range")

      //this.ballX = min(this.ballX, this.width - this.ballRadius / 2 - this.paddleWidth);

      if (this.ballX + this.ballRadius / 2 + this.paddleWidth >= this.width)
        this.ballDirX *= -1;
    }
  }

  updatePaddleOne(input: string) {

    if (input === "DOWN") {
      this.paddleOneY += this.paddleSpeed;
      this.paddleOneY = min(this.paddleOneY, this.height - this.paddleHeight);
    }
    else {
      this.paddleOneY -= this.paddleSpeed;
      this.paddleOneY = max(this.paddleOneY, 0);
    }
  }
  updatePaddleTwo(input: string) {

    if (input === "DOWN") {
      this.paddleTwoY += this.paddleSpeed;
      this.paddleTwoY = min(this.paddleTwoY, this.height - this.paddleHeight);
    }
    else {
      this.paddleTwoY -= this.paddleSpeed;
      this.paddleTwoY = max(this.paddleTwoY, 0);
    }
  }

  handleInput(payload: UserInput) {
    if((this.state === "scored" || this.state === "init" )&& payload.input === "SPACE")
    {
      this.initGame(payload.userId);
      this.cleanup();
      this.run();
      this.setState("play");
    }
    else if (payload.input !== "SPACE")
    {
      if (payload.userId === this.players[0])
        this.updatePaddleOne(payload.input);
      else
        this.updatePaddleTwo(payload.input);
    }
  }

  getGameState(): GameState {
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
      players : this.players,

      scores : this.scores,
      maxScore : this.maxScore,
      winner : this.winner,
      lastscored : this.lastscored,
      
      width : this.width,
      height : this.height,
      aspectRatio : this.aspectRatio,

      paddleHeight : this.paddleHeight,
      paddleWidth : this.paddleWidth,
      ballRadius : this.ballRadius
    }
  }
}
  //
@WebSocketGateway(6001, { 
  cors: {
  origin: '*',
  }
})
export class AppGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect{

  private  server: Server;
  private logger: Logger = new Logger("AppGateway");
  //game object
  private games: Array<Game> = Array<Game>();
  private playerToGameIndex: Map<string, number> = new Map<string, number>();

  afterInit(server: Server) {
    this.server = server;
    this.logger.log("INITIALIZED")
  }

  handleConnection(client: Socket, ...args: any[]) : void{
    this.logger.log(`A player is connected ${client.id}`);
  }

  handleDisconnect(client: Socket) : void{
    this.logger.log(`A player is disconnected ${client.id}`);
    if (this.playerToGameIndex.has(client.id)) {
      console.log("game Index ", this.playerToGameIndex.get(client.id))
      //this.games[this.playerToGameIndex.get(client.id)].toggleGameState()
      this.games[this.playerToGameIndex.get(client.id)].playerDisconnect(client.id);
      //this.games.slice(this.playerToGameIndex.get(client.id), 1);
      this.playerToGameIndex.delete(client.id);
    }
  }

  @SubscribeMessage('spectJoined')
  spectJoinRoom(socket: Socket, payload: GameID): void{
    console.log("spect trying to spectate this game : |" + payload.input + "|");
    //this.games[this.games.length - 1].addSpec(socket.id);
    socket.join(payload.input);
  }

  @SubscribeMessage('playerJoined')
  joinRoom(socket: Socket): void {
    const roomName: string = socket.id;
    console.log(roomName)
    // if (this.playerToGameIndex.has(socket.id)) {
    //   console.log(this.games[this.playerToGameIndex[socket.id]].getPlayers())
    //   if (this.games[this.playerToGameIndex[socket.id]].getPlayers().length == 2)
    //     this.games[this.playerToGameIndex[socket.id]].toggleGameState()
    //   return;
    // }

    if (this.games.length) {
      if (this.games[this.games.length - 1].getPlayers().length < 2) {  // player 1 and player 2 are ready to play
        this.games[this.games.length - 1].addPlayer(socket.id);
        socket.join(this.games[this.games.length - 1].room);
        console.log("Joined game Index=" + (this.games.length - 1), roomName); // not this room
        console.log("he joined game |" + this.games[this.games.length - 1].room + "|")
      }
      else {
        this.games.push(new Game(this.server)); // player 1 just created a game and waiting for player 2 to join his room
        this.games[this.games.length - 1].setRoomName(roomName);
        this.games[this.games.length - 1].addPlayer(socket.id);
        socket.join(roomName);
        console.log("Created game Index=" + (this.games.length - 1), roomName)
      }
    }
    else {
      this.games.push(new Game(this.server)); // yaaay this is the first player create a game in this session, his waiting for player 2 to join
      this.games[0].setRoomName(roomName);
      this.games[0].addPlayer(socket.id);
      socket.join(roomName);
      console.log("created game Index=" + 0, roomName)
    }

    this.playerToGameIndex.set(socket.id, this.games.length - 1);
  }

  @SubscribeMessage('playerInput')
  handlePlayerInput(client: Socket, payload: UserInput): void {
    this.games[this.playerToGameIndex.get(client.id)].handleInput({ ...payload, userId: client.id })
  }
}