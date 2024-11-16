const WebSocket = require('ws');
const http = require('http');
const express = require('express');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Serve static files
app.use(express.static('./'));

// Store connected clients and their colors
const clients = new Map();
const colors = ['#ff3333', '#33ff33', '#3333ff', '#ffff33', '#ff33ff', '#33ffff'];
let colorIndex = 0;

wss.on('connection', (ws) => {
    // Assign color to new client
    const clientColor = colors[colorIndex % colors.length];
    colorIndex++;
    
    // Store client info
    clients.set(ws, {
        color: clientColor,
        id: Date.now().toString()
    });

    // Send client their assigned color and ID
    ws.send(JSON.stringify({
        type: 'init',
        color: clientColor,
        id: clients.get(ws).id
    }));

    // Broadcast to all other clients that a new user joined
    wss.clients.forEach(client => {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
                type: 'newUser',
                color: clientColor,
                id: clients.get(ws).id
            }));
        }
    });

    ws.on('message', (message) => {
        const data = JSON.parse(message);
        // Add client color and ID to the message
        data.color = clients.get(ws).color;
        data.id = clients.get(ws).id;
        
        // Broadcast cursor updates to all other clients
        wss.clients.forEach(client => {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(data));
            }
        });
    });

    ws.on('close', () => {
        const clientInfo = clients.get(ws);
        // Notify other clients that a user left
        wss.clients.forEach(client => {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({
                    type: 'userLeft',
                    id: clientInfo.id
                }));
            }
        });
        clients.delete(ws);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
