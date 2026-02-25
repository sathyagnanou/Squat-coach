<script>
  import { ViewContainer } from '@marcellejs/design-system';
  import { onMount } from 'svelte';

  export let title;
  export let queueSet;
  export let trainingSet;
  export let classLabels = [];
  export let take = 30;

  let items = [];
  let loading = false;
  let message = '';

  async function refresh() {
    loading = true;
    message = '';
    await queueSet.ready;

    // Get recent queue items that are still TODO
    const arr = await queueSet.items().query({ status: 'todo' }).take(200).toArray();

    // Sort by uncertainty DESC, then most recent
    arr.sort((a, b) => {
      const ua = typeof a.uncertainty === 'number' ? a.uncertainty : 1;
      const ub = typeof b.uncertainty === 'number' ? b.uncertainty : 1;
      if (ub !== ua) return ub - ua;
      return (b.createdAt || 0) - (a.createdAt || 0);
    });

    items = arr.slice(0, take);
    loading = false;
  }

  async function labelItem(instance, y) {
    if (!instance?.x) return;

    // 1) Add labeled sample to TRAINING set
    await trainingSet.create({
      x: instance.x,
      y,
      source: 'active-learning-review',
      fromQueueId: instance._id,
      predLabel: instance.predLabel,
      maxConf: instance.maxConf,
      uncertainty: instance.uncertainty,
      createdAt: Date.now(),
    });

    // 2) Mark queue item as done (update)
    // If your Marcelle server doesn't allow update, tell me and I'll give a fallback strategy.
    await queueSet.update(instance._id, { status: 'done', reviewedAt: Date.now(), finalLabel: y });

    message = `✅ Labeled 1 item as "${y}" and added to training set.`;
    await refresh();
  }

  onMount(() => {
    refresh();
  });
</script>

<ViewContainer {title}>
  <div class="topbar">
    <button class="btn" on:click={refresh} disabled={loading}>
      {loading ? 'Loading…' : '🔄 Refresh'}
    </button>
    <div class="hint">
      Showing <b>{items.length}</b> most uncertain queue items (status: todo)
    </div>
  </div>

  {#if message}
    <div class="message">{message}</div>
  {/if}

  <div class="grid">
    {#each items as instance (instance._id)}
      <div class="card">
        <div class="meta">
          <div><b>Pred:</b> {instance.predLabel || 'unknown'}</div>
          <div><b>Conf:</b> {typeof instance.maxConf === 'number' ? instance.maxConf.toFixed(2) : '—'}</div>
          <div><b>Unc:</b> {typeof instance.uncertainty === 'number' ? instance.uncertainty.toFixed(2) : '—'}</div>
        </div>

        <img class="img" src={instance.thumbnail} alt="rep frame" />

        <div class="actions">
          {#each classLabels as lab}
            <button class="labbtn" on:click={() => labelItem(instance, lab)}>
              {lab}
            </button>
          {/each}
        </div>
      </div>
    {/each}
  </div>
</ViewContainer>

<style>
  .topbar {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 10px;
  }

  .btn {
    padding: 8px 10px;
    border-radius: 8px;
    border: 1px solid #ddd;
    cursor: pointer;
  }

  .hint {
    opacity: 0.8;
    font-size: 0.95rem;
  }

  .message {
    margin: 8px 0 12px 0;
    padding: 10px;
    border-radius: 10px;
    border: 1px solid #d7f5dc;
    background: #f2fff4;
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 12px;
  }

  .card {
    border: 1px solid #eee;
    border-radius: 14px;
    padding: 10px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .meta {
    font-size: 0.9rem;
    opacity: 0.9;
    display: grid;
    gap: 2px;
  }

  .img {
    width: 100%;
    border-radius: 10px;
    border: 1px solid #eee;
  }

  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .labbtn {
    padding: 6px 8px;
    border-radius: 10px;
    border: 1px solid #ddd;
    cursor: pointer;
    font-size: 0.85rem;
  }
</style>
