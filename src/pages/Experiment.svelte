<!-- Experiment.svelteHTML

 TODO: ADD VIDEO + CHAT APP HERE
 [ ] TODO: client listens for updates in messages field
-->

<script>
  import { createEventDispatcher } from "svelte";
  import { fade } from "svelte/transition";
  import { fly } from "svelte/transition";
  import {
    db,
    serverTime,
    formatTime,
    userStore,
    groupStore,
    updateMessages,
  } from "../utils.js";
  import {
    Player,
    Video,
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

  const dispatch = createEventDispatcher();

  // video-specific
  const hlsConfig = {
    debug: false,
    enableWorker: true,
    lowLatencyMode: true,
    backBufferLength: 90,
  };
  console.log("hlsConfig", hlsConfig);
  let player;
  let paused = false;
  let time = 0;

  const onTimeUpdate = (event) => {
    time = event.detail;
    // console.log("onTimeUpdate", time);
  };

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

  // Modal of emoji keyboard
  let modalOpen = false;

  const addEmoji = (e) => {
    message.message_string += e.target.textContent;
  };

  // TODO: read in avatar from meta doc depending on index of netid
  // Chat
  let avatarIdx = [128028, 128049, 128055, 128013]; // [ant, cat, pig, snake]
  const avatar = String.fromCodePoint(avatarIdx[0]);
  let avatarNames = ["ant", "cat", "pig", "snake"];
  let avatarEmojis = avatarIdx.map((idx) => String.fromCodePoint(idx));

  const placeholder_full = {
    author: `${avatar}`,
    absolute_timestamp: serverTime,
    message_string: "Type your message here...",
  };
  const placeholder = placeholder_full.message_string;

  const greeting = {
    author: "Server",
    absolute_timestamp: serverTime,
    message_string: `Server: You have joined the chat as ${avatar}`,
  };

  let messages = [greeting];
  console.log("greeting messages", messages);

  let message = {
    author: `${avatar}`,
    absolute_timestamp: serverTime,
    message_string: "",
  };

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
  const handleSubmit = async () => {
    // remove preceeding and trailing whitespaces
    message.message_string = message.message_string.trim();

    if (message.message_string == "") {
      return;
    }

    let messageObj = {
      author: `${avatar}`,
      relative_timestamp: formatTime(time),
      absolute_timestamp: serverTime,
      message_string: `${avatar}: ${message.message_string}`,
    };
    console.log("messageObj", messageObj);

    // update client sender UI
    messages = messages.concat(messageObj);
    console.log("updated messages list", messages);

    // tell server a message was sent to ultimately update
    // all other client's UIs in room

    // TODO: client-side firestore write with all content for this specific message
    // no need to concatenate on client-side, only do on server-side
    await updateMessages(messageObj);

    updateScroll();
    message.message_string = "";
    modalOpen = false; // close emoji menu
  };
</script>

<!-- Video & Chat Sidebar -->

<div class="flex">
  <!-- Video -->
  <div class="basis-1/2">
    <div id="video_cont">
      <Player
        autoplay
        bind:this={player}
        muted={true}
        bind:paused
        bind:currentTime={time}
        on:vmCurrentTimeChange={onTimeUpdate}
        on:vmPlaybackEnded={handleEnd}
      >
        <!-- TODO: convert .mp4 to .m3u8 files -->
        <!-- svelte-ignore a11y-media-has-caption -->
        <!-- <Hls version="latest" config={hlsConfig}>
          <source
            data-src="https://svelte-vid-sync-chat-app-public.s3.amazonaws.com/survivor/tv.11516.S28E1.1080p.H264.20200815180824.mp4"
            type="application/x-mpegURL"
          />
        </Hls> -->

        <Video>
          <!-- These are passed directly to the underlying HTML5 `<video>` element. -->
          <!-- Why `data-src`? Lazy loading, you can always use `src` if you prefer.  -->
          <source
            data-src="https://svelte-vid-sync-chat-app-public.s3.amazonaws.com/survivor/tv.11516.S28E1.1080p.H264.20200815180824.mp4"
            type="video/mp4"
          />
        </Video>

        <!-- ... -->

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
      Don't forget to click the unmute button in the top-right corner!
    </div>
  </div>

  <!-- Chat window -->
  <div class="basis-1/2">
    <!-- Chat window -->
    <div id="chatWindow">
      <ul id="messages">
        {#each messages as message}
          <!-- Styling message when sent from user -->
          {#if message.author === `${avatar}`}
            <li transition:fade>{message.message_string}</li>
            <div id="timestamp">
              {message.relative_timestamp}
            </div>
            <!-- Server message styling -->
          {:else if message.author === "Server"}
            <li class="server" transition:fade>
              {message.message_string}
            </li>
            <!-- Messages from others styling -->
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
        <div
          id="emoji-opener-icon"
          on:click={() => (modalOpen = !modalOpen)}
          on:keydown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              modalOpen = !modalOpen;
            }
          }}
          tabindex="0"
        >
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
  </div>
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
  /* 
  p {
    margin: 1em;
    color: #000;
  }

  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
    overflow: hidden;
  } */

  /* div {
    position: relative;
  } */
  span {
    padding: 0.2em 0.5em;
    color: white;
    text-shadow: 0 0 8px black;
    font-size: 1.3em;
    opacity: 0.7;
  }

  /* .main {
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
  } */

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

  /* @media screen and (device-aspect-ratio: 375/667) {
    form input {
      font-size: 16px;
    }
  } */

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

  /* @media (min-height: 500px) {
    #chatWindow {
      height: 500px;
    }
  } */

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

  /* VIDEO */

  /* #video_cont {
    width: 50%;
    max-width: 600px;
  } */

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
