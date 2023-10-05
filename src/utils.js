// @ts-nocheck
import { initializeApp } from "firebase/app";
import { getStorage } from "firebase/storage";
import { getFirestore, doc, getDoc, updateDoc, setDoc, runTransaction, serverTimestamp } from "firebase/firestore";
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
export const participantsCollectionName = 'survivor-participants';
export const groupsCollectionName = 'survivor-groups';
export const metaCollectionName = 'survivor-meta';
//###############################################

//############################
// GLOBAL EXPERIMENT VARIABLES
//############################
// Initialize an empty reactive global variable (Svelte store) for storing a single 
// user's data that will be accessible throughout the app
export const userStore = writable({});
// Another store for the group data
export const groupStore = writable({});
// Store for meta collection data that entails which netIds are in which groups
export const metaStore = writable({});
// Another store that keeps track of whether a user is logged in or not
export const loggedIn = writable(false);
// And one more so we can keep track of their user id to subscribe to their collection
export const userId = writable(null);
// NetID
export const netId = writable(null);
// Episode Number
export const epNum = writable(null);
// Store to control the UI for what state the experiment is in
export const stateDisplay = writable([]);
// Store server time
export const serverTime = serverTimestamp();

// Add any global variables you want to use elsewhere in the app
// Then use them in another file by importing:
// import { globalVars } from '../utils.js';
// console.log(globalVars.time)
export const globalVars = {
  multiplier: 4, // TODO: have multiplier of 4 as default, but can vary this in a future hidden multiplier version
  minPainDur: 5,
  maxPainDur: 15,
  maxEndowment: 5,
  maxPossiblePainReduction: 10,
  deliveryTimeBuffer: 3000, // additional time to wait for stimulation to finish
  costConversion: {
    0.5: '2',
    0.75: '1.5',
    1: '1'
  },
  receiverEndowmentPerTrial: 2 //  36 trials * $2/trial = $72 theoretical max
};

//############################

//############################
// GLOBAL EXPERIMENT FUNCTIONS
//############################

// All NetIDs
export const allNetIds = [
  // BBB
  "f0055n5",
  "f006c2v",
  "f00563r",
  "f0055n3",
  // DEV
  "f004p57", // Wasita]
  "dev_test_1",
  "dev_test_2",
  "dev_test_3",
  // DVBrainiac
  "f004gvv",
  "f0055kp",
  "f0069ys",
  "f005cj7",
  // EFD
  "f005g15",
  "f005g97",
  "f0055k8",
  "f005cn2",
  // Freud's Favorites
  "f0055q9",
  "f005cyh",
  "f005d1c",
  "f005crp",
  // Pavlov's Dawgs
  "f004r11",
  "f005cn4",
  "f004rhy",
  "f004msc",
  // Psychiatric Trio
  "f003xfx",
  "f004r80",
  "f004hd0",
  "f004r1m",
  // Team Luke
  "f005cpx",
  "f003pt8",
  "f004p6r",
  "f004ggx",
  // The Psychedelics
  "f006h88",
  "f006bp5",
  "f006hr8",
  "f006b47",
  // The Unreasonable Ocho
  "f004hcz",
  "f004ppp",
  "f00560z",
  "f003x6m"
].sort();

// TODO: check netId exists within chosen groupId
export const checkNetId = async (groupId, netId, epNum) => {
  // netId = netId.toLowerCase();
  const docRef = doc(db, metaCollectionName, `${groupId}`);
  const docSnap = await getDoc(docRef);
  const docData = docSnap.data(); // get doc data as an object
  const membersMap = docData.members; // get members map
  console.log("membersMap", membersMap)
  
  // Create a computed property to combine epNum and groupId
  let combinedGroupIdEpNum = `${groupId}_${epNum}`;
  console.log("combinedGroupIdEpNum", combinedGroupIdEpNum)

  let membersMapValues = Object.values(membersMap);

  // check if netId exists in members map
  if (membersMapValues.includes(netId)) {
    console.log(`netId ${netId} is a member of ${groupId}`)
    await initUser(groupId, netId, epNum);
    await initGroup(combinedGroupIdEpNum, netId);
  } else {
    let netIdError = `netId ${netId} not a member of ${groupId}`;
    console.log("utils -- netIdError", netIdError);
    throw new Error(netIdError);
  }
};


