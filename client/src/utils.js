// Initialize firebase
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
import 'firebase/compat/storage';
import 'firebase/compat/auth';
import { writable } from 'svelte/store';
import { uniqueNamesGenerator, adjectives, animals, colors } from 'unique-names-generator';
import { nameSeparator } from 'concurrently/src/defaults';

// GLOBAL EXPERIMENT VARIABLES
// FUTURE TODO: read in a json with config
export const expConfig = {
  bonusAmount: 1.0, // prev: bonusPerRecording
  basePayment: 15.00,
  maxQuizAttempts: 3,
  quizAnswerBuffer: 5,
  groupSize: 4,
  waitLimit: 10, // default: 10 minutes
  waitFailLimit: .083, // 5 seconds
  consentHallwayLimit: 30, // 30 seconds
  debugMode: false
};

const firebaseConfig = {
  apiKey: 'AIzaSyDkdKO_KE0b2S6bg9CNH-yBGB-0Ph6GOXI',
  authDomain: 'svelte-vid-sync-chat-app.firebaseapp.com',
  databaseURL: 'https://svelte-vid-sync-chat-app-default-rtdb.firebaseio.com',
  projectId: 'svelte-vid-sync-chat-app',
  storageBucket: 'svelte-vid-sync-chat-app.appspot.com',
  messagingSenderId: '847886552871',
  appId: '1:847886552871:web:e858b721ad999f26696302',
  measurementId: 'G-CC4NVFPPX7',
};
console.log('firebaseConfig', firebaseConfig);
firebase.initializeApp(firebaseConfig);

// Export firebase globals for use elsewhere in the app
export const db = firebase.firestore();
export const storage = firebase.storage();
export const auth = firebase.auth();
export const serverTime = firebase.firestore.FieldValue.serverTimestamp();
export const increment = firebase.firestore.FieldValue.increment(1);
export const append = firebase.firestore.FieldValue.arrayUnion;

// TODO: add handling for PROLIFIC_PID, STUDY_ID, SESSION_ID

// function to parse URL and only get value of desired variables
const getQueryVariable = (variable) => {
  let query = window.location.search.substring(1);
  let vars = query.split("&");
  for (let i = 0; i < vars.length; i++) {
    let pair = vars[i].split("=");
    if (decodeURIComponent(pair[0]) === variable) {
      return decodeURIComponent(pair[1]);
    }
  }
};

const getProlificId = () => {
  return getQueryVariable("PROLIFIC_PID");
};

const getWorkerId = () => {
  return getQueryVariable("workerId");
};

// Functions to parse the URL to get workerID, hitID, and assignmentID
const unescapeURL = (s) => decodeURIComponent(s.replace(/\+/g, '%20'));
export const getURLParams = () => {
  const params = {};
  const m = window.location.href.match(/[\\?&]([^=]+)=([^&#]*)/g);
  if (m) {
    let i = 0;
    while (i < m.length) {
      const a = m[i].match(/.([^=]+)=(.*)/);
      params[unescapeURL(a[1])] = unescapeURL(a[2]);
      i += 1;
    }
  }

  let prolificId = getProlificId();
  let workerId = getWorkerId();

  let USE_MTURK = (workerId) ? true : false;
  let USE_PROLIFIC = (prolificId) ? true : false;

 if (USE_MTURK) { 
    params.platformId = workerId;
    console.log("Using MTurk \n MTURK_ID:", workerId)

 } else if (USE_PROLIFIC) {
    console.log("Using Prolific \n PROLIFIC_PID:", prolificId)
    let studyId = getQueryVariable("STUDY_ID");
   let sessionId = getQueryVariable("SESSION_ID");
    params.platformId = prolificId;
    params.hitId = studyId;
    params.assignmentId = sessionId;
  }
  console.log("params", params);
  return params;
};

// Use those functions to get the window URL params and make them available throughout the app
export const params = getURLParams();

// Shuffle array elements inplace: https://javascript.info/task/shuffle
export const fisherYatesShuffle = (array) => {
  for (let i = array.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1)); // random index from 0 to i

    // swap elements array[i] and array[j]
    // we use "destructuring assignment" syntax to achieve that
    // you'll find more details about that syntax in later chapters
    // same can be written as:
    // let t = array[i]; array[i] = array[j]; array[j] = t
    // eslint-disable-next-line no-param-reassign
    [array[i], array[j]] = [array[j], array[i]];
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


// STIMULI DATA MANGEMENT
// Get a random recording document filename guaranteed to have a low number of responses at the time
// this query is made; Used to retrieve subsequent trials for each user after trial 1
export const getRandomAudioFilename = async () => {
  const fileName = [];
  try {
    const query = await db
      .collection('recordings')
      .orderBy('responses')
      .limit(1)
      .get();
    query.forEach((doc) => {
      fileName.push(doc.data().name);
    });
    return fileName[0];
  } catch (err) {
    console.error(err);
  }
  return null;
};

// Given a filename update the response count for that file
export const updateAudioFileResponseCount = async (filename) => {
  try {
    const query = await db
      .collection('recordings')
      .where('name', '==', filename)
      .limit(1)
      .get();
    const docId = query.docs[0].id;
    await db
      .collection('recordings')
      .doc(docId)
      .update({ responses: increment });
    console.log(
      `successfully incremented response count for: ${filename} ${docId}`
    );
  } catch (err) {
    console.error(err);
  }
  return null;
};


// USER DATA MANAGEMENT
// Initialize store to share user state across the app
export const userStore = writable({});

// TODO: add or change to prod-participants
// Async update user firestore doc given a store as input
export const updateUser = async (userDoc) => {
  try {
    let collectionName = (DEV_MODE) ? 'survivor-dev-participants' : 'survivor-prod-participants';
    await db.collection(`${collectionName}`).doc(params.platformId).update(userDoc);
    console.log('user doc successfully updated');
  } catch (err) {
    console.error('Error updating user document in firestore');
    console.log(err);
  }
};

// Setup a fresh user account or reset an existing one
export const initUser = async () => {
  // Get 1 random recording based upon the least frequently tagged ones thus far
  // Experiment.svelte will handle selecting the next audio file by requerying the lowest tagged
  // audio files thus far. This is better than pregenerating a list of audio files ahead of time,
  // because all initial users will get the same files and we'll get lots of tags for those files
  // but none for others. By querying one at a time, we can better ensure uniform sampling of the
  // files based on whether they've been rated already in *real-time*.
  const trialOrder = [];
  try {
    const query = await db
      .collection('recordings')
      .orderBy('responses')
      .limit(1)
      .get();
    query.forEach((doc) => {
      trialOrder.push(doc.data().name);
    });
    fisherYatesShuffle(trialOrder);

    // TODO: change to prod-participants
    let collectionName = DEV_MODE ? 'survivor-dev-participants' : 'survivor-prod-participants';

    // Create the user doc
    await db.collection(`${collectionName}`).doc(params.platformId).set({
      platformId: params.platformId,
      assignmentId: params.assignmentId,
      hitId: params.hitId,
      consent_start: serverTime,
      currentState: 'consent',
      quizState: 'overview',
      quizAttempts: 0,
      quizPassed: false,
      bonus: 0,
      submitted: false,
      trialOrder,
    });
  } catch (error) {
    console.error(error);
  }
};