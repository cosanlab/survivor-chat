<!-- RequestFullScreen.svelte

  Due to browser security, we can only request fullscreen in response to a user action (e.g., a click).

  - [x] Add message asking user to enter fullscreen mode in order to participate in the study and stay in full-screen
  - [x] Add button for user to click to enter fullscreen mode
  - [x] Once user clicks button, call function to request full screen mode and then call function to dispatch event 'to-bot-check'
  - [x] Don't need to actually call the function if globalVars.DEBUG_MODE is true

-->

<script>
  import { createEventDispatcher } from "svelte";
  import { userId, globalVars } from "../utils.js";
  import Button from "../components/Button.svelte";
  const dispatch = createEventDispatcher();

  const userRequestFullscreen = async () => {
    if (!globalVars.DEBUG_MODE) {
      await document.documentElement.requestFullscreen();
    }
    dispatch("finished");
  };
</script>

<div class="flex flex-col items-center justify-center h-screen">
  <h1 class="mb-4 text-3xl">Please enter fullscreen mode!</h1>
  <h2>Hi <b>{$userId}</b>!</h2>
  <br />
  <p class="w-3/4 mb-2 text-center">
    We kindly request you to click the button below to enter fullscreen mode in
    order to participate in this study. Please remain in fullscreen mode
    throughout the entire duration of the study.
    <br /><br />
    If the button doesn't work, you can achieve fullscreen by resizing your window
    manually.
    <br />
    Thank you for your cooperation.
  </p>
  <br />
  <Button on:click={userRequestFullscreen}>Enter Fullscreen Mode</Button>
  <br />
</div>
