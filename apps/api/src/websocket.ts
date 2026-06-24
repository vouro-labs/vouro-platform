import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import { WorldEvent } from '@vouro/shared';

export class WebSocketManager {
  private wss: WebSocketServer;
  private clients: Set<WebSocket> = new Set();

  constructor(server: any) {
    this.wss = new WebSocketServer({ noServer: true });

    server.server.on('upgrade', (request: IncomingMessage, socket: any, head: Buffer) => {
      const pathname = new URL(request.url || '', `http://${request.headers.host}`).pathname;

      if (pathname === '/api/ws' || pathname === '/ws') {
        this.wss.handleUpgrade(request, socket, head, (ws) => {
          this.wss.emit('connection', ws, request);
        });
      } else {
        socket.destroy();
      }
    });

    this.wss.on('connection', (ws: WebSocket) => {
      this.clients.add(ws);

      // Heartbeat setup
      let isAlive = true;
      ws.on('pong', () => { isAlive = true; });

      const interval = setInterval(() => {
        if (!isAlive) {
          clearInterval(interval);
          ws.terminate();
          return;
        }
        isAlive = false;
        ws.ping();
      }, 30000);

      ws.on('message', (message: string) => {
        try {
          const parsed = JSON.parse(message);
          if (parsed.type === 'subscribe') {
            // Handle topic subscription if needed
            ws.send(JSON.stringify({ type: 'subscribed', topic: parsed.topic }));
          }
        } catch (e) {
          // Ignore parse errors
        }
      });

      ws.on('close', () => {
        clearInterval(interval);
        this.clients.delete(ws);
      });

      // Send initial welcome status
      ws.send(JSON.stringify({
        type: 'welcome',
        data: { status: 'connected', connectedClients: this.clients.size }
      }));
    });
  }

  public broadcast(event: WorldEvent | any) {
    const payload = JSON.stringify({ type: 'world_event', data: event });
    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    }
  }

  public getConnectedCount(): number {
    return this.clients.size;
  }
}
