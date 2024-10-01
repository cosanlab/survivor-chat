// @ts-nocheck
import { initializeApp } from "firebase/app";
import { getStorage } from "firebase/storage";
import { getFirestore, doc, addDoc, getDoc, updateDoc, setDoc, collection, runTransaction, serverTimestamp } from "firebase/firestore";
import { getAuth } from 'firebase/auth';
import { writable, get } from 'svelte/store';

//###############################################
// INITIALIZE AND SETUP FIREBASE FOR DATA STORAGE
//###############################################
// NOTE: This app uses the module version of the firebase JS library which uses
// different syntax since version 9.x.x

// Copy and paste your firebase config here:
const firebaseConfig = {
  apiKey: "AIzaSyDkdKO_KE0b2S6bg9CNH-yBGB-0Ph6GOXI",
  authDomain: "svelte-vid-sync-chat-app.firebaseapp.com",
  databaseURL: "https://svelte-vid-sync-chat-app-default-rtdb.firebaseio.com",
  projectId: "svelte-vid-sync-chat-app",
  storageBucket: "svelte-vid-sync-chat-app.appspot.com",
  messagingSenderId: "847886552871",
  appId: "1:847886552871:web:e858b721ad999f26696302",
  measurementId: "G-CC4NVFPPX7"
};

// Initialize firebase
const app = initializeApp(firebaseConfig);

// Export database variables for use elsewhere in the app
// Exporting them from this file after initializing the database connection above
// makes it easy to read/write to the database from any file in the app
// Use them by importing in another file:
// import { db } from 'utils.js'
// db.collection(...)
export const db = getFirestore();
export const storage = getStorage();
export const auth = getAuth();

// Export the name of the collections we'll be using
export const participantsCollectionName = 'f24-survivor-participants';
export const groupsCollectionName = 'f24-survivor-groups';
export const metaCollectionName = 'f24-survivor-meta';
//###############################################

//############################
// GLOBAL EXPERIMENT VARIABLES
//############################
// Initialize an empty reactive global variable (Svelte store) for storing a single 
// user's data that will be accessible throughout the app
export const userStore = writable({});
// Another store for the group data
export const groupStore = writable({});
// Store for group messages
export const groupMessagesStore = writable({});
// TODO: Store for meta collection data that entails which netIds are in which groups
// export const metaStore = writable({});
// Another store that keeps track of whether a user is logged in or not
export const loggedIn = writable(false);
// And one more so we can keep track of their user id to subscribe to their collection
export const userId = writable(null);
// NetID
export const netId = writable(null);
// Store to control the UI for what state the experiment is in
export const stateDisplay = writable([]);
// Store server time
export const serverTime = serverTimestamp();

// Add any global variables you want to use elsewhere in the app
export const globalVars = {
  maxGroupSize: 4,
  minGroupSize: 2,
  countdownTime: 5, // how many seconds to countdown before starting the experiment
  DEBUG_MODE: false,
};

//############################

//############################
// GLOBAL EXPERIMENT FUNCTIONS
//############################

// FUTURE TODO: Read this from meta collection
// but for now, too lazy so we hard-code it
// Options for the dropdown menu in Login.svelte
// All NetIDs

export const groupsNetIDMap = {
  DEV: [
    "test_user_1",
    "test_user_2",
    "test_user_3",
    "test_user_4",
  ],
  "Minions": [
    "f006g4d",
    "f006j5d",
    "f006bvh",
  ],
  "Teletubbies": [
    "f005g3b",
    "f005cp2",
    "f005d17",
    "f004r90",
  ],
  "PickleBalls": [
    "f005fbg",
    "f005g9v",
    "f005g3d",
    "f004gfx",
  ],
  "QuadSquad": [
    "f0056ps",
    "f0055kj",
    "f005d07",
    "f0055j3",
  ],
  "AutomaticJellybeans": [
    "f005699",
    "f004gtq",
    "f005ckp",
    "f005cpq",
  ],
  "InsideOut": [
    "f006tx9",
    "f006vnx",
    "f0071fv",
    "f0055sw",
  ],
  "HowIOutwitted": [
    "f005cy5",
    "f0055p3",
    "f0055q5",
    "f005cp6",
  ],
  "HappyZappy": [
    "f006bdj",
    "f004gyy",
    "f005g9x",
    "f006bkq",
  ],
  "Finishers": [
    "f00567x",
    "f004rx5",
    "f004qk5",
    "f0056g0",
  ],
  "SADM": [
    "f0055yy",
    "f0056ct",
    "f0056g4",
  ],
};

