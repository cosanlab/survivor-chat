<!-- This is the main experiment page. It takes as input trialOrder, which gets passed in from
App.svelte, which gets it from firebase. Then it looks at the current trial number the participant
is on, gets the audio file URL and passes that info as parameters to the ThoughtTagger component. It
also makes use of the Loading component-->
<script>
  // IMPORTS
  // -------------------------------------------
  import { createEventDispatcher } from "svelte";
  import {
    db,
    storage,
    append,
    userStore,
    expConfig,
    updateUser,
    serverTime,
    formatTime,
    params,
  } from "../utils.js";
  import { fade } from "svelte/transition";
  import { fly } from "svelte/transition";
  import { io } from "socket.io-client";
  import { SOCKET_ENDPOINT } from "../const";
  import {
    Player,
    Hls,
    DefaultUi,
    Scrim,
    VolumeControl,
    DefaultControls,
    Controls,
    ControlSpacer,
    MuteControl,
    PlaybackControl,
    TimeProgress,
  } from "@vime/svelte";

  // COMPONENT VARIABLES
  // -------------------------------------------

  let collectionName = DEV_MODE ? "survivor-dev-rooms" : "survivor-prod-rooms";
  let numUsersConnected = 0;

  // video-specific
  const hlsConfig = {
    debug: false,
    enableWorker: true,
    lowLatencyMode: true,
    backBufferLength: 90,
  };
  console.log("hlsConfig", hlsConfig);

  // video URLs that are hosted on AWS S3
  let debugVidURL =
    "https://svelte-vid-sync-chat-app-public.s3.amazonaws.com/misc/Stream1.m3u8";
  let expVidURL =
    "https://svelte-vid-sync-chat-app-public.s3.amazonaws.com/survivor/tv.11516.S28E1.1080p.H264.20200815180824.mp4";
  // let videoURL = expConfig.debugMode ? debugVidURL : expVidURL;

  let player;
  let paused = DEV_MODE ? true : false;
  let time = 0;

  const onTimeUpdate = (event) => {
    time = event.detail;
    // console.log("onTimeUpdate", time);
  };

  // video controls
  // can determine whether user can control video or not
  // or whether they have shared playback controls
  // with other users in same room
  let showControls = expConfig.debugMode;
  let sharedPlayback = false;
  let showControlsTimeout;

  // emoji menu
  let emojiSets = [
    { type: "faces", minVal: 128512, maxVal: 128580 },
    { type: "faces2", minVal: 129296, maxVal: 129327 },
  ];

  let selectedSet = 0;
  // $: console.log(selectedSet)
  $: min = emojiSets[selectedSet].minVal;
  $: max = emojiSets[selectedSet].maxVal;

  // storage of emojis to make emoji keyboard
  let emojis = [];

  $: for (let i = min; i <= max; i++) {
    emojis = [...emojis, String.fromCodePoint(i)];
  }

  const clearEmojiMenu = () => (emojis = []);

  const chooseEmojiSet = (e) => {
    selectedSet = Number(e.target.dataset.id);
    clearEmojiMenu();
  };

  // Emoji icons to open modal of emojis
  // i.e., header on emoji keyboard to select different emoji sets
  let setIcons = [128512, 129313];

  // to convert from code to emoji itself:
  // let emojiIcon = String.fromCodePoint(128578);

  // Modal of emoji keyboard
  let modalOpen = false;

  const addEmoji = (e) => {
    message.message_string += e.target.textContent;
  };

  // socket instance
  console.log("params", params);
  console.log(`SOCKET_ENDPOINT ${SOCKET_ENDPOINT}`);
  const socket = io(SOCKET_ENDPOINT);

  socket.on("connect", () => {
    console.log(`You connected to experiment state with id: ${socket.id}`);
    // Check that socket reads connected
    console.log("Experiment.svelte - socket", socket);
    $userStore.socketId = socket.id;
  });

  // Join chatroom -- pass avatar and room name to server
  // const room = params.room;
  const room = $userStore.room;
  console.log("client -- room", room);

  const avatar = String.fromCodePoint($userStore.avatar);
  console.log("client -- avatar", avatar);

  socket.emit("joinRoom", { avatar, room });

  let avatarIdx = [128028, 128049, 128055, 128013]; // [ant, cat, pig, snake]
  let avatarNames = ["ant", "cat", "pig", "snake"];
  let avatarEmojis = avatarIdx.map((idx) => String.fromCodePoint(idx));

  // Get room and users
  socket.on("roomUsers", (numUsers) => {
    console.log("client - socket on roomUsers numUsers", numUsers);
    numUsersConnected = numUsers;

    if (numUsersConnected == expConfig.groupSize) {
      paused = false;
    }
  });

  const dispatch = createEventDispatcher();

  // chat-specific
  const placeholder_full = {
    author: `${avatar}`,
    absolute_timestamp: serverTime,
    message_string: "Type your message here...",
  };
  const placeholder = placeholder_full.message_string;

  // only displays for client
  const greeting = {
    author: "Server",
    absolute_timestamp: serverTime,
    message_string: `Server: You have joined the chat as ${avatar}`,
  };

  const allAvatarsJoin = {
    author: "Server",
    absolute_timestamp: serverTime,
    message_string: `Server: ${avatarEmojis} have joined the chat.`,
  };

  const atNorm = {
    author: "Server",
    absolute_timestamp: serverTime,
    message_string: `Server: Type @${avatarNames[0]} to @${avatarEmojis[0]},
      @${avatarNames[1]} to @${avatarEmojis[1]},
      @${avatarNames[2]} to @${avatarEmojis[2]},
      @${avatarNames[3]} to @${avatarEmojis[3]}`,
  };

  let messages = [greeting, allAvatarsJoin, atNorm];
  console.log("greeting messages", messages);

  let message = {
    author: `${avatar}`,
    absolute_timestamp: serverTime,
    message_string: "",
  };

  // COMPONENT LOGIC
  // -------------------------------------------

  // client listening for message from server
  socket.on("message", (messageObj) => {
    console.log("client - socket on message", messageObj);
    messages = messages.concat(messageObj);
    updateScroll();
  });

  // receive from server that user has joined
  // receive new numUsers count from server
  // and increments numUsers display
  socket.on("user joined", (message, numUsers) => {
    console.log("client - user joined numUsers", numUsers);

    if (!!message.message_string) {
      messages = messages.concat(message);
    }

    numUsersConnected = numUsers;
    updateScroll();
  });

  // receives from server that user has left
  // decrements & updates display on numUsers connected
  socket.on("user left", (messageObj, numUsers) => {
    console.log("client - on user left numUsers", numUsers);
    messages = messages.concat(messageObj);
    numUsersConnected = numUsers;
    updateScroll();
  });

  // if shared playback enabled
  if (sharedPlayback) {
    // client listen for user paused event from server
    socket.on("user paused", (room, pauseTime) => {
      paused = true;
      time = pauseTime;
    });

    // client listen for user played event from server
    socket.on("user played", (room, playTime) => {
      paused = false;
      time = playTime;
    });
    // client listen for user played event from server
    socket.on("user sought", (room, seekTime) => {
      time = seekTime;
    });
  }

  // VIDEO PLAYER CONTROLS
  // this needs to be included in player
  // when video ends, experiment state ends
  const handleEnd = () => {
    console.log("VIDEO ENDED");
    dispatch("finished");
  };

  // CHAT WINDOW CONTROLS
  // upon new message, autoscroll to bottom of chat window
  const updateScroll = () => {
    const chatWindow = document.getElementById("chatWindow");
    setTimeout(() => {
      chatWindow.scrollTop = chatWindow.scrollHeight;
    }, 0);
  };

  // upon message submit, update chat log in window
  // also handle user name change
  const handleSubmit = () => {
    // remove preceeding and trailing whitespaces
    message.message_string = message.message_string.trim();

    // handle @ usage with emoji translation
    message.message_string = message.message_string.replace(
      "@ant",
      "@" + avatarEmojis[0]
    );
    message.message_string = message.message_string.replace(
      "@cat",
      "@" + avatarEmojis[1]
    );
    message.message_string = message.message_string.replace(
      "@pig",
      "@" + avatarEmojis[2]
    );
    message.message_string = message.message_string.replace(
      "@snake",
      "@" + avatarEmojis[3]
    );

    if (message.message_string == "") {
      return;
    }

    console.log("client --> player", player);

    let messageObj = {
      author: `${avatar}`,
      relative_timestamp: formatTime(time),
      absolute_timestamp: serverTime,
      message_string: `${avatar}: ${message.message_string}`,
    };

    // update client sender UI
    messages = messages.concat(messageObj);
    console.log("updated messages list", messages);

    // tell server a message was sent to ultimately update
    // all other client's UIs in room
    socket.emit("message", room, messageObj);

    // TODO: client-side firestore write with all content for this specific message
    // no need to concatenate on client-side, only do on server-side

    db.collection(`${collectionName}`)
      .doc(`${room}`)
      .collection("messages")
      .add(messageObj)
      .then(() => console.log("successful"))
      .catch((error) => console.error(error));

    updateScroll();
    message.message_string = "";
    modalOpen = false; // close emoji menu
  };
