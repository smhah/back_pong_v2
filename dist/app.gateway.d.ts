import { OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Socket, Server } from "socket.io";
interface UserInput {
    input: string;
    userId: string;
}
interface GameID {
    input: string;
}
interface Mode {
    input: string;
}
export declare class AppGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
    private server;
    private logger;
    private games;
    private playerToGameIndex;
    afterInit(server: Server): void;
    handleConnection(client: Socket, ...args: any[]): void;
    handleDisconnect(client: Socket): void;
    spectJoinRoom(socket: Socket, payload: GameID): void;
    joinRoom(socket: Socket, payload: Mode): void;
    handlePlayerInput(client: Socket, payload: UserInput): void;
}
export {};