export const allNetIds = [
  // DEV
  "test_user_1",
  "test_user_2",
  "test_user_3",
  "test_user_4",
  // 1-the minions
  "f006g4d",
  "f006j5d",
  "f006bvh",
  // 2-Teletubbies
  "f005g3b",
  "f005cp2",
  "f005d17",
  "f004r90",
  // 3-Pickle Balls
  "f005fbg",
  "f005g9v",
  "f005g3d",
  "f004gfx",
  // 4-Quad Squad
  "f0056ps",
  "f0055kj",
  "f005d07",
  "f0055j3",
  // 5-Automatic Jellybeans
  "f005699",
  "f004gtq",
  "f005ckp",
  "f005cpq",
  // 6-Inside Out
  "f006tx9",
  "f006vnx",
  "f0071fv",
  "f0055sw",
  // 7-How I Outwitted Your Tribe
  "f005cy5",
  "f0055p3",
  "f0055q5",
  "f005cp6",
  // 8-Happy Zappy Neurons
  "f006bdj",
  "f004gyy",
  "f005g9x",
  "f006bkq",
  // 9-The Finishers
  "f00567x",
  "f004rx5",
  "f004qk5",
  "f0056g0",
  // 10-Social Affective Decision Makers
  "f0055yy",
  "f0056ct",
  "f0056g4"
].sort();

// Find corresponding first name for given netId
export const getUserNameInMeta = async (groupId, netId, userId) => {
  const metaDocRef = doc(db, metaCollectionName, `${groupId}`);
  const metaDocSnapshot = await getDoc(metaDocRef);
  const metaDocData = metaDocSnapshot.data(); // get doc data as an object
  const membersMap = metaDocData.members; // get members map
  console.log("getUserNameInMeta -- membersMap", membersMap);

  // Find index of netId in members map
  let netIdIdx = -1; // Initialize with -1 to indicate not found

  // Iterate through the membersMap
  for (const key in membersMap) {
    if (membersMap[key] === netId) {
      netIdIdx = key; // Set netIdIdx to the key (assuming keys are numeric indices)
      break; // Exit the loop once a match is found
    }
  }
  const firstNames = metaDocData.names;
  const firstName = firstNames[netIdIdx];

  // Now write first name to user doc
  const userDocRef = doc(db, participantsCollectionName, userId);
  await updateDoc(userDocRef, {
    username: firstName
  });
};

// Check netId exists within chosen groupId
export const checkNetId = async (groupId, netId, epNum) => {
  const docRef = doc(db, metaCollectionName, `${groupId}`);
  const docSnap = await getDoc(docRef);
  const docData = docSnap.data(); // get doc data as an object
  const membersMap = docData.members; // get members map
  
  // Create a computed property to combine epNum and groupId
  let combinedGroupIdEpNum = `${groupId}_${epNum}`;
  let membersMapValues = Object.values(membersMap);

  // check if netId exists in members map
  if (membersMapValues.includes(netId)) {
    console.log(`netId ${netId} is a member of ${groupId}`)
    await initUser(groupId, netId, epNum);
    await initGroup(combinedGroupIdEpNum, netId, epNum);
  } else {
    let netIdError = `netId ${netId} not a member of ${groupId}`;
    console.log("utils -- netIdError", netIdError);
    throw new Error(netIdError);
  }
};

// convert time from seconds to mm:ss format
export const formatTime = (seconds) => {
    if (isNaN(seconds)) return "...";
    const minutes = Math.floor(seconds / 60);
    seconds = Math.floor(seconds % 60);
    if (seconds < 10) seconds = "0" + seconds;
    return `${minutes}:${seconds}`;
  };

// Function to create a new user document in the database
export const initUser = async (groupId, netId, epNum) => {
  try {
    // specify userId to include the specific group they are in and the episode number they're watching
    const userId = `${groupId}_${epNum}_${netId}`;
    let email = `${groupId}_${epNum}_${netId}@experiment.com`;
    let combinedGroupIdEpNum = `${groupId}_${epNum}`;

    // We could have just tried to read the value of the $userId store here, but the $
    // syntax only works in .svelte files. There's a special get() function we have to
    // use instead, but because this is such simple case let's just make the userId like
    // we do in Login.svelte and avoid the overhead.
    const userDocRef = doc(db, participantsCollectionName, userId);

    // Check whether userId exists in partcipants doc first
    const userDocSnapshot = await getDoc(userDocRef);
    if (userDocSnapshot.exists()) {
      // User doc already exists
      console.log(`User doc already exists for ${userId}`);
    } else {
      // Creating new user doc
      console.log(`Creating user doc for ${userId}...`);

      // Write user doc in participations collection
      await setDoc(userDocRef, {
        email: email, // email (format: groupId_netId_epNum)
        userId: userId, // email (format: groupId_netId_epNum)
        groupId: groupId, // user chooses from drop-down; hard-coded in firebase db
        groupDocName: combinedGroupIdEpNum, // ${groupId}_${epNum}
        netId: netId,
        epNum: epNum,
        loggedIn: true,
        videoTime: 0, // initialize current video time as 0
      });
    }
    console.log(`'New user ${userId} successfully created with document ID ${userDocRef.id}`)
  } catch (error) {
    console.log(`Error adding new user ${userId} doc to ${participantsCollectionName} collection`);
  }
};

