<script>
  import { createEventDispatcher } from "svelte";
  import Loading from "../components/Loading.svelte";
  import Button from "../components/Button.svelte";

  let submitted = false;
  const dispatch = createEventDispatcher();

  async function goto_experiment() {
    submitted = true;
    dispatch("to-experiment");
  }
</script>

{#if submitted}
  <Loading
    text={"Please stay on this screen... waiting for your group members to login..."}
  />
{:else}
  <div class="flex flex-col items-center">
    <h1 class="mb-4 text-5xl">Instructions</h1>
    <p class="w-1/2 mb-4 text-center">
      In this experiment, you will be watching an episode of Survivor (Season
      28) with your group members. <br />
      Click the 'next' button to continue.<br />
    </p>
    <Button on:click={goto_experiment}>Next</Button>
  </div>
{/if}
