<script>
  import { createEventDispatcher } from "svelte";
  import Button from "../components/Button.svelte";
  let submitted = false;
  let dispatchEvent = createEventDispatcher();

  const submitDebrief = () => {
    dispatchEvent("finished");
  };
</script>

<div class="w-full max-w-md mb-6">
  <div class="text-center">
    <h1 class="mb-4 text-2xl">Thanks for participating!</h1>
  </div>
  {#if !submitted}
    <form
      class="px-8 pt-6 pb-8 mb-4 bg-white rounded shadow-md"
      on:submit|preventDefault={submitDebrief}
    >
      <div class="mb-4">
        <label class="block mb-2 text-sm font-bold text-gray-700" for="name">
          Name
        </label>
        <input
          class="w-full px-3 py-2 leading-tight text-gray-700 border rounded shadow appearance-none focus:outline-none focus:shadow-outline"
          id="name"
          type="text"
          name="name"
          placeholder="Type your FULL name (including middle name)"
        />
      </div>
      <div class="mb-4">
        <label class="block mb-2 text-sm font-bold text-gray-700" for="age">
          Age
        </label>
        <input
          class="w-full px-3 py-2 leading-tight text-gray-700 border rounded shadow appearance-none focus:outline-none focus:shadow-outline"
          id="age"
          type="text"
          name="age"
          placeholder="Type your age in years"
        />
      </div>
      <div class="mb-4">
        <label class="block mb-2 text-sm font-bold text-gray-700" for="birth">
          Birth Date
        </label>
        <input
          type="date"
          name="birth"
          id="birth"
          min="1988-01-01"
          class="w-full px-3 py-2 leading-tight text-gray-700 border rounded shadow appearance-none focus:outline-none focus:shadow-outline"
        />
      </div>
      <div class="mb-4">
        <label
          for="birthCity"
          class="block mb-2 text-sm font-bold text-gray-700"
        >
          Birth Location
        </label>
        <input
          class="w-full px-3 py-2 leading-tight text-gray-700 border rounded shadow appearance-none focus:outline-none focus:shadow-outline"
          id="birthCity"
          type="text"
          name="birthCity"
          placeholder="City, state, country (like in passport/visa)"
        />
      </div>
      <div class="mb-4">
        <label
          class="block mb-2 text-sm font-bold text-gray-700"
          for="nativeLang"
        >
          Native Language
        </label>
        <input
          class="w-full px-3 py-2 leading-tight text-gray-700 border rounded shadow appearance-none focus:outline-none focus:shadow-outline"
          id="nativeLang"
          type="text"
          name="nativeLang"
          placeholder="What is your native language"
        />
      </div>
      <div class="mb-4">
        <label class="block mb-2 text-sm font-bold text-gray-700" for="sex">
          Gender
        </label>
        <select
          id="sex"
          name="sex"
          class="w-full px-3 py-2 leading-tight border rounded shadow focus:outline-none focus:shadow-outline"
        >
          <option value="">--gender assigned at birth--</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
          <option value="other">Other</option>
        </select>
      </div>
      <div class="mb-4">
        <label for="race" class="mb-2 text-sm font-bold text-gray-700"
          >Race</label
        >
        <select
          id="race"
          name="race"
          class="w-full px-3 py-2 leading-tight border rounded shadow focus:outline-none focus:shadow-outline"
        >
          <option value="">--choose your race--</option>
          <option value="Asian">Asian / Asian-American</option>
          <option value="Black">Black / African-American</option>
          <option value="Native-American"
            >Native-American / Alaskan-Native</option
          >
          <option value="Pacific-Islander"
            >Pacific-Islander / Native-Hawaiian</option
          >
          <option value="White">White</option>
          <option value="Other">Other</option>
        </select>
      </div>
      <div class="mb-4">
        <label
          class="block mb-2 text-sm font-bold text-gray-700"
          for="ethnicity"
        >
          Ethnicity
        </label>
        <select
          id="ethnicity"
          name="ethnicity"
          class="w-full px-3 py-2 leading-tight border rounded shadow focus:outline-none focus:shadow-outline"
        >
          <option value="">--choose your ethnicity--</option>
          <option value="Hispanic">Hispanic</option>
          <option value="Not-Hispanic">Not Hispanic</option>
        </select>
      </div>
      <div class="mb-4">
        <label class="block mb-2 text-sm font-bold text-gray-700" for="handed">
          Handedness
        </label>
        <select
          id="handed"
          name="handed"
          class="w-full px-3 py-2 leading-tight border rounded shadow focus:outline-none focus:shadow-outline"
        >
          <option value="">--choose your dominant hand--</option>
          <option value="Right">Right-Handed</option>
          <option value="Left">Left-Handed</option>
        </select>
      </div>
      <div class="text-center">
        <Button type={"submit"} color={"blue"}>Submit</Button>
      </div>
    </form>
  {/if}
</div>
