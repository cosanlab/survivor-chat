# survivor-chat

<p float="left">
    <img src="survivor-logo.webp" width="200" />
</p>

[![Codacy Badge](https://app.codacy.com/project/badge/Grade/6a942e3695d944198ecb1a0960333c95)](https://app.codacy.com/gh/cosanlab/survivor-chat/dashboard?utm_source=gh&utm_medium=referral&utm_content=&utm_campaign=Badge_grade)

- Server-less synchronous video-watching and chat app platform for [@ljchang](https://github.com/ljchang)'s PSYC53 class.
- Stimuli: Survivor (Season 28)

## Tech Stack

- Firebase (<https://firebase.google.com>) - for database
- Netlify (<https://www.netlify.com>) - for hosting
- Svelte (<https://svelte.dev>) - for frontend framework
- TailwindCSS (<https://tailwindcss.com>) - for styling
- Vime (<https://vimejs.com>) - for customizable video player

## Development & Deployment

1. Clone this repo onto your computer.

```bash
git clone https://github.com/cosanlab/survivor-chat.git
```

2. Install the dependencies using npm commands made accessible by Node.js.

```bash
npm install
```

3. Run the task in dev mode - this should allow you to navigate to <http://localhost:3000> in a web browser to view the app.

```bash
npm run dev
```

4. To run in production mode, you will need to build the client in production mode.

```bash
npm run build
```
