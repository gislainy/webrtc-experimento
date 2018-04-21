const express = require('express');
const http = require('http');
const app = express();
let server = http.createServer(app);
app.get('/', function (req, res) {
        console.log('get /');
        res.sendFile(__dirname + '/index.html');
});
app.use('/', express.static(__dirname));
app.set('port', (process.env.PORT || 6161));
server.listen(app.get('port'), function () {
        console.log('Node app is running on port', app.get('port'));
});


const io = require('socket.io').listen(server);

io.sockets.on('connection', function (socket) {
        function log() {
                var array = [">>> Mensagem do servidor: "];
                for (var i = 0; i < arguments.length; i++) {
                        array.push(arguments[i]);
                }
                socket.emit('log', array);
        }
        socket.on('message', function (message) {
                log('Mensagem: ' + JSON.stringify(message) + ' para room: ' + message.room);

                if (message.room) {
                        socket.broadcast.in(message.room).emit('message', message);
                } else {
                        socket.broadcast.emit('message', message);
                }
        });
        socket.on('create or join', function (room) {
                var numClients = io.engine.clientsCount;
                console.log('Room ' + room + ' tem ' + numClients + ' peer(s)');
                console.log('Requisicao para create or join room ' + room);

                if (numClients === 1) {
                        log('Primeiro peer a entrar na room');
                        socket.join(room);
                        socket.emit('created', room);
                } else if (numClients === 2) {
                        log('Segundo peer a entrar na room');
                        io.sockets.in(room).emit('join', room);
                        socket.join(room);
                        socket.emit('joined', room);
                }
                else {
                        socket.emit('full', room);
                }
                socket.emit('emit(): client ' + socket.id + ' joined room ' + room);
                socket.broadcast.emit('broadcast(): client ' + socket.id + ' joined room' + room);
        });
});

