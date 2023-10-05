<!-- Experiment.svelteHTML

 TODO: ADD VIDEO + CHAT APP HERE
 [ ] TODO: client listens for updates in messages field
-->

<script>
  import { createEventDispatcher } from "svelte";
  import { fade } from "svelte/transition";
  import { fly } from "svelte/transition";
  import { db, serverTime, formatTime } from "../utils.js";
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
    console.log("onTimeUpdate", time);
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
  const handleSubmit = () => {
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

    // db.collection(`${collectionName}`)
    //   .doc(`${room}`)
    //   .collection("messages")
    //   .add(messageObj)
    //   .then(() => console.log("successful"))
    //   .catch((error) => console.error(error));

    updateScroll();
    message.message_string = "";
    modalOpen = false; // close emoji menu
  };
</script>

<!-- Chat window -->
<div class="flex flex-col items-center">
  <div class="main">
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

<!-- Video -->
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
</div>
