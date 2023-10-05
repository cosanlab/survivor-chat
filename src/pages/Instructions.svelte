<script>
  import { onMount, createEventDispatcher } from "svelte";
  import {
    userId,
    userStore,
    groupStore,
    reqGroupDocChange,
  } from "../utils.js";
  import Loading from "../components/Loading.svelte";

  // Add userId to group counter doc on mount
  onMount(async () => {
    console.log("Lobby -- onMount -- groupDocName", $userStore["groupDocName"]);
    await reqGroupDocChange($userStore["netId"], $userStore["groupDocName"]);
    console.log("Lobby -- groupStore", $groupStore["groupId"]);
  });
</script>

<!-- TODO: tell them how many others we are waiting for -->
<!-- UI -->
<Loading
  text={"Please stay on this screen... waiting for your group members to login..."}
/>
