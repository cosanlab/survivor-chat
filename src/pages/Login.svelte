<!-- Login.svelte

This is the first page that a participant sees.
It asks them to select their Group and Name/NetID.render

[ ] TODO: once logged in, check if currentState in group is equal to 'experiment'
// if it is, then set userStore to 'experiment' and redirect to Experiment.svelte
// and call a function to query other group members for their video timestamp
// and sync to the fastest one
-->

<script>
  import { createEventDispatcher } from "svelte";
  import {
    getAuth,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
  } from "firebase/auth";
  import {
    userStore,
    initUser,
    userId,
    checkNetId,
    initGroup,
    metaStore,
    allNetIds,
    netId,
  } from "../utils";
  import Button from "../components/Button.svelte";

  let groupId, epNum, loginError;
  const password = "cosanlab";
  const dispatch = createEventDispatcher();

  console.log("metaStore", $metaStore);

  const login = async () => {
    console.log("Login -- login -- async -- netId", $netId);
    const auth = getAuth();
    let netIdForEmail = $netId;
    let fullId = `${groupId}_${netIdForEmail}_${epNum}`;
    let email = `${groupId}_${netIdForEmail}_${epNum}@experiment.com`;
    console.log("Login -- fullId", fullId);
    console.log("Login -- email", email);

    // The unique userId for any specific participant is a concatentation of their
    // groupId_netId_epNum
    // To make it easy to use this else where in the app we can save it as a svelte
    // store called $userId. Then we can use that in App.svelte
    $userId = fullId;
    // Also save this to the user's computer so that the app will auto-login them in
    // if they refresh the page, but don't press the logout button.
    localStorage.setItem("userId", $userId);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // Check if NetID is valid for that group
      // if it is, within checkNetId, we call initUser() and initGroup()
      await checkNetId(groupId, $netId, epNum);
    } catch (error) {
      console.log(error);
      loginError = error.message;

      // user doesn't exist in that group, throw error
      if (error.message == `netId ${netId} not a member of ${groupId}`) {
        loginError = `netId ${netId} not a member of ${groupId}`;
        console.log(error);
      } else if (error.code === "auth/user-not-found") {
        console.log("no participant found...creating new account");
        await createUserWithEmailAndPassword(auth, email, password);
        await signInWithEmailAndPassword(auth, email, password);
        // await initUser(groupId, $netId, epNum);
        // console.log("Login() -- initGroup");
        // await initGroup(combinedGroupIdEpNum, $netId, epNum);
        // dispatch("login-success");
      } else {
        console.log("other error");
        console.log("$netId", $netId);
        console.log("netId", netId);
        console.log("email", email);
        loginError = error.message;
        console.error(error);
      }
    }
  };
</script>

<div class="w-full max-w-md mb-6">
  <form
    class="px-8 pt-6 pb-8 mb-4 bg-white rounded shadow-md"
    on:submit|preventDefault={login}
  >
    <!-- Group Selection Drop-Down -->
    <div class="mb-4">
      <label for="groupId" class="mb-2 text-sm font-bold text-gray-700"
        >Group</label
      >
      <select
        id="groupId"
        name="groupId"
        bind:value={groupId}
        class="w-full px-3 py-2 leading-tight border rounded shadow focus:outline-none focus:shadow-outline"
      >
        <option value="">Select your group</option>
        <option value="BBB">BBB</option>
        <option value="DVBrainiac">DVBrainiac</option>
        <option value="DEV">DEV</option>
        <option value="EFD">EFD</option>
        <option value="Freud's Favorites">Freud's Favorites</option>
        <option value="Pavlov's Dawgs">Pavlov's Dawgs</option>
        <option value="Psychiatric Trio">Psychiatric Trio</option>
        <option value="Team Luke">Team Luke</option>
        <option value="The Psychedelics">The Psychedelics</option>
        <option value="The Unreasonable Ocho">The Unreasonable Ocho</option>
      </select>
    </div>

    <!-- NetID Selection Drop-Down -->
    <div class="mb-4">
      <label for="netId" class="mb-2 text-sm font-bold text-gray-700"
        >NetID</label
      >
      <select
        id="netId"
        name="netId"
        bind:value={$netId}
        class="w-full px-3 py-2 leading-tight border rounded shadow focus:outline-none focus:shadow-outline"
      >
        <option value="">Select your NetID</option>
        {#each allNetIds as netId}
          <!-- Extract the first three characters as the option value (e.g., "BBB", "DEV", etc.) -->
          <option value={netId}>{netId}</option>
        {/each}
      </select>
    </div>

    <!-- Episode selection drop-down -->
    <div class="mb-4">
      <label for="epNum" class="mb-2 text-sm font-bold text-gray-700"
        >Episode</label
      >
      <select
        id="epNum"
        name="epNum"
        bind:value={epNum}
        class="w-full px-3 py-2 leading-tight border rounded shadow focus:outline-none focus:shadow-outline"
      >
        <option value="">Select episode</option>
        <option value="1">1</option>
        <option value="2">2</option>
        <option value="3">3</option>
        <option value="4">4</option>
        <option value="5">5</option>
        <option value="6">6</option>
      </select>
    </div>

    <div class="text-center">
      <Button type={"submit"} color={"blue"}>Login</Button>
    </div>
  </form>
</div>

{#if loginError}
  <div class="w-full max-w-md mb-6">
    <div class="px-8 pt-6 pb-8 mb-4 bg-white rounded shadow-md">
      <p class="text-red-500">Error: {loginError}</p>
    </div>
  </div>
{/if}
