<script>
  import { createEventDispatcher } from "svelte";
  import { onMount } from "svelte";
  import {
    db,
    auth,
    serverTime,
    formatTime,
    params,
    initUser,
    userStore,
    updateUser,
    expConfig,
  } from "../utils.js";
  import { io } from "socket.io-client";
  import { SOCKET_ENDPOINT } from "../const";
  import App from "../App.svelte";

  const dispatch = createEventDispatcher();

  const socket = io(SOCKET_ENDPOINT);
  socket.on("connect", () => {
    console.log(
      `You connected to the waiting room state with socket id: ${socket.id}`
    );
    // Check that socket reads connected
    console.log("WaitingRoom.svelte - socket", socket);
    $userStore.socketId = socket.id;
  });

  // user joins waiting room and tells the server they're entering waiting-room state
  const platformId = $userStore.platformId;
  let currentState = "waiting-room";
  let previousState = "botCheck";
  socket.emit("user from bot-check to waiting-room", platformId);
  socket.emit("user change state", previousState, currentState);

  // initialize
  let numUsersWaiting = 1;
  let numUsersConsented = 0;
  let audio;

  let nMatchAttempts = 0;
  if ($userStore.nMatchAttempts) {
    nMatchAttempts = $userStore.nMatchAttempts;
  }

  const playBell = () => {
    audio.play();
  };

  // client heard from server the numWaiting count increment and updates client-side count
  socket.on("user from botCheck to waiting-room", (numWaiting) => {
    console.log(
      "client - user from botCheck to waiting-room - numWaiting",
      numWaiting
    );
    numUsersWaiting = numWaiting;
  });

  socket.on("conditionAssignment", (cond) => {
    console.log("client - cond assignment", cond);
    $userStore.condition = cond;
  });

  socket.on("avatarAssignment", (avi) => {
    console.log("client - avi assignment", avi);
    $userStore.avatar = avi;
  });

  // what happens when client clicks 'proceed' button to consent
  // from consent-hallway to experiment state
  const handleProceed = () => {
    previousState = "consent-hallway";
    socket.emit("user change state", previousState, "consent-hallway-pass");
    socket.emit(
      "user from consent-hallway to consent-hallway-pass",
      platformId
    );
    $userStore.nMatchAttempts = nMatchAttempts;
  };

  socket.on(
    "user from waiting-room to consent-hallway",
    (numConsentedUsers) => {
      console.log(
        "client - user from waiting-room to consent-hallway - numConsentedUsers",
        numConsentedUsers
      );
      numUsersConsented = numConsentedUsers;

      previousState = "waiting-room";
      currentState = "consent-hallway";

      socket.emit("user change state", previousState, currentState);
    }
  );

  // move client to experiment room and assigned group chat room
  socket.on(
    "user from consent-hallway-pass to assignedRoom",
    (assignedRoom) => {
      console.log("client - escort user to experiment");
      console.log("client - assignedRoom", assignedRoom);

      // save assignedRoom
      $userStore.room = assignedRoom;
      previousState = "consent-hallway-pass";
      socket.emit("user change state", previousState, "assignedRoom");

      // end WaitingRoom phase
      dispatch("finished");
    }
  );

  // waiting room timer
  let counter = 0;
  let waitLimit = expConfig.waitLimit * 60;

  // these automatically update when `counter`
  // changes, because of the `$:` prefix
  $: timerMinutes = Math.floor(counter / 60);
  $: timerMinName = timerMinutes > 1 ? "mins" : "min";
  $: timerSeconds = Math.floor(counter - timerMinutes * 60);

  onMount(() => {
    const interval = setInterval(() => {
      counter++;
      if (counter == waitLimit && !expConfig.debugMode) {
        currentState = "wait-limit-met";
        return;
      }
    }, 1000);

    // if a function is returned from onMount,
    // it will be called when component is unmounted
    return () => {
      clearInterval(interval);
    };
  });

  // consent-hallway timer
  let elapsed = 0;
  let duration = expConfig.consentHallwayLimit * 1000;

  let last_time = window.performance.now();
  let frame;

  (function update() {
    frame = requestAnimationFrame(update);

    const time = window.performance.now();
    elapsed += Math.min(time - last_time, duration - elapsed);

    last_time = time;
  })();
</script>

<div class="container">
  <slot />
  <div class="box">
    {#if currentState === "waiting-room"}
      <h2>
        Hello <strong>{platformId}</strong>!
      </h2>
      <p>
        You will proceed to the experiment once there are {expConfig.groupSize}
        people present.
      </p>

      <p>
        There is currently a total of <strong>{numUsersWaiting}</strong>
        out of <strong>{expConfig.groupSize}</strong> required participants waiting
        for the experiment to start.
      </p>

      <p>
        You will wait for a maximum of {expConfig.waitLimit} minutes to be matched
        to a group.
      </p>

      <p>
        You have been waiting for approx.
        <span class="mins"><strong>{timerMinutes}</strong></span>{timerMinName}
        <span class="secs"><strong>{timerSeconds}</strong></span>s
      </p>
    {:else if currentState === "consent-hallway"}
      <!-- TODO: pop up notification with sound that they've been matched & have user click button to change state -->
      <h2>
        Hello <strong>{platformId}</strong>!
      </h2>
      <p>
        The desired group size of {expConfig.groupSize} people has been met! Please
        <strong>press the button below before the timer runs out</strong> to
        proceed to the experiment phase.
        <audio
          src="https://freesound.org/data/previews/536/536420_4921277-lq.mp3"
          bind:this={audio}
        />
      </p>
      <label>
        <progress value={elapsed / duration} />
      </label>

      <div>{(elapsed / 1000).toFixed(1)}s</div>
      <button on:click={handleProceed} on:mount={playBell}> PROCEED </button>
      <p>
        {numUsersConsented}
        {numUsersConsented == 1 ? "person" : "people"}
        {numUsersConsented == 1 ? "has" : "have"}
        consented to proceed to the experiment phase.
      </p>
    {:else if currentState === "wait-limit-met"}
      <p>
        We were unable to match you to a group at this time. One or more members
        of your group did not content to proceed. Please message us if you are
        interested in trying to be matched to a group again, so we can put you
        back into a waiting room. You can also try refreshing to be put into the
        waiting room again. Otherwise, please return this study.
      </p>
    {/if}
  </div>
</div>

<style>
  .container {
    margin: 0 auto !important;
    text-align: center;
    align-items: center;
    width: 50%;
  }

  .box {
    width: 600px;
    border: 2px solid #dca7e5;
    border-radius: 2px;
    box-shadow: 2px 2px 8px rgba(0, 0, 0, 0.1);
    padding: 1em;
    margin: 0 0 1em 0;
  }

  .mins {
    color: #dca7e5;
  }
  .secs {
    color: #dca7e5;
  }
</style>
