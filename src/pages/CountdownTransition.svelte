<script>
  import { createEventDispatcher } from "svelte";
  import Countdown from "../components/Countdown.svelte";

  const dispatch = createEventDispatcher();
</script>

<div class="container">
  <div class="inner">
    <h1>You will begin the experiment in</h1>
    <Countdown countdown={5} on:completed={() => dispatch("finished")} />
  </div>
</div>

<style>
  .container {
    display: flex;
    justify-content: center;
    align-items: center;
  }
  .inner {
    text-align: center;
  }
</style>
