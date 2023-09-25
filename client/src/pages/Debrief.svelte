<!--  This is the debrief page in which collect any post survey questions. There's a single button that saves reponses to firebase and then tells Mturk we're done. -->
<script>
  // IMPORTS
  // -------------------------------------------
  import {
    db,
    params,
    serverTime,
    userStore,
    updateUser,
    expConfig,
  } from "../utils.js";

  import { createEventDispatcher } from "svelte";
  // COMPONENT VARIABLES
  // -------------------------------------------
  let age = "";
  let feedback = "";
  let sex = "";
  let ethnicity = "";
  let race = [];
  const raceOptions = [
    "Asian / Asian-American",
    "Black / African-American",
    "Native-American / Alaskan-Native",
    "Pacific-Islander / Native-Hawaiian",
    "White / Caucasian",
    "Other / Unknown",
  ];
  let nativeLang = "";
  let birth = "";
  let handed = "";
  const dispatch = createEventDispatcher();

  // COMPONENT LOGIC
  // -------------------------------------------
  // Write the debrief form data to firebase and then notify App.svelte we're ready to submit to mturk. We don't do the submission here for 2 reasons that cause a race condition:
  // 1) Submitting an external form is analgous to navigating away from the current URL which means that no further component logic (e.g. writing to firebase) can occur after the form is submitted. This make it impossible to write to firebase that the user has completed the HIT so they can't participate again in the future.
  // 2) Updating the user status in firebase changes the app state instantly because we want to prevent repeat participation. But that means this component gets destroyed and thus the form DOM element gets destroyed and we can't submit anything. The DOM element must exist in some form to make submission possible.
  // The race condition is basically: if we submit first, we can't update firebase to prevent repeat participantion; if we update firebase we lose the form and can't submit
  // Solution: Write the debrief data to firebase, but don't update the app state or submit anything to mturk. Instead dispatch a notification to App.svelte which will handle it in submitHIT(). See that function for more details.
  const submitDemographics = async () => {
    $userStore.age = age;
    $userStore.sex = sex;
    $userStore.ethnicity = ethnicity;
    $userStore.race = race;
    $userStore.nativeLang = nativeLang;
    $userStore.birth = birth;
    $userStore.handed = handed;
    $userStore.feedback = feedback;
    await updateUser($userStore);
    dispatch("finished");
  };
</script>