</script>

<div class="main">
  <div id="chatWindow">
    <ul id="messages">
      {#each messages as message}
        {#if message.author === `${avatar}`}
          <li transition:fade>{message.message_string}</li>
          <div id="timestamp">
            {message.relative_timestamp}
          </div>
        {:else if message.author === "Server"}
          <li class="server" transition:fade>
            {message.message_string}
          </li>
        {:else}
          <li class="other" transition:fade>
            {message.message_string}
          </li>
          <div id="timestamp-other">
            {message.relative_timestamp}
          </div>
        {/if}
      {/each}
    </ul>
  </div>
  <form action="">
    <div id="btn-emoji-icon-cont">
      <div id="emoji-opener-icon" on:click={() => (modalOpen = !modalOpen)}>
        <!-- {emojiIcon} -->
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="feather feather-smile"
          ><circle cx="12" cy="12" r="10" /><path
            d="M8 14s1.5 2 4 2 4-2 4-2"
          /><line x1="9" y1="9" x2="9.01" y2="9" /><line
            x1="15"
            y1="9"
            x2="15.01"
            y2="9"
          /></svg
        >
      </div>
    </div>
    {#if modalOpen}
      <div id="emoji-cont" transition:fly={{ y: -30 }}>
        <header>
          {#each setIcons as icon, i}
            <div data-id={i} on:click={chooseEmojiSet}>
              {String.fromCodePoint(icon)}
            </div>
          {/each}
          <div id="closer-icon" on:click={() => (modalOpen = false)}>X</div>
        </header>

        {#each emojis as emoji}
          <span on:click={addEmoji}>{emoji}</span>
        {/each}
      </div>
    {/if}
    <input
      id="m"
      autocomplete="off"
      {placeholder}
      bind:value={message.message_string}
    />
    <button on:click|preventDefault={handleSubmit}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        class="feather feather-send"
        ><line x1="22" y1="2" x2="11" y2="13" /><polygon
          points="22 2 15 22 11 13 2 9 22 2"
        /></svg
      >
    </button>
  </form>
  <p id="numUsers">
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      class="feather feather-user"
      ><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle
        cx="12"
        cy="7"
        r="4"
      /></svg
    >
    {numUsersConnected}
    {numUsersConnected == 1 ? "user" : "users"} here
  </p>
</div>

<div id="video_cont">
  <!-- if cannot control vid, split based off of dyad assignment -->

  {#if expConfig.debugMode}
    {#if showControls}
      <Player
        autoplay
        bind:this={player}
        muted={true}
        bind:paused
        bind:currentTime={time}
        on:vmCurrentTimeChange={onTimeUpdate}
        on:vmPlaybackEnded={handleEnd}
      >
        <!-- svelte-ignore a11y-media-has-caption -->
        <Hls version="latest" config={hlsConfig}>
          <source data-src={debugVidURL} type="application/x-mpegURL" />
        </Hls>

        <DefaultUi noControls noClickToPlay noDblClickFullscreen>
          <Scrim />
          <Controls fullWidth pin="topLeft">
            <ControlSpacer />
            <MuteControl />
          </Controls>
          <ControlSpacer />
          <Controls fullWidth pin="bottomRight">
            <ControlSpacer />
            <TimeProgress />
          </Controls>
        </DefaultUi>
      </Player>
    {:else}
      <Player
        autoplay
        bind:this={player}
        muted={true}
        bind:paused
        bind:currentTime={time}
        on:vmCurrentTimeChange={onTimeUpdate}
        on:vmPlaybackEnded={handleEnd}
      >
        <!-- svelte-ignore a11y-media-has-caption -->
        <Hls version="latest" config={hlsConfig}>
          <source data-src={debugVidURL} type="application/x-mpegURL" />
        </Hls>

        <DefaultUi noControls noClickToPlay noDblClickFullscreen>
          <Scrim />
          <Controls fullWidth pin="topLeft">
            <ControlSpacer />
            <MuteControl />
          </Controls>
          <ControlSpacer />
          <Controls fullWidth pin="bottomRight">
            <ControlSpacer />
            <TimeProgress />
          </Controls>
        </DefaultUi>
      </Player>
    {/if}
  {:else}
    <Player
      autoplay
      playsinline
      bind:this={player}
      muted={true}
      bind:paused
      bind:currentTime={time}
      on:vmCurrentTimeChange={onTimeUpdate}
      on:vmPlaybackEnded={handleEnd}
    >
      <!-- svelte-ignore a11y-media-has-caption -->
      <Hls version="latest" config={hlsConfig}>
        <source data-src={expVidURL} type="application/x-mpegURL" />
      </Hls>

      <DefaultUi noControls noClickToPlay noDblClickFullscreen>
        <Scrim />
        <Controls fullWidth pin="topLeft">
          <ControlSpacer />
          <MuteControl />
        </Controls>
        <ControlSpacer />
        <Controls fullWidth pin="bottomRight">
          <ControlSpacer />
          <TimeProgress />
        </Controls>
      </DefaultUi>
    </Player>
  {/if}
  Don't forget to click the unmute button in the top-right corner!
</div>

<style>
  :global(vm-playback-control) {
    --vm-control-scale: 2;
  }

  :root {
    --chat-win-color: #000;
    --author-bg-color: #2294fb;
    --author-fg-color: #fff;
    --unicorn-bg-color: #981ceb;
    --fish-bg-color: #1b95e0;
    --cat-bg-color: #fab81e;
    --snake-bg-color: #19cf86;
    --other-bg-color: #b4b4bc;
    --other-fg-color: #000;
    /* purple 5d01f1 */
    --server-fg-color: #747474;
    --server-bg-color: #fff;
    --form-btn-color: #f20089;
  }

  p {
    margin: 1em;
    color: #000;
  }

  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
    overflow: hidden;
  }

  div {
    position: relative;
  }
  span {
    padding: 0.2em 0.5em;
    color: white;
    text-shadow: 0 0 8px black;
    font-size: 1.3em;
    opacity: 0.7;
  }

  .main {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    height: 95vh;
    width: 500px;
    max-width: 600px;
    right: 2em;
    position: fixed;
    overflow: auto;
  }

  form {
    background: #000000;
    padding: 3px;
    width: 100%;
    display: flex;
    border: 10px solid var(--chat-win-color);
    border-radius: 0em 0em 1em 1em;
  }

  form input {
    border: 0;
    padding: 10px;
    width: 90%;
    margin-right: 0.5%;
    color: #000;
    font-size: 12pt;
  }

  @media screen and (device-aspect-ratio: 375/667) {
    form input {
      font-size: 16px;
    }
  }

  form button {
    background: #000;
    border: 3px;
    padding: 10px 10px 15px 10px;
    color: #fff;
    text-align: center;
  }

  form button:active {
    background: #000;
    border: 3px;
    padding: 10px 10px 15px 10px;
    color: #fff;
    text-align: center;
    transform: rotate(5deg);
  }

  #chatWindow {
    margin-top: 2em;
    height: 500px;
    width: 100%;
    border: 10px solid var(--chat-win-color);
    overflow: auto;
    border-radius: 1em 1em 0em 0em;
  }

  @media (min-height: 500px) {
    #chatWindow {
      height: 500px;
    }
  }

  #messages {
    align-self: center;
    list-style-type: none;
    margin: 0;
    padding: 0;
    font-size: 12pt;
  }

  #messages li {
    /* determines height */
    padding: 5px 10px;
    border-radius: 1em;
    margin: 0.75em 7em;
    width: 75%;
    background: var(--author-bg-color);
    color: var(--author-fg-color);
    overflow-wrap: break-word;
    /* to get tapering like in iMessage */
    border-radius: 1em 1em 0 1em;
  }

  #timestamp {
    text-align: right;
    font-size: 0.75rem;
    line-height: 0.75rem;
    margin: 1em 18em;
    padding: 0;
  }

  #messages li.server {
    padding: 5px 10px;
    border-radius: 1em;
    margin: 0.5em auto;
    width: 95%;
    background: var(--server-bg-color);
    color: var(--server-fg-color);
    overflow-wrap: break-word;
    /* to get tapering like in iMessage */
    border-radius: 0 0 0 0;
  }

  #messages li.other {
    padding: 5px 10px;
    border-radius: 1em;
    margin: 0.75em 0.75em;
    width: 75%;
    background: var(--other-bg-color);
    color: var(--other-fg-color);
    overflow-wrap: break-word;
    /* to get tapering like in iMessage */
    border-radius: 1em 1em 1em 0;
  }

  #timestamp-other {
    text-align: left;
    font-size: 0.75rem;
    line-height: 0.75rem;
    margin: 1em 1em;
    padding: 0;
  }

  ::placeholder {
    color: #000;
  }

  #numUsers {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    height: 10vh;
    width: 500px;
    max-width: 600px;
    position: relative;
    overflow: auto;
    color: #000;
    padding: 1em;
    font-size: 12pt;
  }

  /* VIDEO */

  #video_cont {
    width: 50%;
    max-width: 600px;
  }

  :global(vm-playback-control) {
    --vm-control-scale: 1.7;
  }

  /* EMOJI PANEL */

  #btn-emoji-icon-cont {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  #emoji-opener-icon {
    padding: 0.1em 0.4em 0em 0.1em;
    font-size: 2rem;
    cursor: pointer;
    transition: all 0.1s;
    color: #fff;
  }

  #emoji-opener-icon:active {
    padding: 0.1em 0.4em 0em 0.1em;
    font-size: 2rem;
    transform: rotate(20deg);
    cursor: pointer;
    color: #fff;
  }

  /* emoji selection popup container */
  #emoji-cont {
    max-width: 100px;
    max-height: 100px;
    overflow: scroll;
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-start;
    margin-left: 0px;
    /* 		border: 1px solid gray;
		background: #ddd; */
  }

  #emoji-cont header {
    width: 90%;
    display: flex;
    align-items: center;
    justify-content: space-around;
    border: 1px solid gray;
  }

  #emoji-cont header div {
    cursor: pointer;
  }

  #closer-icon {
    font-size: 1.5rem;
    font-weight: bold;
    text-align: right;
  }
</style>
