<script>
  import { onAuthStateChanged } from "firebase/auth";
  import {
    doc,
    onSnapshot,
    collection,
    query,
    orderBy,
  } from "firebase/firestore";
  import { onMount } from "svelte";
  import {
    auth,
    db,
    userStore,
    groupStore,
    groupMessagesStore,
    loggedIn,
    userId,
    reqStateChange,
    reqUserStateChange,
  } from "./utils.js";

  // app pages and components
  import Login from "./pages/Login.svelte";

  // After they full-screen, they are instructed to wait for others to join
  import RequestFullScreen from "./pages/RequestFullScreen.svelte";

  // CountdownTransition to start of experiment
  import CountdownTransition from "./pages/CountdownTransition.svelte";

  // Experiment start -- video watching & chat room
  import Experiment from "./pages/Experiment.svelte";

  // Thank you page to redirect to qualtrics when video is done
  import Debrief from "./pages/Debrief.svelte";

  // "Helper" components
  import Loading from "./components/Loading.svelte";
  import Footer from "./components/Footer.svelte";

  // VARIABLES USED WITHIN App.svelte
  let unsubscribe_user, unsubscribe_group, unsubscribe_group_msgs;

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

  // Update user state
  const updateUserState = async (newState) => {
    console.log(
      "App -- updateUserState -- currentState",
      $userStore["currentState"]
    );
    console.log("App -- updateUserState -- newState", newState);
    await reqUserStateChange(newState);
  };

  // Update group state
  const updateState = async (newState) => {
    console.log(
      "App -- updateState -- currentState",
      $groupStore["currentState"]
    );
    console.log("App -- updateState -- newState", newState);
    await reqStateChange(newState);
  };

  const redirectToQualtrics = () => {
    let qualtricsURL =
      "https://dartmouth.co1.qualtrics.com/jfe/form/SV_dbWGGHYfLGhcAgS";
    location.replace(qualtricsURL);
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
          unsubscribe_user = null;
        }
        if (unsubscribe_group) {
          unsubscribe_group();
          unsubscribe_group = null;
        }
        if (unsubscribe_group_msgs) {
          unsubscribe_group_msgs();
          unsubscribe_group_msgs = null;
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
        console.log(`User ${$userId} signed-in. Loading data...`);
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
                const combinedGroupIdEpNum = `${groupId}_${epNum}`;

                if (groupId != "") {
                  // Also subscribe to their group doc
                  unsubscribe_group = onSnapshot(
                    doc(db, "survivor-groups", combinedGroupIdEpNum),
                    (groupDoc) => {
                      groupStore.set(groupDoc.data());
                    }
                  );
                  let groupDocRef = doc(
                    db,
                    "survivor-groups",
                    combinedGroupIdEpNum
                  );
                  let messagesCollectionRef = collection(
                    groupDocRef,
                    "messages"
                  );
                  // subscribe to group messages collection
                  let messagesQuery = query(
                    messagesCollectionRef,
                    orderBy("absolute_timestamp", "asc")
                  );
                  unsubscribe_group_msgs = onSnapshot(
                    messagesQuery,
                    (querySnapshot) => {
                      const groupMessages = querySnapshot.docs.map(
                        (groupMessagesDoc) => groupMessagesDoc.data()
                      );
                      groupMessagesStore.set(groupMessages);
                    }
                  );
                }
              } else {
                console.log("userDoc does not exist");
              }
            }
          );
        } catch (error) {
          console.error(error);
        }
      }
    });
  });

  console.log(
    "App.svelte -- userStore['currentState']",
    $userStore["currentState"]
  );

  console.log(
    "App.svelte -- groupStore['currentState']",
    $groupStore["currentState"]
  );

  console.log("App.svelte -- groupMessagesStore", $groupMessagesStore);
</script>

<!-- This is our main markup. It uses the currentState field of the userStore to
determine what page a user should be on. -->
<main class="flex flex-col items-center p-10 mx-auto space-y-10 bg-white">
  {#if !$loggedIn}
    <Login />
  {:else if !$groupStore || !$groupStore["currentState"]}
    <Loading />
  {:else}
    <!-- Main experiment loop -->
    {#if $groupStore["currentState"] === "request-full-screen"}
      <RequestFullScreen on:finished={() => updateState("countdown")} />
    {:else if $groupStore["currentState"] === "countdown"}
      <CountdownTransition on:finished={() => updateState("experiment")} />
    {:else if $groupStore["currentState"] === "experiment"}
      <Experiment on:finished={() => redirectToQualtrics()} />
    {/if}
  {/if}
</main>
<Footer />
