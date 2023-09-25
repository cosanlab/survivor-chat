<!-- This is the Consent component that will let a user proceed to the tutorial or return the HIT -->
<script>
  // IMPORTS
  // -------------------------------------------
  import { createEventDispatcher } from "svelte";
  import { expConfig } from "../utils.js";

  // COMPONENT VARIABLES
  // -------------------------------------------
  const consent = `We need your consent to proceed. The following material explains this research study. <br><br>
  This project is being conducted by researchers from the department of Psychological and Brain Sciences at
  Dartmouth College, Hanover, NH, USA. This study aims to investigate under which conditions do individuals
  choose to interact with each other as well as understand the nature of the interactions to permit social
  connectedness. <br><br>
  Your participation is voluntary. Participation involves making behavioral judgments about pictures, video/audio clips, and text excerpts
  while simultaneously being able to communicate with other individuals through written communication (e.g., text, emojis).
  You may choose to not answer any or all questions. <br><br>
  
  If you choose to interact with other research participants, please be aware that you will be interacting
  with real human participants. The research team, therefore, cannot control what information other participants
  will choose to share with you. Participation requires that you do not engage in harmful language or communication
  with other participants throughout the experiment. Failure to comply may result in potential loss of compensation 
  or participation in this study. Further, it is recommended that you should not share any identifiable information 
  with other participants.<br><br>
  
  Please be aware that your communication data will be collected and analyzed. Your communication data will also
  be reviewed in real time to be flagged for any potentially harmful content. Your responses will be collected in
  an anonymous fashion such that no identifying information will be stored alongside any responses you make during the task.
  If any identifiable information is shared during communication, it will be removed prior to analysis.
  Identifying information will not be used in any presentation or paper written about this project and such
  presentations will represent the aggregation of data from groups of people. 
  <br><br> <strong>Do you understand and consent to these terms?</strong><br/>
  If so, click the "Accept consent" button below to be taken to the instructions. Otherwise, please return this study.`;

  const dispatch = createEventDispatcher();
</script>

<div class="container">
  <div class="columns is-centered">
    <div class="column is-three-fifths ">
      <div class="card">
        <div class="has-text-centered">
          <h1 class="title is-2 custom-card-title">Consent</h1>
          <hr class="no-space-hr" />
        </div>
        <div class="card-content">
          <div class="content">
            {@html consent}
          </div>
        </div>
        <footer class="card-footer">
          <p class="card-footer-item">
            <button
              class="button is-danger controls"
              on:click={() => dispatch("reject")}
            >
              I do not consent
            </button>
          </p>
          <p class="card-footer-item">
            <button
              class="button is-success controls"
              on:click={() => dispatch("consent")}
            >
              I consent
            </button>
          </p>
        </footer>
      </div>
    </div>
  </div>
</div>

<style>
  .no-space-hr {
    margin: 0;
  }
  .custom-card-title {
    margin-bottom: 2% !important;
    padding-top: 2% !important;
  }
  .controls {
    min-width: 50%;
  }
</style>
