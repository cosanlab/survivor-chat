<!-- Experiment.svelteHTML

 TODO: ADD VIDEO + CHAT APP HERE
-->

<script>
  import { createEventDispatcher } from "svelte";
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
</script>

<div class="flex flex-col items-center">
  <h1 class="mb-4 text-5xl">Video & Chat Placeholder</h1>
</div>