export const getGroupIdFromEmail = (email) => {
  // Split the email by underscore ('_')
  const parts = email.split('_');
  
  // Check if there is at least one underscore in the email
  if (parts.length > 1) {
    // Return the first part (text before the first underscore)
    return parts[0];
  } else {
    // If there are no underscores, return the original email
    return email;
  }
}

export const getNetIdFromEmail = (email) => {
  // Split the email by underscore ('_')
  const parts = email.split('_');
  
  // Check if there is at least one underscore in the email
  if (parts.length > 1) {
    // Return the first part (text before the first underscore)
    return parts[1];
  } else {
    // If there are no underscores, return the original email
    return email;
  }
}

export const getEpNumFromEmail = (email) => {
  // Split the email by '@' to separate the username and domain
  const parts = email.split('@');
  
  // Check if there is at least one '@' in the email
  if (parts.length === 2) {
    // Get the first part (username) and split it by '_' to separate the parts
    const usernameParts = parts[0].split('_');
    
    // Check if there is at least one underscore in the username
    if (usernameParts.length > 1) {
      // Get the last part (text after the last underscore)
      const textAfterLastUnderscore = usernameParts[usernameParts.length - 1];
      
      // Return the text after the last underscore and before '@'
      return textAfterLastUnderscore;
    }
  }
  
  // If there are no underscores or '@' symbol, return an empty string
  return '';
}


// Function to create a new user document in the database
export const initUser = async (groupId, netId, epNum) => {
  try {
    // specify userId to include the specific group they are in and the episode number they're watching
    const userId = `${groupId}_${netId}_${epNum}`;
    console.log("initUser -- userId", userId);
    let email = `${groupId}_${netId}_${epNum}@experiment.com`;
    console.log("initUser -- groupId", groupId);
    console.log("initUser -- netId", netId);
    console.log("initUser -- epNum", epNum);
    console.log("initUser -- email", email);
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
        netId: netId,
        epNum: epNum,
        loggedIn: true
      });
    }
    console.log(`'New user ${userId} successfully created with document ID ${userDocRef.id}`)
  } catch (error) {
    console.log(`Error adding new user ${userId} doc to survivor-participants collection`);
  }
};

// TODO: function to set loggedIn to false in user doc
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
export const initGroup = async (groupId, netId) => {
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
        groupId: groupId,
        currentState: 'instructions', // start group at instructions screen
      });
      console.log(`New group ${groupId} successfully created with document ID: ${groupDocEpRef.id}`);
    } catch (error) {
      console.log(error)
    }
  }
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

// Format the values the user inputted so that we encode each id as 000, 001...NNN, so
// we can use them as unique document ideas up to 1000 subs.
export const formatUserId = (groupId, subId, role) => {
  let groupId_f, subId_f, userId_f, role_f;
  let g = parseInt(groupId);
  let s = parseInt(subId);
  if (g < 10) {
    groupId_f = `00${g}`;
  } else if (g >= 10 && g < 100) {
    groupId_f = `0${g}`;
  } else {
    groupId_f = groupId;
  }
  if (s < 10) {
    subId_f = `00${s}`;
  } else if (s >= 10 && s < 100) {
    subId_f = `0${s}`;
  } else {
    subId_f = subId;
  }

  userId_f = `${groupId_f}_${subId_f}_${role}`;
  role_f = role;

  return {
    groupId_f,
    subId_f,
    role_f,
    userId_f
  };
};

export const getRandomInt = (val) => {
  let min = Math.ceil(1);
  let max = Math.floor(val);
  return Math.floor(Math.random() * (max - min) + min); // The maximum is exclusive and the minimum is inclusive
}

// Round float to nearest whole integer
export const rounded = (val) => {
  return Math.round(val);
};

