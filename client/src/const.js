// adjust socket depending whether we're in production or not
export const SOCKET_ENDPOINT = DEV_MODE
  ? 'http://localhost:5000/' : 'https://svelte-vid-sync-chat-app.herokuapp.com/';

console.log(SOCKET_ENDPOINT);

