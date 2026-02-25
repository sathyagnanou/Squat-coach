import { Component } from '@marcellejs/core';
import View from './label-bar.view.svelte';

export class LabelBar extends Component {
  constructor(labels, onSelect) {
    super();
    this.title = 'Instance label';
    this.labels = labels;
    this.onSelect = onSelect;
  }

  mount(target) {
    const t = target || document.querySelector(`#${this.id}`);
    if (!t) return;
    this.destroy();

    this.$$.app = new View({
      target: t,
      props: {
        labels: this.labels,
        onSelect: this.onSelect,
      },
    });
  }
}

export function labelBar(labels, onSelect) {
  return new LabelBar(labels, onSelect);
}