<!-- Experiment.svelteHTML

 TODO: ADD VIDEO + CHAT APP HERE
-->

<script>
  import { createEventDispatcher } from "svelte";
  import { db, serverTime } from "../utils.js";
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
</script>

<div class="flex flex-col items-center">
  <h1 class="mb-4 text-5xl">Video & Chat Placeholder</h1>
</div>
