# survivor-chat

- Synchronous video-watching and chat app platform for Luke's PSYC53 class.
- Stimuli: Survivor (Season 28)

## Tech Stack

- Node.js (<https://nodejs.org/en/download>) - for running the server and client
- Express (<https://expressjs.com>) - for serving the client
- socket.io (<https://socket.io>) - for real-time communication between server and client
- Firebase (<https://firebase.google.com>) - for database
- Heroku (<https://heroku.com>) - for server hosting

## Development & Deployment

1. Clone this repo onto your computer.

```bash
git clone https://github.com/cosanlab/survivor-chat.git
```

2. Navigate to the `client` directory and then install the dependencies using npm commands made accessible by Node.js.

```bash
npm install
```

3. Build the client in dev mode.

```bash
cd client
npm install
npm run dev
```

3. Run the task in dev mode - this should allow you to navigate to <http://localhost:5000> in a web browser to view the app. You will know this worked if the socket communication operates as expected.

```bash
cd .. # to navigate back to parent directory where `server.js` lives
npm run dev
```

4. To run in production mode, you will need to rebuild the client in production mode before starting the server. I typically do this in 2 separate terminal windows.

Window 1:

```bash
cd client
npm run build
```

Window 2:

```bash
npm run start
```
