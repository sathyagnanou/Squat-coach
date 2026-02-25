import { Component } from '@marcellejs/core';
import View from './repReviewer.view.svelte';

export class RepReviewer extends Component {
  constructor({ queueSet, trainingSet, classLabels = [], take = 30 }) {
    super();
    this.title = 'Rep Reviewer (Uncertainty Sampling)';
    this.queueSet = queueSet;
    this.trainingSet = trainingSet;
    this.classLabels = classLabels;
    this.take = take;
  }

  mount(target) {
    const t = target || document.querySelector(`#${this.id}`);
    if (!t) return;
    this.destroy();

    this.$$.app = new View({
      target: t,
      props: {
        title: this.title,
        queueSet: this.queueSet,
        trainingSet: this.trainingSet,
        classLabels: this.classLabels,
        take: this.take,
      },
    });
  }
}

// Factory fn (Marcelle style)
export function repReviewer(opts) {
  return new RepReviewer(opts);
}
