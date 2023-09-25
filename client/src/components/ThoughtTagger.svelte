<!-- This is the main thought-tagging component that is used in Experiment.svelte as well as
Quiz.svelte. It behaves differently in each case based upon input properties it receives. It makes
use of the peaks.js waveform visualizer. -->
<script>
  // IMPORTS
  // -------------------------------------------
  import Peaks from "peaks.js";
  import { onMount, createEventDispatcher } from "svelte";
  import {
    expConfig,
    db,
    serverTime,
    userStore,
    updateUser,
    updateAudioFileResponseCount,
  } from "../utils.js";

  // INPUTS FROM PARENT COMPONENT
  // -------------------------------------------
  export let src;
  export let fileName = "";
  export let hasTutorial = false;
  export let quizAnswers = [];

  // COMPONENT VARIABLES
  // -------------------------------------------
  // eslint-disable-next-line prefer-const
  let subjectId;
  let character;
  if (fileName) {
    [subjectId, character] = fileName.split("_");
    [character] = character.split("_");
  }
  let peaksInstance;
  let segments = [];
  let selectedSegmentId;
  let rowSelected = false;
  let segmentPrevMax = 0;
  const dispatch = createEventDispatcher();
  let peaksLoading = true;
  let rate = false;
  let confidence = 50;
  let clarity = 50;
  let clarityRated = false;
  let confidenceRated = false;
  let time = "";
  let timer;
  let invalidTime = false;
  let audioFinished = false;
  $: nextTrialActive = !(
    clarityRated &&
    confidenceRated &&
    time &&
    !invalidTime
  );
  $: ratingActive = segments.length === 0;

  // COMPONENT LOGIC
  // -------------------------------------------
  // Validate the time input field with a delay of 600ms
  const debounce = (v) => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      if ((time.length === 5 && time.includes(":")) || !time) {
        invalidTime = false;
      } else {
        invalidTime = true;
      }
    }, 600);
  };

  // After Svelte has created the webpage, initialize the peaks.js waveform player and all of its event-handlers. Also make sure the segments variable gets updated whenever a user manipulates the waveform player
  onMount(() => {
    const options = {
      container: document.getElementById("waveform-container"),
      mediaElement: document.getElementById("audio"),
      webAudio: {
        audioContext: new AudioContext(),
      },
      keyboard: false,
      pointMarkerColor: "#006eb0",
      showPlayheadTime: true,
      inMarkerColor: "#999999",
      outMarkerColor: "#3d3d3d",
    };
    // Initialize peaks.js UI
    peaksInstance = Peaks.init(options, (err) => {
      if (err) {
        console.error(err);
      } else {
        peaksLoading = false;
        console.log("Peaks instance ready");
        segments = peaksInstance.segments.getSegments();
      }
    });
    // Add some built-in event handlers for mouse events for segments
    peaksInstance.on("segments.mouseleave", (segment) => {
      segments = peaksInstance.segments.getSegments();
    });
    peaksInstance.on("segments.click", (segment) => {
      segments = peaksInstance.segments.getSegments();
    });
    peaksInstance.on("segments.dragged", (segment) => {
      segments = peaksInstance.segments.getSegments();
    });
  });

  // Reactive listener that adds in an example tag when users reach step 4 of the tutorial
  $: {
    if (hasTutorial && $userStore.tutorialStep === 4 && segments.length === 1) {
      // Add correct example segment
      peaksInstance.segments.add({
        startTime: 7.4,
        endTime: 21,
        labelText: `Thought ${(segmentPrevMax + 1).toString()}`,
        editable: true,
      });

      // Adjust first tag user made so it doesn't mess up their quiz
      const seg1 = peaksInstance.segments.getSegments()[0];
      seg1.update({ startTime: 1.9, endTime: 7.39 });

      peaksInstance.player.seek(7.4);
      segments = peaksInstance.segments.getSegments();
      segmentPrevMax += 1;
    } else if (hasTutorial && $userStore.tutorialStep === 2) {
      peaksInstance.player.seek(0);
    }
  }

  // General purpose function to call event dispatcher if this component knows theres a tutorial component it should be working in tandem with
  const communicateData = (evName) => {
    if (hasTutorial) {
      if (evName === "updateSegmentsCount") {
        dispatch("updateSegmentsCount", {
          numSegments: segments.length,
          moveForward: $userStore.tutorialStep === 2,
        });
      } else if (evName === "quizAttempt") {
        dispatch("quizAttempt");
      } else if (evName === "finished") {
        dispatch("readyForExperiment");
      }
    }
  };

  // We have to strip-out the extra properties that segment objects have (e.g. like waveform color) because firebase doesn't like that. Plus we only care about start and end times
  const parseThoughts = () => {
    const toSave = {};
    segments.forEach((obj) => {
      toSave[obj._id.replace(/\./g, "_")] = {
        startTime: obj._startTime,
        endTime: obj._endTime,
      };
    });
    return toSave;
  };

  // Grab the start and end time for each thought and save them into firebase
  const finish = async () => {
    if (hasTutorial) {
      communicateData("finished");
    } else {
      // Create a dictionary of data to save with the key being the current filename, e.g. 's07_TamyTaylor.wav' and the value being a dict with key:vals for each rating made by the user (clarity, confidence, etc) as well as attributes of the file. A special key called 'thoughts' contains the data of interest which is itself a dict of the thoughts for this recording.
      const toSave = parseThoughts();
      $userStore["trials"][fileName] = {
        subject: subjectId,
        character: character.slice(0, character.length - 4),
        clarity,
        confidence,
        recordingLength: time,
        thoughts: toSave,
        submitTime: serverTime,
      };
      $userStore.currentTrial += 1;
      await updateUser($userStore);
      await updateAudioFileResponseCount(fileName);
      peaksInstance.destroy();
      dispatch("next");
    }
  };

  // Check the user tags are close enough the correct tags
  const verifyTags = async () => {
    // const nearestValue = (arr, val) =>
    //   arr.reduce(
    //     (p, n) => (Math.abs(p) > Math.abs(n - val) ? n - val : p),
    //     Infinity
    //   ) + val;
    const rows = document.getElementsByClassName("table-row");
    const check = [];
    let startMatch;
    let endMatch;
    const correctStartTimes = quizAnswers.map((obj) => obj.startTime);
    const correctEndTimes = quizAnswers.map((obj) => obj.endTime);
    // Only check the 3rd and 4th entries since we gave them the first 2
    for (const [i, obj] of segments.entries()) {
      // Check if their start and end times are within the range we expect
      if (i > 1) {
        let minStart = correctStartTimes[i] - expConfig.quizAnswerBuffer;
        let maxStart = correctStartTimes[i] + expConfig.quizAnswerBuffer;
        let minEnd = correctEndTimes[i] - expConfig.quizAnswerBuffer;
        let maxEnd = correctEndTimes[i] + expConfig.quizAnswerBuffer;

        startMatch = minStart <= obj.startTime && obj.startTime <= maxStart;
        startMatch ? null : (rows[i].children[1].style.color = "red");
        endMatch = minEnd <= obj.endTime && obj.endTime <= maxEnd;
        endMatch ? null : (rows[i].children[2].style.color = "red");
        // match =
        //   nearestValue(correctStartTimes, obj.startTime) ===
        //     correctStartTimes[i] &&
        //   nearestValue(correctEndTimes, obj.endTime) === correctEndTimes[i];
        check.push(startMatch && endMatch);
      }
    }
    const allCorrect = check.every((e) => e);
    $userStore.quizPassed = allCorrect;
    $userStore.quizAttempts += 1;
    // Store quiz data
    // For some reason adding submitTime: serverTime like for real trials just writes a null value for the quiz data. So ommitting it for now because we can approximate the quiz duration based on the quiz_start and quiz_end fields
    const toSave = parseThoughts();
    $userStore["trials"][`quiz_${$userStore.quizAttempts}`] = {
      thoughts: toSave,
    };
    await updateUser($userStore);
  };

  // Let the user submit their thought tags
  const submitTags = async () => {
    if (!segments || (segments && segments.length <= 2)) {
      alert("Please tag a few more thoughts");
    } else if (!audioFinished && !hasTutorial) {
      alert(
        "Please listen to the ENTIRE audio recording before submitting your tags"
      );
    } else if (hasTutorial) {
      // check tutorial thoughts
      if (segments.length < 4) {
        alert(
          "Please make sure at least 4 total thoughts have been tagged (including the examples) to submit your answers"
        );
      } else {
        await verifyTags();
        communicateData("quizAttempt");
        rate = $userStore.quizPassed;
      }
    } else {
      rate = !rate;
    }
  };

  // Check for overlapping segments
  function isSegmentOverlapping() {
    const start = peaksInstance.player.getCurrentTime();
    const end = start + 5;
    for (const s of segments) {
      if (start <= s.endTime && end >= s.startTime) {
        return true;
      }
    }
  }

  // Store a new segment on button click
  function addSegment() {
    // Prevent overlapping tags
    if (isSegmentOverlapping()) {
      alert(
        "The Thought you're trying to tag overlaps with an existing Thought. Try moving the position marker outside the start and stop times of the existing Thought (colored region in the bottom waveform) or edit/delete the previous Thought to continue."
      );
      return;
    }
    peaksInstance.segments.add({
      startTime: peaksInstance.player.getCurrentTime(),
      endTime: peaksInstance.player.getCurrentTime() + 5,
      labelText: `Thought ${(segmentPrevMax + 1).toString()}`,
      editable: true,
    });
    // Move the player to the end of the current segment to prevent overlapping segments
    peaksInstance.player.seek(peaksInstance.player.getCurrentTime() + 5);
    // Update the variable that stores all the segments for dynamic rendering
    segments = peaksInstance.segments.getSegments();
    segmentPrevMax += 1;
    if (DEV_MODE) {
      console.log(segments);
      console.log(segmentPrevMax);
    }
    communicateData("updateSegmentsCount");
  }

  // Select a segment based on a table row that get clicked
  function selectSegment(ev) {
    // Get all rows
    const rows = document.getElementsByClassName("table-row");
    // Get click row
    const row = ev.target.parentNode;
    // Save the segment id
    selectedSegmentId =
      parseInt(row.querySelector("td.segment-id").innerText, 10) - 1;
    selectedSegmentId = `peaks.segment.${selectedSegmentId.toString()}`;
    const segment = peaksInstance.segments.getSegment(selectedSegmentId);
    // If clicked row already has class unselected it and all other rows
    if (row.className === "table-row is-selected") {
      for (const r of rows) {
        r.className = "table-row";
      }
      rowSelected = false;
      // Seek to the start of that segment
      peaksInstance.player.seek(segment.endTime);
    } else {
      // Otherwise unselect everything else first then select this one
      for (const r of rows) {
        r.className = "table-row";
      }
      row.className += " is-selected";
      rowSelected = true;
      // Seek to the start of that segment
      peaksInstance.player.seek(segment.startTime);
    }
  }

  // Play a selected segment on button click
  function playSegment() {
    const segment = peaksInstance.segments.getSegment(selectedSegmentId);
    peaksInstance.player.playSegment(segment);
  }

  // Delete a selected segment on button click
  function deleteSegment() {
    peaksInstance.segments.removeById(selectedSegmentId);
    // Clear selection from all other rows and hide button
    const rows = document.getElementsByClassName("table-row");
    for (const r of rows) {
      r.className = "table-row";
    }
    rowSelected = false;
    segments = peaksInstance.segments.getSegments();
    if (DEV_MODE) {
      console.log(segments);
      console.log(segmentPrevMax);
    }
    communicateData("updateSegmentsCount");
  }
