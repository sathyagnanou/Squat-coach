<script>
  import { ViewContainer } from '@marcellejs/design-system';

  export let resultsStore;
  $: results = $resultsStore || { status: 'idle', message: 'Click "Evaluate on TEST set" to run evaluation.' };
</script>

<ViewContainer title="Evaluation results">
  {#if results.status === 'loading'}
    <div class="message loading">{results.message || 'Running evaluation...'}</div>
  {:else if results.status === 'error'}
    <div class="message error">{results.message || 'Evaluation failed.'}</div>
  {:else if results.status === 'done'}
    <div class="results">
      <div class="accuracy">Overall accuracy: <strong>{results.accuracy}%</strong></div>
      <div class="per-class">
        <div class="subtitle">Per-class accuracy:</div>
        {#each Object.entries(results.perClass || {}) as [label, acc]}
          <div class="row">{label}: {acc}</div>
        {/each}
      </div>
      {#if results.confusion && Object.keys(results.confusion).length > 0}
        <div class="confusion">
          <div class="subtitle">Confusion matrix (rows = true, cols = predicted):</div>
          <table>
            <thead>
              <tr>
                <th></th>
                {#each Object.keys(results.confusion) as pred}
                  <th>{pred}</th>
                {/each}
              </tr>
            </thead>
            <tbody>
              {#each Object.entries(results.confusion) as [trueLabel, row]}
                <tr>
                  <th>{trueLabel}</th>
                  {#each Object.values(row) as cell}
                    <td>{cell}</td>
                  {/each}
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {/if}
    </div>
  {:else}
    <div class="message idle">{results.message}</div>
  {/if}
</ViewContainer>

<style>
  .message {
    padding: 12px;
    border-radius: 8px;
    font-size: 0.95rem;
  }
  .message.idle { color: #666; }
  .message.loading { background: #f0f7ff; color: #2563eb; }
  .message.error { background: #fef2f2; color: #dc2626; }
  .results { display: flex; flex-direction: column; gap: 12px; }
  .accuracy { font-size: 1.1rem; }
  .subtitle { font-weight: 600; margin-bottom: 4px; font-size: 0.9rem; }
  .per-class .row { font-size: 0.9rem; padding: 2px 0; }
  .confusion table { border-collapse: collapse; font-size: 0.85rem; }
  .confusion th, .confusion td { border: 1px solid #ddd; padding: 6px 10px; text-align: center; }
  .confusion th { background: #f5f5f5; }
</style>
