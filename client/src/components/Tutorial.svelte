<!-- This is a Tutorial component that appears like floating modal. It's rendered within Quiz.svelte
and workers in conjunction with ThoughtTagger.svelte  -->
<script>
  // IMPORTS
  // -------------------------------------------
  import { createEventDispatcher } from 'svelte';
  import {
    expConfig,
    db,
    serverTime,
    userStore,
    updateUser,
  } from '../utils.js';

  // INPUTS FROM PARENT COMPONENT
  // -------------------------------------------
  export let modalOpen;
  export let tutorial;
  export let quiz;
  export let numSegments;

  // COMPONENT VARIABLES
  // -------------------------------------------
  let modalTitle;
  let modalContent;
  let q;

  // Reactively determine what to show in the modal depending on whether the tutorial is still going or what state of the quiz we're in
  $: if (!$userStore.tutorialComplete) {
    modalTitle = tutorial[$userStore.tutorialStep].title;
    modalContent = tutorial[$userStore.tutorialStep].content;
  } else {
    [q] = quiz.filter((obj) => obj.state === $userStore.quizState);
    modalTitle = q.title;
    modalContent = q.content;
  }

  let modalXInitial;
  let modalYInitial;
  let modalXCurrent;
  let modalYCurrent;
  let modalXOffset = 0;
  let modalYOffset = 0;
  let dragActive = false;
  // $: down = $userStore.tutorialStep === 1;
  // $: up = $userStore.tutorialStep === 2 || $userStore.quizState === 'pass';
  // $: right = $userStore.tutorialStep === 3 || $userStore.tutorialStep === 1;
  // $: upp = $userStore.tutorialStep === 3;

  const dispatch = createEventDispatcher();

  // COMPONENT LOGIC
  // -------------------------------------------
  // Move backwards through the tutorial pages
  const backward = async () => {
    $userStore.tutorialStep -= 1;
    $userStore.tutorialStep = Math.max($userStore.tutorialStep, 0);
    await updateUser($userStore);
  };

  // Move forwards through the tutorial pages
  const forward = async () => {
    $userStore.tutorialStep = Math.min(
      $userStore.tutorialStep + 1,
      tutorial.length - 1
    );
    // Request a state change to the quiz once they hit the last step of the tutorial. This doesn't provoke a UI change, but lets us log different durations for the tutorial vs the actual quiz
    if (
      $userStore.tutorialStep === 5 &&
      $userStore.currentState === 'tutorial'
    ) {
      dispatch('finishedTutorial');
    }
    await updateUser($userStore);
  };

  // Utility function for better screen position of the tutorial modal
  const setTranslate = (xPos, yPos, el) => {
    el.style.transform = `translate3d(${xPos}px, ${yPos}px, 0)`;
  };

  // Utility function for dragging the tutorial modal
  const dragStart = (ev) => {
    if (ev.target.parentElement.closest('.modal')) {
      modalXInitial = ev.clientX - modalXOffset;
      modalYInitial = ev.clientY - modalYOffset;
      dragActive = true;
    }
  };

  // Utility function for dragging the tutorial modal
  const drag = (ev) => {
    if (dragActive) {
      modalXCurrent = ev.clientX - modalXInitial;
      modalYCurrent = ev.clientY - modalYInitial;
      modalXOffset = modalXCurrent;
      modalYOffset = modalYCurrent;
      const el = document.getElementById('modal');
      setTranslate(modalXCurrent, modalYCurrent, el);
    }
  };

  // Utility function for dragging the tutorial modal
  const dragEnd = (ev) => {
    modalXInitial = modalXCurrent;
    modalYInitial = modalYCurrent;
    dragActive = false;
  };
</script>

<style>
  .modal-card {
    border-radius: 6px;
    box-shadow: 3px 3px 3px rgba(10, 10, 10, 0.1),
      0 0 0 1px rgba(10, 10, 10, 0.1);
    pointer-events: auto;
    top: 25vh;
  }
  .modal {
    pointer-events: none;
  }
  .controls {
    min-width: 50%;
  }
</style>

<div
  class={modalOpen ? 'modal is-active' : 'modal'}
  on:mousedown|preventDefault={dragStart}
  on:mouseup|preventDefault={dragEnd}
  on:mousemove|preventDefault={drag}>
  <div class="modal-card" id="modal">
    <header class="modal-card-head">
      <p class="modal-card-title">{modalTitle}</p>
    </header>
    <section class="modal-card-body">
      {@html modalContent}
      {#if $userStore.quizState === 'attempt'}
        You will only have <strong
          >{expConfig.maxQuizAttempts - $userStore.quizAttempts} more chance(s)
          to identify the correct tags before you forfeit any bonus payments.</strong>
      {/if}
    </section>
    <footer class="modal-card-foot">
      {#if !$userStore.tutorialComplete}
        <p class="card-footer-item">
          {#if $userStore.tutorialStep > 0}
            <button class="button is-link controls" on:click={backward}>
              <span class="icon"> <i class="fas fa-backward" /> </span>
            </button>
          {/if}
        </p>
        <p class="card-footer-item">
          {#if $userStore.tutorialStep === tutorial.length - 1}
            <button
              class="button is-link"
              on:click={() => {
                dispatch('toggleTutorial');
              }}>
              Hide Help
            </button>
          {:else if $userStore.tutorialStep !== 2 || numSegments > 0}
            <button class="button is-link controls" on:click={forward}>
              <span class="icon"> <i class="fas fa-forward" /> </span>
            </button>
          {/if}
        </p>
      {:else if $userStore.quizState === 'readyForExperiment'}
        <p class="card-footer-item">
          <button
            class="button is-warning is-large"
            on:click={() => dispatch('finishedComplete')}>
            Skip bonus work
          </button>
        </p>
        <p class="card-footer-item">
          <button
            class="button is-success is-large"
            on:click={() => dispatch('finishedContinue')}>
            Do bonus work
          </button>
        </p>
      {:else if $userStore.quizState === 'attempt'}
        <p class="card-footer-item">
          <button
            class="button is-link"
            on:click={() => dispatch('toggleTutorial')}>
            Try again
          </button>
        </p>
      {:else if $userStore.quizState === 'pass'}
        <p class="card-footer-item">
          <button
            class="button is-link"
            on:click={() => dispatch('toggleTutorial')}>
            Hide Help
          </button>
        </p>
      {:else if $userStore.quizState === 'fail'}
        <p class="card-footer-item">
          <button
            class="button is-success is-large"
            on:click={() => dispatch('finishedComplete')}>
            Finish
          </button>
        </p>
      {/if}
    </footer>
  </div>
</div>
