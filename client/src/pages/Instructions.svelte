<!-- this page checks to see if Mturk user is human -->
<script>
  import { expConfig } from "../utils.js";
  import { createEventDispatcher } from "svelte";

  const dispatch = createEventDispatcher();
  let currentState = "instructions";

  // checks answer against ground truth
  function handleSubmit() {
    // success!
    dispatch("finished");
  }
</script>

<div class="container">
  <h1>Study Instructions</h1>
  {#if currentState === "instructions"}
    <div class="bot-box">
      <p>
        In this study, you will be watching a video with 3 other group members.<br
        />
        While watching the video, you will have the ability to communicate with your
        group members via text-based chat.<br />
        You will first be put into a waiting room where you will then be matched
        with other participants before starting the experiment. You will be waiting
        to be matched for a maximum of {expConfig.waitLimit} minutes.
      </p>
      <button class="button" on:click={handleSubmit}
        >Proceed to the Waiting Room</button
      >
    </div>
  {/if}
</div>

<style>
  .container {
    margin: 0 auto !important;
    text-align: center;
    align-items: center;
    width: 50%;
  }

  .bot-box {
    padding: 2%;
    background-color: rgba(255, 255, 255, 0.4);
    border: 2px solid grey;
    border-radius: 2px;
    box-shadow: 2px 2px 8px rgba(0, 0, 0, 0.1);
  }

  .button {
    background-color: lightblue;
  }
</style>