// Function to set loggedIn to false in user doc
export const logoutUser = async (groupId, netId, epNum) => {
  try {
    // Convert user-input netId to lowercase
    netId = netId.toLowerCase();
    // treat userId as their email
    const userId = `${groupId}_${netId}_${epNum}`;

    // We could have just tried to read the value of the $userId store here, but the $
    // syntax only works in .svelte files. There's a special get() function we have to
    // use instead, but because this is such simple case let's just make the userId like
    // we do in Login.svelte and avoid the overhead.
    const userDocRef = doc(db, participantsCollectionName, userId);

    // Check whether userId exists in partcipants doc first
    const userDocSnapshot = await getDoc(userDocRef);
    if (userDocSnapshot.exists()) {
      // User doc already exists
      console.log(`User doc already exists for ${userId}`);
    } else {
      // Creating new user doc
      console.log(`Creating user doc for ${userId}...`);

      // Write user doc in participations collection
      await updateDoc(userDocRef, {
        loggedIn: false
      });
    }
    console.log(`'New user ${userId} successfully logged out with document ID ${userDocRef.id}`)
  } catch (error) {
    console.log(`Error logging out user ${userId} doc`);
  }
};

// Function to initialize/update a new group record in the database
// that corresponds to groupId and epNum
export const initGroup = async (groupId, netId, epNum) => {
  // At this point, groupId includes th eepNUm with it: e.g., "DEV_1"
  console.log("initGroup -- groupId", groupId);

  // Note: if use doc(db, 'groups', ) should return name fo group id
  // groupDocRef.id will be the name of the group

  // Create group doc specific to the group and the episode number they're watching
  const groupDocEpRef = doc(db, groupsCollectionName, groupId);
  const groupDocEpSnapshot = await getDoc(groupDocEpRef);

  // Check if the group ep doc already exists
  // if it does, someone in the group has already logged in
  if (groupDocEpSnapshot.exists()) {
    // Group episode doc already exists
    console.log(`Group doc already exists for ${groupId}`);

    // Update counter for group doc
  } else {
    // Create new group episode doc
    console.log(`Group ${groupId} document does not exist! Creating now...`);
    try {
      await setDoc(groupDocEpRef, {
        counter: [netId], // initialize counter as empty array - will be updated by reqStateChange()
        users: [], // initialize users as empty array - will be updated by reqStateChange()
        groupId: groupId,
        epNum: epNum,
        logVideoTimestamp: false,
        currentState: 'request-full-screen', // start group at instructions screen
      });
      console.log(`New group ${groupId} successfully created with document ID: ${groupDocEpRef.id}`);
    } catch (error) {
      console.log(error)
    }
  }
};

// Log user's video timestamps to their user doc
export const updateUserTimestamp = async (userId, newTimestamp) => {
  const userDocRef = doc(db, participantsCollectionName, userId);

  await runTransaction(db, async (transaction) => {
    // Get the latest data, rather than relying on the store
    const document = await transaction.get(userDocRef);
    if (!document.exists()) {
      throw "Document does not exist!";
    }
    // Freshest data
    const { videoTime } = document.data();
    
    if (newTimestamp > videoTime) {
      // Write user's video timestamp to group doc
      await updateDoc(userDocRef, {
        videoTime: newTimestamp
      });
    }
  });
};

// Set each user's logVideoTimestamp to true
export const setUserToLogTimestamp = async (groupMembers, logTimestampFlag) => {
  for (const member of groupMembers) {
    try {
      // Create user document reference
      const userDocRef = doc(db, participantsCollectionName, member);

      // Update the user's logVideoTimestamp flag
      await updateDoc(userDocRef, {
        logVideoTimestamp: logTimestampFlag
      });

      console.log(`Updated logVideoTimestamp for user: ${member}`);
    } catch (error) {
      console.error(`Error updating user ${member}:`, error);
    }
  }
};