<div class="container">
  <div class="columns is-centered">
    <div class="column is-three-quarters">
      <p class="title is-3 has-text-centered is-spaced">
        Thank You For Participating!
      </p>
      <p class="subtitle is-5 has-text-centered">
        <strong
          >You will earn a total of ${expConfig.basePayment}/hr for your
          completion of this study.</strong
        > <br /><br />
        Upon completing this page, you will fill out a series of questions about
        the show and your group members.
      </p>
      <p class="is-6 has-text-centered">
        <em>All questions are optional</em>
      </p>
      <form name="debrief" id="form">
        <div class="field is-horizontal">
          <div class="field-label is-normal">
            <!-- svelte-ignore a11y-label-has-associated-control -->
            <label class="label">Age</label>
          </div>
          <div class="field-body is-narrow">
            <div class="field">
              <p class="control">
                <input class="input age-input" type="text" bind:value={age} />
              </p>
            </div>
          </div>
        </div>
        <div class="field is-horizontal">
          <div class="field-label">
            <!-- TODO: try solution from https://github.com/sveltejs/svelte/issues/5300 -->
            <!-- but for now we ignore warnings ... [04.01.22] -->
            <!-- svelte-ignore a11y-label-has-associated-control -->
            <label class="label">Gender</label>
          </div>
          <div class="field-body">
            <div class="field is-narrow">
              <div class="control">
                <label class="radio">
                  <input type="radio" bind:group={sex} value={"male"} />
                  Male
                </label>
                <label class="radio">
                  <input type="radio" bind:group={sex} value={"female"} />
                  Female
                </label>
                <label class="radio">
                  <input type="radio" bind:group={sex} value={"other"} />
                  Other
                </label>
              </div>
            </div>
          </div>
        </div>
        <div class="field is-horizontal">
          <div class="field-label">
            <!-- svelte-ignore a11y-label-has-associated-control -->
            <label class="label">Handedness</label>
          </div>
          <div class="field-body">
            <div class="field is-narrow">
              <div class="control">
                <label class="radio">
                  <input type="radio" bind:group={handed} value={"left"} />
                  Left Handed
                </label>
                <label class="radio">
                  <input type="radio" bind:group={handed} value={"right"} />
                  Right Handed
                </label>
              </div>
            </div>
          </div>
        </div>
        <div class="field is-horizontal">
          <div class="field-label">
            <!-- svelte-ignore a11y-label-has-associated-control -->
            <label class="label">Ethnicity</label>
          </div>
          <div class="field-body">
            <div class="field is-narrow">
              <div class="control">
                <label class="radio">
                  <input
                    type="radio"
                    bind:group={ethnicity}
                    value={"hispanic"}
                  />
                  Hispanic
                </label>
                <label class="radio">
                  <input
                    type="radio"
                    bind:group={ethnicity}
                    value={"not_hispanic"}
                  />
                  Not Hispanic
                </label>
              </div>
            </div>
          </div>
        </div>
        <div class="field is-horizontal">
          <div class="field-label is-normal">
            <!-- svelte-ignore a11y-label-has-associated-control -->
            <label class="label">Race</label>
          </div>
          <div class="field-body is-narrow">
            <div class="field">
              <div class="control">
                <div class="select is-multiple">
                  <select multiple bind:value={race}>
                    {#each raceOptions as raceOption}
                      <option value={raceOption}>{raceOption}</option>
                    {/each}
                  </select>
                </div>
              </div>
              <p class="help">Cmd/Ctrl+Click to select multiple</p>
            </div>
          </div>
        </div>
        <div class="field is-horizontal">
          <div class="field-label is-normal">
            <!-- svelte-ignore a11y-label-has-associated-control -->
            <label class="label">Native Language</label>
          </div>
          <div class="field-body is-narrow">
            <div class="field">
              <p class="control">
                <input
                  class="input lang-input"
                  type="text"
                  bind:value={nativeLang}
                />
              </p>
            </div>
          </div>
        </div>
        <div class="field is-horizontal">
          <div class="field-label is-normal">
            <!-- svelte-ignore a11y-label-has-associated-control -->
            <label class="label">Birth Location</label>
          </div>
          <div class="field-body is-narrow">
            <div class="field">
              <p class="control">
                <input
                  class="input lang-input"
                  type="text"
                  bind:value={birth}
                  placeholder="City, State, Country (like in visa/passport)"
                />
              </p>
            </div>
          </div>
        </div>
        <div class="field is-horizontal">
          <div class="field-label is-normal">
            <!-- svelte-ignore a11y-label-has-associated-control -->
            <label class="label">Feedback</label>
          </div>
          <div class="field-body">
            <div class="field">
              <div class="control">
                <textarea
                  class="textarea textarea-feedback"
                  bind:value={feedback}
                  placeholder="Thoughts or suggestions about this study"
                />
              </div>
            </div>
          </div>
        </div>
        <div class="field is-horizontal">
          <div class="field-label">
            <!-- Left empty for spacing -->
          </div>
          <div class="field-body">
            <div class="field">
              <div class="control">
                <button
                  class="button is-success is-large"
                  on:click|preventDefault={submitDemographics}
                  >Continue to last series of questionnaires</button
                >
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  </div>
</div>

<style>
  .age-input {
    width: 3rem;
  }
  .lang-input {
    width: 20rem;
  }
  .textarea-feedback {
    min-width: 80%;
    max-width: 80%;
  }
</style>
