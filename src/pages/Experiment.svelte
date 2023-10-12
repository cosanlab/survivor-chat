<!-- Experiment.svelte

  Synced video and chat experiment
  
-->

<script>
  import { createEventDispatcher, onMount } from "svelte";
  import { fade } from "svelte/transition";
  import { fly } from "svelte/transition";
  import {
    serverTime,
    formatTime,
    userStore,
    groupStore,
    groupMessagesStore,
    addMessage,
    setUserToLogTimestamp,
    updateUserTimestamp,
    queryGroupTimestamps,
    addClientToGroup,
    getUserNameInMeta,
  } from "../utils.js";
  import {
    Player,
    Hls,
    DefaultUi,
    Scrim,
    Controls,
    ControlSpacer,
    MuteControl,
    TimeProgress,
  } from "@vime/svelte";
  import Button from "../components/Button.svelte";

  const dispatch = createEventDispatcher();

  // video-specific
  const hlsConfig = {
    debug: false,
    enableWorker: true,
    lowLatencyMode: true,
    backBufferLength: 90,
  };

  let messages = [];
  let player;
  let paused = false;
  let time = 0;

  // Reads out video player timestamp as it updates
  const onTimeUpdate = async (event) => {
    time = event.detail;
  };

  // emoji menu
  let emojiSets = [
    { type: "faces", minVal: 128512, maxVal: 128580 },
    { type: "faces2", minVal: 129296, maxVal: 129327 },
  ];

  let selectedSet = 0;
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

  // Chat
  // Grab user's first name from survivor-meta doc
  // given their netId and groupId
  const getUserName = async () => {
    let netId = $userStore["netId"];
    let groupId = $userStore["groupId"];
    let userId = $userStore["userId"];
    await getUserNameInMeta(groupId, netId, userId);
  };

  const placeholder_full = {
    author: $userStore["username"],
    absolute_timestamp: serverTime,
    message_string: "Type your message here...",
  };
  const placeholder = placeholder_full.message_string;

  let message = {
    author: $userStore["username"],
    absolute_timestamp: serverTime,
    message_string: "",
    netId: $userStore["netId"],
  };

  // VIDEO PLAYER CONTROLS
  // this needs to be included in player
  // when video ends, experiment state ends
  const handleEnd = () => {
    console.log("VIDEO ENDED");
    dispatch("finished");
  };

  $: {
    if ($userStore["logVideoTimestamp"] == true) {
      console.log("Experiment -- logVideoTimestamp is true");
      makeUserUpdateTimestamp();
      getHighestTimestamp();

      // set back to false
      makeUserLogTimestamp(false);
    }

    if ($groupMessagesStore) {
      messages = $groupMessagesStore;

      updateScroll();
      console.log("Experiment -- messages", messages);
    }
  }

  // SYNC BUTTON CONTROLS
  // once user clicks sync button,
  // we call a function to have each user in group logs their timestamp into the store
  // each user should be listening for when this function is called to then call a function
  // to log their timestamp into the store
  const syncButtonPressed = async () => {
    // Set each user in group's log timestamp to true
    await setUserToLogTimestamp($groupStore["users"], true);
  };

  // call user to update timestamp
  const makeUserUpdateTimestamp = async () => {
    console.log("Making user log timestamp:", time);
    await updateUserTimestamp($userStore["userId"], time);
  };

  const makeUserLogTimestamp = async (logTimestampFlag) => {
    await setUserToLogTimestamp($groupStore["users"], logTimestampFlag);
  };

  const addClientToGroupUsers = async () => {
    let groupDocName = $groupStore["groupId"];
    let userId = $userStore["userId"];
    await addClientToGroup(groupDocName, userId);
  };

  // Goes through each group member's user doc and returns the highest timestamp
  // then sets that to the user's video time
  // then sets the user's logVideoTimestamp to false
  const getHighestTimestamp = async () => {
    let groupMembers = $groupStore["users"];
    let groupId = $userStore["groupId"];
    let highestTimestamp;
    try {
      highestTimestamp = await queryGroupTimestamps(groupId, groupMembers);
    } catch {
      console.log("Experiment -- error in getHighestTimestamp");
    }
    console.log("Experiment -- highestTimestamp", highestTimestamp);
    if (isNaN(highestTimestamp) || !highestTimestamp) {
      return;
    } else {
      time = highestTimestamp;
    }
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
      author: $userStore["username"],
      netId: $userStore["netId"],
      relative_timestamp: formatTime(time),
      message_string: `${$userStore["username"]}: ${message.message_string}`,
    };
    console.log("messageObj", messageObj);

    // add message to the group document
    await addMessage($groupStore["groupId"], messageObj);

    updateScroll();
    message.message_string = "";
    modalOpen = false; // close emoji menu
  };

  onMount(() => {
    getUserName();
    // Add 4th user's userId to the users field in group doc
    // so that they can call group sync function
    if (!$groupStore["users"].includes($userStore["userId"])) {
      addClientToGroupUsers();
    }
    syncButtonPressed();
  });
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
        <!-- TODO: add the rest of the .m3u8 files -->
        <!-- svelte-ignore a11y-media-has-caption -->
        {#if $userStore["epNum"] == "1"}
          <Hls version="latest" config={hlsConfig} crossOrigin="anonymous">
            <source
              data-src="https://svelte-vid-sync-chat-app-public.s3.amazonaws.com/survivor/hls/Survivor_S28E01_Hot_Girl_with_a_Grudge_1080p.m3u8"
              type="application/x-mpegURL"
            />
          </Hls>
        {:else if $userStore["epNum"] == "2"}
          <Hls version="latest" config={hlsConfig}>
            <source
              data-src="https://svelte-vid-sync-chat-app-public.s3.amazonaws.com/survivor/hls/Survivor_S28E02_Cops_R_Us_720p.m3u8"
              type="application/x-mpegURL"
            />
          </Hls>
        {/if}

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
      <br />
      <p>Click the unmute button in the top-right corner of the video!</p>
      <br />
      <p>
        If you feel out-of-sync with the group, click the sync button below:<br
        /><br />
        <Button on:click={syncButtonPressed} color={"blue"}
          >Sync to group</Button
        >
      </p>
    </div>
  </div>

  <!-- Chat window -->
  <div class="basis-1/2">
    <!-- Chat window -->
    <div id="chatWindow">
      <ul id="messages">
        {#if Object.keys(messages).length > 0}
          {#each messages as message}
            <!-- Styling message when sent from user -->
            {#if message.author === $userStore["username"]}
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
        {/if}
      </ul>
    </div>
    <form action="">
      <div id="btn-emoji-icon-cont">
        <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
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
              <!-- svelte-ignore a11y-click-events-have-key-events -->
              <div data-id={i} on:click={chooseEmojiSet}>
                {String.fromCodePoint(icon)}
              </div>
            {/each}
            <!-- svelte-ignore a11y-click-events-have-key-events -->
            <div id="closer-icon" on:click={() => (modalOpen = false)}>X</div>
          </header>

          {#each emojis as emoji}
            <!-- svelte-ignore a11y-click-events-have-key-events -->
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

  span {
    padding: 0.2em 0.5em;
    color: white;
    text-shadow: 0 0 8px black;
    font-size: 1.3em;
    opacity: 0.7;
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