// set group new mssage to boolean value
export const setGroupToLogMsg = async (groupId, booleanValue) => {
  const groupDocRef = doc(db, groupsCollectionName, groupId);
  await updateDoc(groupDocRef, {
    newMessage: booleanValue
  });
};



// Query everyone in group's video timestamps
// then return the highest number
// to then set the video time to that number
// in Experiment.svelte
export const queryGroupTimestamps = async (groupId, groupMembers) => {
  // Iterate through groupMembers array
  // and query each user's video timestamp
  // by reading their user doc
  // then push each video timestamp to an array
  // then return the highest number in the array

  // Create empty array to store video timestamps
  let videoTimes = [];

  // Iterate through groupMembers array
  for (let i = 0; i < groupMembers.length; i++) {
    // Create user doc ref
    const userDocRef = doc(db, participantsCollectionName, groupMembers[i]);

    await runTransaction(db, async (transaction) => {
      // Get the latest data, rather than relying on the store
      const document = await transaction.get(userDocRef);
      if (!document.exists()) {
        throw "Document does not exist!";
      }
      // Freshest data
      const { videoTime } = document.data();
      // Push user's video timestamp to videoTimes array
      videoTimes.push(videoTime);

    });
  }

  // Return the highest number in the array
  return Math.max(...videoTimes);
};



// Reset a group to the instructions and first trial
// Doesn't erase their data
export const resetGroupData = async () => {
  const groupData = get(groupStore);
  groupData.counter = [];
  groupData.currentState = 'instructions';
  groupData.currentTrial = 0;
  try {
    const docRef = doc(db, 'groups', groupData.groupId);
    await setDoc(docRef, groupData);
    console.log('Successfully reset group data');
  } catch (error) {
    console.error(`Error resetting group data:`, error);
  }

};

// CHAT UTILS //

// Function to add a new message to the group doc
export const addMessage = async (groupDocName, messageObj) => {
  // Have to do this here bc serverTimestamp() 
  // serverTimestamp() is not currently supported inside arrays
  // add absolute timestamp to messageObj
  messageObj['absolute_timestamp'] = serverTime;
  
  // Access the group doc
  const groupDocRef = doc(db, groupsCollectionName, groupDocName);
  const groupDocSnapshot = await getDoc(groupDocRef);
  const messagesCollectionRef = collection(groupDocRef, "messages");

  // Check if the group doc already exists
  if (groupDocSnapshot.exists()) {
    // Group doc already exists
    console.log(`Group doc already exists for ${groupDocName}`);

    // Update messages for group doc
    try {
      await updateDoc(groupDocRef, {
        newMessage: true
      });
      // Add the message to the "messages" collection as a new document
      await addDoc(messagesCollectionRef, messageObj);
      console.log(`New message successfully added to group ${groupDocName}`);
    } catch (error) {
      console.log(error)
    }
  }
};

//#####################################
// DATABASE TRANSACTION WRITE FUNCTIONS
//#####################################
// These are functions that make use of firestore's runTransaction() feature
// EXPLANATION:
// When multiple users try to update the *same* data simulataneously, e.g. when
// submitting their responses during a part of a trial, or indicating they're ready to
// advance the experiment state, we can run into conflicts when these updates occur
// simultaenously or close in time

// This is particularly bad, when some of the data we're trying to update depends on
// existing values in the database, e.g. the counter which keeps track of which and how
// many users are ready to advance to the next state

// In these situations, we don't want to rely on the value in the $groupStore, because
// it's updated by onSnapShot(), which will push changes *immediately* even if those
// values haven't been written to the db yet. That's because firestore first updates a
// user's *local* copy of the db, which triggers the onSnapShot() function and
// overwrites the groupStore. 

// Similar to the issue with directly updating the groupStore as described in
// App.svelte, a call to updateDoc will also update a user's groupStore before writing
// to the database because groupStore is overwritten everytime onSnapShot() runs. So
// whenever we want to make a write to the db that needs the *latest* data, we need to
// wrap that write in runTransaction(). Inside this function we first perform a get()
// for the latest data, then use those values before calling update(). runTransaction()
// is designed to pay attention to if the data changes any time between get() and
// update(), e.g. by another user. In this case, it'll re-run itself thus ensuring get()
// has the latest data before running update()

