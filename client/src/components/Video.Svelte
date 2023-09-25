<script>
  // IMPORTS
  // -------------------------------------------
  import { beforeUpdate, afterUpdate } from 'svelte';

  // INPUTS FROM PARENT COMPONENT
  // -------------------------------------------

  // COMPONENT VARIABLES
  // -------------------------------------------
  // eslint-disable-next-line prefer-const
  let div;
  let autoscroll;
  let messages = [];

  // COMPONENT LOGIC
  // -------------------------------------------
  beforeUpdate(() => {
    autoscroll =
      div && div.offsetHeight + div.scrollTop > div.scrollHeight - 20;
  });

  afterUpdate(() => {
    if (autoscroll) div.scrollTo(0, div.scrollHeight);
  });

  export function handleKeydown(event) {
    if (event.key === 'Enter') {
      const msg_text = event.target.value;
      if (!msg_text) return;

      messages = messages.concat({
        author: 'user',
        absolute_timestamp: new Date(),
        // TODO: add relative_timestamp that references timestamp in video
        msg_text,
      });

      event.target.value = '';
    }
  }
</script>

<style>
  .chat {
    display: flex;
    flex-direction: column;
    height: 95%;
    /* TODO: make width adaptive to window */
    width: 300px;
    max-width: 600px;
    position: fixed;
    right: 5em;
  }

  .scrollable {
    flex: 1 1 auto;
    border-top: 1px solid #eee;
    margin: 0 0 0.5em 0;
    overflow-y: auto;
  }

  article {
    margin: 0.5em 0;
  }

  .user {
    text-align: right;
  }

  span {
    padding: 0.5em 1em;
    display: inline-block;
  }

  .user span {
    background-color: #dca7e5;
    color: white;
    border-radius: 1em 1em 0 1em;
  }
</style>

<div class="chat">
  <div class="scrollable" bind:this={div}>
    {#each messages as message}
      <article class={message.author}>
        <span>{message.msg_text}</span>
      </article>
    {/each}
  </div>
  <input on:keydown={handleKeydown} />
</div>
