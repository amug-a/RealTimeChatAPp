const express = require('express');
const path = require('path');
const http = require('http');
const socketIo = require('socket.io');
const livereload = require('livereload');
const connectLivereload = require('connect-livereload');
const formatMessage = require('./utils/messages');
const { userJoin, getCurrentUser, userLeave, getChannelUsers } = require('./utils/users');



const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Setup LiveReload
const liveReloadServer = livereload.createServer();
liveReloadServer.watch(path.join(__dirname, 'public'));

app.use(connectLivereload());

// Set static folder
app.use(express.static(path.join(__dirname, 'public')));

// Serve the Socket.IO client library from the node_modules
app.use('/socket.io', express.static(path.join(__dirname, 'node_modules/socket.io/client-dist')));

// Serve the QS library from the node_modules
app.use('/qs', express.static(path.join(__dirname, 'node_modules/qs/dist')));

const botName = 'ChatBot';

// Run when client connects
io.on('connection', socket => {

	// Runs when client join's room
	socket.on('joinRoom', ({ username, channel }) => {
		const user = userJoin(socket.id, username, channel);
		
		// creates room if it doesn't exist and join that room
		socket.join(user.channel);

		
		// Welcome current user
		socket.emit('message', formatMessage(botName, 'Welcome to ChatApp!'));

		// Broadcast when a user connects
		socket.broadcast.to(user.channel).emit('message', formatMessage(botName, `${user.username} has joined the chat`));

		// Send users and room info
		io.to(user.channel).emit('roomUsers', {
			channel: user.channel,
			users: getChannelUsers(user.channel)
		});
		

	});

	// Listen for chatMessage
	socket.on('chatMessage', msg => {
		const user = getCurrentUser(socket.id);
		
		
		io.to(user.channel).emit('message', formatMessage(user.username, msg));
	});

	// Handle user disconnection
  socket.on('disconnect', () => {

		const user = userLeave(socket.id);

		if (user) {
			io.to(user.channel).emit('message', formatMessage(botName, `${user.username} has left the chat`));

			// Send users and room info
			io.to(user.channel).emit('roomUsers', {
				channel: user.channel,
				users: getChannelUsers(user.channel)
			});
		}
		
  });

});

liveReloadServer.server.once('connection', () => {
  setTimeout(() => {
    liveReloadServer.refresh('/');
  }, 100);	
});

const PORT = 3000 || process.env.PORT;
server.listen(PORT, () => console.log(`Server started on port ${PORT}`));