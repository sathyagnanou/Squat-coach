import { Component } from '@marcellejs/core';
import View from './evalResults.view.svelte';

export class EvalResults extends Component {
  constructor(store) {
    super();
    this.title = 'Evaluation results';
    this.store = store;
  }

  mount(target) {
    const t = target || document.querySelector(`#${this.id}`);
    if (!t) return;
    this.destroy();

    this.$$.app = new View({
      target: t,
      props: {
        resultsStore: this.store,
      },
    });
  }
}

export function evalResults(store) {
  return new EvalResults(store);
}
