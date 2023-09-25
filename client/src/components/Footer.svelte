<!-- This is the Footer component that contains contact info as well as a firebase document reset
button when developing locally with a test-worker account. It gets rendered by App.svelte and makes
use of the DEV_MODE variable thats set when the app is compiled-->
<script>
  import { createEventDispatcher } from "svelte";
  import { userStore } from "../utils.js";

  const dispatch = createEventDispatcher();
</script>

<!-- svelte-ignore missing-declaration -->
<div
  class="has-text-white banner is-flex is-justify-content-space-around"
  class:has-background-danger={DEV_MODE}
  class:has-background-grey-light={!DEV_MODE}
>
  <!-- svelte-ignore missing-declaration -->
  {#if DEV_MODE}
    <div>
      <p>
        Development mode
        <span class="icon" on:click={() => dispatch("resetTestWorker")}>
          <i class="fas fa-redo-alt" />
        </span>
      </p>
    </div>
  {/if}
  <div>
    If you have questions about this study please message us or <a
      href="mailto:wasita.mahaphanit.gr@dartmouth.edu">email us</a
    >
  </div>
  <!-- {#if $userStore.currentState === 'experiment'}
    <div>
      <button
        class="button is-success is-small"
        on:click={() => dispatch('finished')}>I'm finished</button>
    </div>
  {/if} -->
</div>

<style>
  .banner {
    position: fixed;
    left: 0;
    bottom: 0;
    width: 100vw;
    padding: 0.5rem;
    font-weight: bold;
  }
  .icon:hover {
    cursor: pointer;
  }
  p {
    display: inline;
  }
  /* button {
    font-weight: bold;
  } */
</style>