// Rounds a float to 2 decimal places
export const round2 = (val) => {
  return Math.round(val * 100) / 100;
};

export const roundHalf = (val) => {
  return Math.round(val * 2) / 2;
};
// Calculates propSpent on choice made, executed reactively by EndowmentScale.svelte
export const calcPropSpent = (ratingString, endowment) => {
  const proportionOfEndowmentSpent = parseFloat(ratingString) / endowment;
  return {
    proportionOfEndowmentSpent
  };
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
  const docRef = doc(db, 'survivor-groups', groupId);
  console.log("reqStateChange -- newState", newState);
  console.log("reqStateChange -- groupId", groupId);
  console.log("reqStateChange -- userId", userId);

  try {
    await runTransaction(db, async (transaction) => {

      // Get the latest data, rather than relying on the store
      const document = await transaction.get(docRef);
      if (!document.exists()) {
        throw "Document does not exist!";
      }
      // Freshest data
      const { counter, currentState } = document.data();
      console.log(
        `Participant: ${userId} is requesting state change: ${currentState} -> ${newState}`
      );
      // Add the user to the counter if they're not already in it
      if (!counter.includes(netId)) {
        await transaction.update(docRef, { counter: [...counter, netId] });
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
  const docRef = doc(db, 'survivor-groups', groupId);
  try {
    await runTransaction(db, async (transaction) => {
      // Get the latest data, rather than relying on the store
      const document = await transaction.get(docRef);
      if (!document.exists()) {
        throw "Document does not exist!";
      }
      // Get latest counter
      const { counter } = document.data();
      // Want there to be at least 3 members present
      if (counter.length === 3) {
        console.log('Last request...initiating state change');
        const obj = {};
        obj["counter"] = [];
        obj["currentState"] = newState;
        await transaction.update(docRef, obj);
      } else {
        console.log(`Still waiting for ${3 - counter.length} requests...`);
      }
    });
  } catch (error) {
    console.error(`Error verifying state change`, error);
  }
};

// Save each user's name in the group doc
export const saveName = async (name) => {
  const { groupId } = get(groupStore);
  const { role } = get(userStore);
  const docRef = doc(db, 'groups', groupId);
  try {
    await runTransaction(db, async (transaction) => {
      const document = await transaction.get(docRef);
      if (!document.exists()) {
        throw "Document does not exist!";
      }
      const updateData = {};
      if (role === 'investor') {
        updateData['I_name'] = name;
      } else if (role === 'trustee') {
        updateData['T_name'] = name;
      } else {
        throw `${role} is an unknown role`;
      }
      await transaction.update(docRef, updateData);
      console.log(`Successfully added ${name} to db`);
    });

  } catch (error) {
    console.error(`Error saving name for user: ${name}`, error);
  }

};

// Save trial data for Q questions handling concurrent writes
export const saveQData = async (questions) => {
  const { groupId, currentState } = get(groupStore);
  const { role } = get(userStore);
  const docRef = doc(db, 'groups', groupId);
  try {
    await runTransaction(db, async (transaction) => {
      // Get the latest data, rather than relying on the store
      const document = await transaction.get(docRef);
      if (!document.exists()) {
        throw "Document does not exist!";
      }
      // Get the latest trial and current trial
      const { trials, currentTrial } = document.data();
      const data = { "trials": trials };
      console.log("data", data)
      console.log("questions", questions)
      console.log("currentTrial", currentTrial)

      // TO E FROM W: I know this is spaghetti but it (seemingly) gets the job done
      if (currentState === "phase-01") {
        if (role === "investor") {
          data["trials"][currentTrial]["I_CHOICE"] = rounded(questions[0].rating);
        } else if (role === 'trustee') {
          data["trials"][currentTrial]["T_PREDICTION"] = rounded(questions[0].rating);
        } else {
          throw `${role} is an unknown role`;
        }
      } else if (currentState === "phase-02") {
        if (role === "investor") {
          data["trials"][currentTrial]["I_1ST_ORDER_EXPECTATION"] = rounded(questions.rating);
        } else if (role === 'trustee') {
          data["trials"][currentTrial]["T_2ND_ORDER_EXPECTATION"] = rounded(questions.rating);
        } else {
          throw `${role} is an unknown role`;
        }
      } else if (currentState === "phase-03") {
        if (role === 'trustee') {
          let endowment = data["trials"][currentTrial].endowment;
          let t_choice = rounded(questions[0].rating); // how much T chooses to give to I (of the invested amount * multiplier)
          let i_choice = rounded(data["trials"][currentTrial]["I_CHOICE"]); // how much of endowment I chose to invest in T from phase-01

          data["trials"][currentTrial]["T_CHOICE"] = t_choice; // how much T returned to I
          data["trials"][currentTrial]["T_EARNED"] = rounded(((i_choice * globalVars.multiplier) - t_choice));
          data["trials"][currentTrial]["I_EARNED"] = rounded((endowment - i_choice) + t_choice); // should be: (endowment - I_CHOICE) + T_CHOICE

        } else if (role === 'investor') {
          console.log("investor waiting for trustee")
        } else {
          throw `${role} is an unknown role`;
        }
      } else if (currentState === "phase-04") {
        if (role === 'trustee' || role === 'investor') {
          console.log("finished phase-04")
        } else if (currentState === "phase-05") {
          if (role === 'trustee' || role === 'investor') {

            let self = role === "trustee" ? "T" : "I"

            data["trials"][currentTrial][`${self}_GUILT`] = rounded(questions[0].rating);
            data["trials"][currentTrial][`${self}_COUNTERFACTUAL_GUILT`] = rounded(questions[1].rating);
          } else {
            throw `${role} is an unknown role`;
          }
        }
      }

      await transaction.update(docRef, data);
      console.log(`Successfully saved Q data for: ${role}`);
    });
  } catch (error) {
    console.error(`Error saving data for group: ${groupId}`, error);
  }
};

export const saveAPQData = async (questions) => {
  const { groupId } = get(groupStore);
  const { role } = get(userStore);
  const docRef = doc(db, 'groups', groupId);
  try {
    await runTransaction(db, async (transaction) => {
      const document = await transaction.get(docRef);
      if (!document.exists()) {
        throw "Document does not exist!";
      }
      // Get the latest trial and current trial
      const { trials, currentTrial } = document.data();
      const data = { "trials": trials };
      let prefix;
      let suffix;
      let key;
      if (role === "decider1") {
        prefix = "D1_";
      } else if (role === "decider2") {
        prefix = "D2_";
      } else if (role === 'receiver') {
        prefix = "R_";
      } else {
        throw `${role} is an unknown role`;
      }
      questions.forEach((q) => {
        if (q.type.includes("other")) {
          suffix = q.type.split("_")[1];
          key = prefix === "D1_" ? "D2_" : "D1_";
          key = `${prefix}${key}${suffix}`;
        } else {
          key = `${prefix}${q.type}`;
        }
        data["trials"][currentTrial][key] = q.rating;
      });
      await transaction.update(docRef, data);
      console.log(`Successfully saved APQ data for: ${role}`);
    });
  } catch (error) {
    console.error(`Error saving data for group: ${groupId}`, error);
  }

};

export const saveDebrief = async (data) => {
  const { groupId } = get(groupStore);
  const { role } = get(userStore);
  const docRef = doc(db, 'groups', groupId);
  try {
    await runTransaction(db, async (transaction) => {
      const document = await transaction.get(docRef);
      if (!document.exists()) {
        throw "Document does not exist!";
      }
      const updateData = { 'debrief': {} };
      if (role === 'decider1') {
        updateData['debrief']['D1'] = data;
      } else if (role === 'decider2') {
        updateData['debrief']['D2'] = data;
      } else if (role === 'receiver') {
        updateData['debrief']['R'] = data;
      } else {
        throw `${role} is an unknown role`;
      }
      await transaction.update(docRef, updateData);
      console.log("Successfully saved debrief data");
    });

  } catch (error) {
    console.error(`Error saving debrief data`, error);
  }

}