</script>

<div
  class="container is-fluid"
  class:blur={hasTutorial &&
    ($userStore.tutorialStep === 0 ||
      $userStore.quizState === "fail" ||
      $userStore.quizState === "readyForExperiment")}
>
  <!-- Title + Waveform display row -->
  <div class="columns is-centered" id="row-title-waveform">
    <div class="column is-full has-text-centered">
      {#if hasTutorial}
        <h1 class="title">Example Recording</h1>
      {:else}
        <h1 class="title">Recording #{$userStore.currentTrial}</h1>
      {/if}
      {#if peaksLoading}
        <h3 class="title is-3">Loading audio...</h3>
        <button class="button is-white is-loading loading-button" disabled />
      {/if}
      <div
        id="waveform-container"
        class:blur={hasTutorial && $userStore.tutorialStep < 1}
        class={hasTutorial && $userStore.tutorialStep === 1
          ? "animated flash slower repeat-2"
          : ""}
      />
    </div>
  </div>
  <!-- Controls + Button row -->
  <div class="columns is-centered" id="row-controls-buttons">
    <div class="column is-full" id="playback-controls-info-column">
      <!-- Nested row with playback controls on left and buttons on right -->
      <div class="columns">
        <div class="column is-narrow">
          <div class="columns is-gapless is-mobile">
            <div class="column is-narrow">
              <audio
                id="audio"
                controls="controls"
                controlslist="nodownload"
                class={hasTutorial && $userStore.tutorialStep === 1
                  ? "animated flash slower repeat-2"
                  : ""}
                on:ended={() => (audioFinished = true)}
              >
                <source {src} type="audio/wav" />
                Your browser does not support the audio element.
              </audio>
            </div>
            <div
              class={hasTutorial && $userStore.tutorialStep === 5
                ? "column animated shake delay-2s"
                : "column"}
            >
              {#if hasTutorial}
                <span
                  class="icon is-large"
                  on:click={() => dispatch("toggleTutorial")}
                >
                  <i class="fas fa-question-circle fa-2x fa-fw" />
                </span>
              {/if}
            </div>
          </div>
        </div>
        <div class="column">
          {#if rate}
            <button
              class={hasTutorial
                ? "button is-primary is-large animated flash slower delay-1s"
                : "button is-primary is-large"}
              on:click={finish}
              disabled={nextTrialActive}
            >
              Next
            </button>
          {:else}
            <div class="columns is-gapless">
              <div class="column is-narrow">
                <div class="columns button-row">
                  <div class="column button-col">
                    <button
                      class={hasTutorial && $userStore.tutorialStep === 2
                        ? "button is-primary is-large animated flash slower repeat-2 delay-1s"
                        : "button is-primary is-large"}
                      class:blur={hasTutorial && $userStore.tutorialStep < 2}
                      class:is-invisible={hasTutorial && segments.length === 4}
                      on:click={addSegment}
                      disabled={$userStore.tutorialStep === 3 ||
                        $userStore.tutorialStep === 4}
                    >
                      Tag
                    </button>
                    <button
                      class="button is-info is-large"
                      class:blur={hasTutorial && $userStore.tutorialStep < 2}
                      disabled={(!hasTutorial && ratingActive) ||
                        (hasTutorial &&
                          (ratingActive ||
                            $userStore.tutorialStep === 3 ||
                            $userStore.tutorialStep === 4))}
                      on:click={submitTags}
                    >
                      Done
                    </button>
                  </div>
                </div>
                <div class="columns">
                  <div class="column">
                    <p
                      class="is-size-7"
                      class:is-invisible={segments.length === 0}
                    >
                      Select a row below to edit a Thought
                    </p>
                  </div>
                </div>
              </div>
              <div class="column">
                <button
                  class="button is-success is-large"
                  class:is-invisible={!rowSelected}
                  on:click={playSegment}
                >
                  Play
                </button>
                <!-- Disable delete button during tutorial and for first 2 rows of the quiz which
                are examples we provide -->
                <button
                  class="button is-danger is-large"
                  class:is-invisible={!rowSelected}
                  on:click={deleteSegment}
                  disabled={(hasTutorial && $userStore.tutorialStep < 5) ||
                    (hasTutorial && selectedSegmentId === "peaks.segment.0") ||
                    (hasTutorial && selectedSegmentId === "peaks.segment.1")}
                >
                  Delete
                </button>
              </div>
            </div>
          {/if}
        </div>
      </div>
    </div>
  </div>
  {#if rate}
    <!-- Rating row (only if table not displayed) -->
    <div class="columns is-centered">
      <div class="column is-4-desktop is-3-fullhd has-text-centered">
        <div class="field">
          <!-- svelte-ignore a11y-label-has-associated-control -->
          <label class="label has-text-weight-normal is-size-5">
            If the speaker did not talk for the full 2 min how long did they
            speak for?
          </label>
          <div class="control">
            <input
              class={invalidTime
                ? "input age-input is-danger"
                : "input age-input"}
              type="text"
              bind:value={time}
              on:keyup={(ev) => debounce(ev.target.value)}
              placeholder="Please enter a timestamp like MM:SS"
            />
          </div>
          {#if invalidTime}
            <p class="help is-danger">
              Invalid timestamp. Please use MM:SS format.
            </p>
          {/if}
        </div>
      </div>
      <div class="column is-4-desktop is-3-fullhd has-text-centered">
        <p class="has-text-centered is-size-5">
          How clear was the quality of the recording?
        </p>
        <input
          step="1"
          min="0"
          max="100"
          type="range"
          bind:value={clarity}
          on:click|once={() => (clarityRated = true)}
        />
        <div class="columns is-mobile is-centered">
          <div class="column has-text-left">
            <p class="subtitle is-size-6">Uninterpretable</p>
          </div>
          <div class="column has-text-right">
            <p class="subtitle is-size-6">Perfect</p>
          </div>
        </div>
      </div>
      <div class="column is-4-desktop is-3-fullhd has-text-centered">
        <p class="has-text-centered is-size-5">
          How easy was it to tag different thoughts?
        </p>
        <input
          step="1"
          min="0"
          max="100"
          type="range"
          bind:value={confidence}
          on:click|once={() => (confidenceRated = true)}
        />
        <div class="columns is-mobile is-centered">
          <div class="column has-text-left">
            <p class="subtitle is-size-6">Impossible</p>
          </div>
          <div class="column has-text-right">
            <p class="subtitle is-size-6">Effortless</p>
          </div>
        </div>
      </div>
    </div>
  {:else}
    <!-- Table row only if rating not displayed -->
    <div
      class="columns is-centered"
      class:blur={hasTutorial && $userStore.tutorialStep < 2}
    >
      <div class="column is-full has-text-centered">
        {#if segments && segments.length}
          <div class="table-container">
            <table class="table is-hoverable">
              <thead>
                <tr>
                  <th>Thought ID</th>
                  <th>Start time</th>
                  <th>End time</th>
                </tr>
              </thead>
              <tbody>
                {#each segments as segment, i (segment.id)}
                  <tr on:click={selectSegment} class="table-row">
                    <td type="text" class="segment-id"
                      >{parseInt(segment.id.split(".").slice(-1)[0], 10) +
                        1}</td
                    >
                    <td type="number">{segment.startTime.toFixed(2)}</td>
                    <td type="number">{segment.endTime.toFixed(2)}</td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        {:else}
          <h2 class="title is-4">No Thoughts Tagged</h2>
        {/if}
      </div>
    </div>
  {/if}
</div>

<style>
  .table {
    margin-left: auto;
    margin-right: auto;
  }

  .table-container {
    min-height: 50vh;
  }

  .loading-button {
    font-size: 4.5rem !important;
  }

  .blur {
    -webkit-filter: blur(5px);
    filter: blur(5px);
    pointer-events: none;
  }

  .button-row {
    margin-bottom: 0 !important;
  }
  .button-col {
    padding-bottom: 0 !important;
  }

  /* .is-wrong {
    color: #f14668 !important;
  } */
</style>
