<script>
  import { ViewContainer } from '@marcellejs/design-system';

  export let labels = [];
  export let onSelect;

  let selected = labels[0];

  function select(label) {
    selected = label;
    onSelect(label);
  }
</script>

<ViewContainer title="Instance label">
  <div class="row">
    {#each labels as lab}
      <button
        class:selected={lab === selected}
        on:click={() => select(lab)}
      >
        {lab}
      </button>
    {/each}
  </div>
</ViewContainer>

<style>
  .row {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }

  button {
    padding: 8px 12px;
    border-radius: 10px;
    border: 1px solid #ccc;
    background: white;
    cursor: pointer;
    font-size: 0.9rem;
  }

  button.selected {
    background: #2563eb;
    color: white;
    border-color: #2563eb;
  }
</style>