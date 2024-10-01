<!-- Login.svelte

This is the first page that a participant sees.
It asks them to select their Group and Name/NetID.render

[ ] TODO: once logged in, check if currentState in group is equal to 'experiment'
// if it is, then call a function to query other group members for their video timestamp
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
    userId,
    checkNetId,
    groupsNetIDMap,
    netId,
    userStore,
  } from "../utils";
  import Button from "../components/Button.svelte";
  import LogRocket from "logrocket";
  LogRocket.init("cosan/survivor-2f6vd");
  LogRocket.identify("THE_USER_ID_IN_YOUR_APP", {
    name: $userStore["userId"],
  });

  console.log("groupsNetIDMap", groupsNetIDMap);

  let epNum, loginError;
  let groupId = "";

  // Reactive statement to update the available NetIDs based on selected Group
  $: availableNetIds = groupId ? groupsNetIDMap[groupId] : [];

  const password = "cosanlab";
  const dispatch = createEventDispatcher();

  const login = async () => {
    console.log("Login -- login -- netId", $netId);
    const auth = getAuth();
    let netIdForEmail = $netId;
    // // if groupId has a space, replace it with an underscore
    // groupId = groupId.replace(" ", "_");
    let fullId = `${groupId}_${epNum}_${netIdForEmail}`;
    let email = `${groupId}_${epNum}_${netIdForEmail}@experiment.com`;

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
        await checkNetId(groupId, $netId, epNum);
      } else {
        console.log("other error");
        console.log("$netId", $netId);
        console.log("netId", netId);
        console.log("email", email);
        loginError = error.message;
        console.error(error);
      }
    }
    dispatch("finished");
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
        <option value="DEV">DEV</option>
        <option value="Minions">The Minions</option>
        <option value="Teletubbies">Teletubbies</option>
        <option value="PickleBalls">Pickle Balls</option>
        <option value="QuadSquad">Quad Squad</option>
        <option value="AutomaticJellybeans">Automatic Jellybeans</option>
        <option value="InsideOut">Inside Out</option>
        <option value="HowIOutwitted">How I Outwitted Your Tribe</option>
        <option value="HappyZappy">Happy Zappy Neurons</option>
        <option value="Finishers">The Finishers</option>
        <option value="SADM">Social Affective Decision Makers</option>
      </select>
    </div>

    <!-- NetID Selection Drop-Down -->
    <div class="mb-4">
      <label for="netId" class="mb-2 text-sm font-bold text-gray-700">
        NetID
      </label>
      <select
        id="netId"
        name="netId"
        bind:value={$netId}
        class="w-full px-3 py-2 leading-tight border rounded shadow focus:outline-none focus:shadow-outline"
        disabled={!groupId}
      >
        <option value="">Select your NetID</option>
        {#if groupId}
          {#each availableNetIds as id}
            <option value={id}>{id}</option>
          {/each}
        {/if}
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
        <option value="7">7</option>
        <option value="8">8</option>
        <option value="9">9</option>
        <option value="10">10</option>
        <option value="11">11</option>
        <option value="12">12</option>
        <option value="13">13</option>
        <option value="14">14</option>
      </select>
    </div>

    <div class="text-center">
      <Button type={"submit"} color={"blue"}>Login</Button>
    </div>
  </form>
</div>

<!-- {#if loginError}
  <div class="w-full max-w-md mb-6">
    <div class="px-8 pt-6 pb-8 mb-4 bg-white rounded shadow-md">
      <p class="text-red-500">Error: {loginError}</p>
    </div>
  </div>
{/if} -->
