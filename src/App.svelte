<script>
  import { onAuthStateChanged } from "firebase/auth";
  import { doc, updateDoc, onSnapshot } from "firebase/firestore";
  import { onMount } from "svelte";
  import {
    auth,
    db,
    userStore,
    groupStore,
    loggedIn,
    userId,
    initUser,
    resetGroupData,
    reqStateChange,
    serverTime,
  } from "./utils.js";

  // app pages and components
  import Login from "./pages/Login.svelte";

  // Instructions -- Confirm login and waiting for other users to login in shor time window (1 min.)
  import Instructions from "./pages/Instructions.svelte";

  // CountdownTransition to start of experiment
  import CountdownTransition from "./pages/CountdownTransition.svelte";

  // Experiment start -- video watching & chat room
  import Experiment from "./pages/Experiment.svelte";

  import Debrief from "./pages/Debrief.svelte";
  import Loading from "./components/Loading.svelte";
  import Footer from "./components/Footer.svelte";

  // TODO: Add LogRocket

  // VARIABLES USED WITHIN App.svelte
  let unsubscribe_user, unsubscribe_group;
  let unsubscribeUserId, unsubscribeGroupId;

  // Data updating API explanation:
  // See also database transaction write function in utils.js!
  // To ensure that we don't get any conflicts and race conditions when multipler users
  // write to the db close to simultaneously we always fallow 3 rules to ensure all
  // users are in-sync with the freshest data from the database
  //
  // 1. Components and pages should only read data from a $sveltestore, but *never*
  //    write to it directly (i.e. never do $sveltestore.name = 'some value')
  // 2. Instead they should write *directly to the db* either by: dispatching
  //    events back up to App.svelte and hooking them up to updateState() below
  //    OR
  //    Awaiting one of the data saving functions, e.g. saveName, saveBPQData,
  //    saveAPQData, saveDebrief from utils.js
  // 3. The $sveltestore should *only* be set by the real-time onSnapshot() listener,
  //    which subscribes to any database changes and "pushes" them to the $sveltestore
  //    which occurs within onMount() inside App.svelte
  //
  // Why?
  // If instead a client updates their own $sveltestore directly, *before* writing to
  // the database (e.g. $sveltestore.name = 'new name'; update($sveltestore)), they
  // run the risk of that $sveltestore being overwritten, by their onSnapshot() "push"
  // being triggered, by a *different* participant's setDoc() call that occurred before
  // their own.
  //
  // Instead by writing *directly* to the db, they let their own onSnapshot() update
  // their $sveltestore for them, thus ensuring their local $sveltestore and the real db
  // are never out of sync. They also "feel" the effect of the data change on
  // their UI at approx the same time as the other users.
  //

  const updateState = async (newState) => {
    await reqStateChange(newState);
  };

  // When the app first starts up we check to see if the user is logged in and if they
  // aren't we set the value of the $loggedIn svelte store to false which takes them to
  // the <Login/> page. We also unsubscribe to any data we were already subscribed to.
  // Because onAuthStateChange() is *always* watching to see if their login status
  // changes, when they sign-in from the <Login/> page, we'll automatically be in the
  // else block below. Here we set the value of the $loggedIn svelte store to true and
  // subscribe to their data
  onMount(async () => {
    onAuthStateChanged(auth, async (user) => {
      if (!user) {
        $loggedIn = false;
        if (unsubscribe_user) {
          unsubscribe_user();
        }
        if (unsubscribe_group) {
          unsubscribe_group();
        }
      } else {
        // Set the userId store to the value on their local computer because if they're
        // logging in for the first time, then Login.svelte would have already done
        // localStore.setItem()
        // Otherwise if they're already logged in and just refreshing the page, they
        // won't see Login.svelte at all so we *have* read their userId from their
        // computer.
        $userId = localStorage.getItem("userId");
        $loggedIn = true;
        console.log(`participant ${$userId} signed-in. Loading data...`);
        try {
          // Subscribe to their user doc
          unsubscribe_user = onSnapshot(
            doc(db, "survivor-participants", $userId),
            (userDoc) => {
              if (userDoc.exists()) {
                userStore.set(userDoc.data());
                // Check if groupId exists, if it does, create group subscription
                // that way group doc will run if user doc changes,
                // always looking to check if they've been assigned to a group
                const groupId = userDoc.data()?.groupId;
                const epNum = userDoc.data()?.epNum;
                console.log("groupId", groupId);
                console.log("epNum", epNum);
                const combinedGroupIdEpNum = `${groupId}_${epNum}`;

                if (groupId != "") {
                  // Also subscribe to their group doc
                  unsubscribe_group = onSnapshot(
                    doc(db, "survivor-groups", combinedGroupIdEpNum),
                    (groupDoc) => {
                      groupStore.set(groupDoc.data());
                    }
                  );

                  unsubscribeUserId = userId.subscribe((value) => {
                    // This callback will be called whenever the userId store value changes
                    console.log(
                      `User ${value} subbed to group ${combinedGroupIdEpNum} data`
                    );
                  });
                }
              } else {
                console.log("userDoc does not exist");
              }
              unsubscribeUserId = userId.subscribe((value) => {
                // This callback will be called whenever the userId store value changes
                console.log(`User ${value} subbed to user data`);
              });
            }
          );
        } catch (error) {
          console.error(error);
        }
      }
    });
  });
</script>

<!-- This is our main markup. It uses the currentState field of the userStore to
determine what page a user should be on. -->
<main class="flex flex-col items-center h-screen p-10 space-y-10">
  {#if !$loggedIn}
    <Login on:login-success={() => updateState("instructions")} />
  {:else if $groupStore["currentState"] === "instructions"}
    <Instructions on:to-experiment={() => updateState("countdown")} />
  {:else if $groupStore["currentState"] === "countdown"}
    <CountdownTransition on:finished={() => updateState("experiment")} />
  {:else if $groupStore["currentState"] === "experiment"}
    <Experiment on:finished={() => updateState("debrief")} />
  {:else if $groupStore["currentState"] === "debrief"}
    <Debrief />
  {/if}
</main>
<Footer />