// Update the experiment state and write to firebase
// Checks to see if all participants are ready to transition from state A -> B each
// time the function runs. So only the *last* user to call this function actually
// initiates the state change
export const reqStateChange = async (newState) => {
  const { groupId } = get(groupStore);
  const { netId } = get(userStore);
  const docRef = doc(db, groupsCollectionName, groupId);
  console.log("reqStateChange -- newState", newState);
  console.log("reqStateChange -- groupId", groupId);
  console.log("reqStateChange -- userId", userId);
  console.log("reqStateChange -- netId", netId);

  try {
    await runTransaction(db, async (transaction) => {

      // Get the latest data, rather than relying on the store
      const document = await transaction.get(docRef);
      if (!document.exists()) {
        throw "Document does not exist!";
      }
      // Freshest data
      const { counter, currentState, users, groupId } = document.data();
      console.log(
        `Participant: ${netId} is requesting state change: ${currentState} -> ${newState}`
      );
      let fullId = `${groupId}_${netId}`;
      console.log("fullId", fullId)
      console.log("netId", netId)

      // Add the user to the counter if they're not already in it
      if (!counter.includes(netId)) {
        await transaction.update(docRef, { counter: [...counter, netId] });
      } else {
        console.log("Ignoring duplicate request");
      }
      if (!users.includes(fullId)) {
        await transaction.update(docRef, { users: [...users, fullId] });
      } else {
        console.log("Ignoring duplicate request");
      }
    });
  } catch (error) {
    console.error(`Error updating state to ${newState} for group: ${groupId}`, error);
  }
  // Use helper function to run a second transaction that checks the counter length and
  // actually performs the state change if appropriate
  await verifyStateChange(newState);
};

// Helper function called by reqStateChange that runs a follow-up transaction after the
// reqStateChange transaction so we rely on freshes counter value in the db rather than
// the value in any user's store which may be out-of-sync
// Also has the benefit that if all 3 users have requested a state change, but it failed
// for some reason, then any user can re-make that request without overwriting their
// data and it will run sucdessfully 
const verifyStateChange = async (newState) => {
  const { groupId } = get(groupStore);
  const docRef = doc(db, groupsCollectionName, groupId);
  try {
    await runTransaction(db, async (transaction) => {
      // Get the latest data, rather than relying on the store
      const document = await transaction.get(docRef);
      if (!document.exists()) {
        throw "Document does not exist!";
      }
      // Get latest counter
      const { counter } = document.data();
      // Want there to be at least 2 members present
      if (counter.length === globalVars.minGroupSize) {
        console.log('Last request...initiating state change');
        const obj = {};
        obj["counter"] = [];
        obj["currentState"] = newState;
        await transaction.update(docRef, obj);
      } else {
        console.log(`Still waiting for ${globalVars.maxGroupSize - counter.length} requests...`);
      }
    });
  } catch (error) {
    console.error(`Error verifying state change`, error);
  }
};

// Request user state change and verify the state change
export const reqUserStateChange = async (newState) => {
  const { userId } = get(userStore);
  console.log("Utils -- reqUserStateChange -- userId", userId);
  const docRef = doc(db, participantsCollectionName, userId);

  // update user doc
  try {
    await runTransaction(db, async (transaction) => {

      // Get the latest data, rather than relying on the store
      const document = await transaction.get(docRef);
      if (!document.exists()) {
        throw "Document does not exist!";
      }
      // Freshest data
      const { currentState } = document.data();
      console.log(
        `Participant: ${netId} is requesting state change: ${currentState} -> ${newState}`
      );
      const data = {};
      data["currentState"] = newState;
      data[`${currentState}_end`] = serverTime;
      data[`${newState}_start`] = serverTime;
      console.log('Initiating state change...');
      await transaction.update(docRef, data);
      console.log('Ran transaction...');
    });
  } catch (error) {
    console.error(`Error updating state to ${newState} for user: ${userId}`, error);
  }
};

// Add client to group doc users field
export const addClientToGroup = async (groupDocName, userId) => {
  const groupDocEpRef = doc(db, groupsCollectionName, groupDocName);

  try {
    await runTransaction(db, async (transaction) => {

      // Get the latest data, rather than relying on the store
      const document = await transaction.get(groupDocEpRef);
      if (!document.exists()) {
        throw "Document does not exist!";
      }
      // Freshest data
      const { users } = document.data();

      // Add the client's userId to the users field if they're not already in it
      if (!users.includes(userId)) {
        await transaction.update(groupDocEpRef, { users: [...users, userId] });
      } else {
        console.log("Ignoring duplicate request");
      }
    });
  } catch (error) {
    console.error(`Error adding userId ${userId} for group: ${groupDocName}`, error);
  }
};




