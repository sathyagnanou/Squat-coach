// src/index.js
import '@marcellejs/core/dist/marcelle.css';
import * as marcelle from '@marcellejs/core';
import { labelBar } from './components';

// ✅ Store — use VITE_DATA_STORE_URL, or in dev default to 'memory' so the app works without the remote backend
const storeUrl =
  import.meta.env.VITE_DATA_STORE_URL ??
  (import.meta.env.DEV ? 'memory' : 'https://marcelle.lisn.upsaclay.fr/iml2026/api');
const store = marcelle.dataStore(storeUrl);

// ✅ Labels
const classLabels = ['good', 'knees_in', 'heels_up', 'shallow'];
let selectedLabel = classLabels[0];

// ✅ Datasets (ONE training set so datasetBrowser groups by y like your screenshot)
const trainingSet = marcelle.dataset('project-images', store);
const testSet = marcelle.dataset('project-test-images', store);

// Keep simple per-label counters to generate instance names like "good_1"
const labelCounts = {};

function bumpLabelCount(label, n) {
  const current = labelCounts[label] || 0;
  labelCounts[label] = Math.max(current, n);
}

function nextName(label) {
  const next = (labelCounts[label] || 0) + 1;
  labelCounts[label] = next;
  return `${label}_${next}`;
}

async function ensureInstanceNames(dataset) {
  await dataset.ready;
  const items = await dataset.items().toArray();

  for (const it of items) {
    if (!it?.y || !it?._id) continue;

    if (typeof it.name === 'string') {
      const m = it.name.match(/^(.+)_([0-9]+)$/);
      if (m && m[1] === it.y) {
        bumpLabelCount(it.y, parseInt(m[2], 10));
        continue;
      }
    }

    const next = (labelCounts[it.y] || 0) + 1;
    labelCounts[it.y] = next;
    const name = `${it.y}_${next}`;
    try {
      await dataset.update(it._id, { name });
    } catch (e) {
      console.warn('Could not update instance name', it._id, e);
    }
  }
}

async function init() {
  try {
    await store.connect();
  } catch (error) {
    await store.loginWithUI();
  }

  // Ensure existing instances have readable names like "good_1"
  await ensureInstanceNames(trainingSet);
}

// ✅ Inputs
const webcam = marcelle.webcam({ width: 224, height: 224 });
const upload = marcelle.imageUpload({ width: 224, height: 224 });

// Keep last webcam / uploaded image for labeling (more robust than relying on internal props)
let lastWebcamImage = null;
if (webcam.$images) {
  webcam.$images.subscribe((img) => {
    lastWebcamImage = img;
  });
}

let lastUploaded = null;
if (upload.$images) {
  upload.$images.subscribe((img) => {
    lastUploaded = img;
  });
}

// ✅ Model
const featureExtractor = marcelle.mobileNet();
const classifier = marcelle
  .mlpClassifier({ layers: [32, 32], epochs: 20 })
  .sync(store, `mlp-squat-${store.user?.team ?? 'local'}`);

const prog = marcelle.trainingProgress(classifier);

// ✅ Real-time prediction (webcam)
const $predictions = webcam.$images
  .filter(() => classifier.ready)
  .map(async (img) => {
    const feat = await featureExtractor.process(img);
    return classifier.predict(feat);
  })
  .awaitPromises();

const predViz = marcelle.confidencePlot($predictions);

// ✅ Browsers
const trainingBrowser = marcelle.datasetBrowser(trainingSet);
trainingBrowser.title = 'Squat dataset (training)';
const testBrowser = marcelle.datasetBrowser(testSet);
testBrowser.title = 'Squat dataset (test)';

// ✅ Label bar (custom component)
const labelsUI = labelBar(classLabels, (lab) => {
  selectedLabel = lab;
});

// --------------------
// Save helper (webcam preferred, else upload)
// --------------------
async function saveExampleToTraining(label) {
  const img = lastWebcamImage || lastUploaded;
  if (!img) {
    console.warn('No image available: activate webcam or upload an image.');
    return;
  }
  await trainingSet.create({
    name: nextName(label),
    x: img,
    y: label,
    createdAt: Date.now(),
    source: webcam.image ? 'webcam' : 'upload',
  });
}

// --------------------
// One-click capture button (uses selectedLabel)
// --------------------
const captureOneBtn = marcelle.button('Capture 1 instance (selected label)');
captureOneBtn.title = 'Capture 1 labeled frame';
captureOneBtn.$click.subscribe(async () => {
  await saveExampleToTraining(selectedLabel);
});

// --------------------
// Toggle recording (webcam only)
// --------------------
const recordBtn = marcelle.button('Start recording (every 0.5s)');
recordBtn.title = 'Record labeled sequence';
let recordInterval = null;
let isRecording = false;

function startRecording() {
  if (isRecording) return;
  isRecording = true;
  recordBtn.$text.set('Click to stop recording');

  recordInterval = setInterval(async () => {
    const img = lastWebcamImage;
    if (!img) return;

    await trainingSet.create({
      name: nextName(selectedLabel),
      x: img,
      y: selectedLabel,
      createdAt: Date.now(),
      source: 'webcam-toggle',
    });
  }, 500); // capture every 500ms
}

function stopRecording() {
  if (!isRecording) return;
  isRecording = false;
  recordBtn.$text.set('Start recording (every 0.5s)');
  if (recordInterval) clearInterval(recordInterval);
  recordInterval = null;
}

// Click once to start, click again to stop
recordBtn.$click.subscribe(() => {
  if (isRecording) {
    stopRecording();
  } else {
    startRecording();
  }
});

// --------------------
// Training
// --------------------
const trainBtn = marcelle.button('Train model');
trainBtn.title = 'Train squat classifier';
trainBtn.$click.subscribe(async () => {
  await trainingSet.ready;
  const items = await trainingSet.items().toArray();

  const trainingData = [];
  for (const it of items) {
    if (!it?.x || !it?.y) continue;
    const feat = await featureExtractor.process(it.x);
    trainingData.push({ x: feat, y: it.y });
  }

  if (trainingData.length === 0) {
    console.warn('No training data in project-images.');
    return;
  }

  await classifier.train(trainingData);
});

// --------------------
// Dashboard (same layout style)
// --------------------
const dashboard = marcelle.dashboard({
  title: `IML2026 - Squat Coach (Team ${store.user?.team ?? 'local'})`,
  author: `Team ${store.user?.team ?? 'local'}`,
});

dashboard
  .page('Data Management')
  .use(
    webcam,
    featureExtractor,
    upload,
    labelsUI,        // ✅ row of label buttons (custom component)
    captureOneBtn,   // ✅ capture 1 (webcam or uploaded)
    recordBtn,       // ✅ hold to record (webcam)
    trainingBrowser
  );

dashboard.page('Training').use(trainBtn, prog);
dashboard.page('Real-time Prediction').use(webcam, predViz);
dashboard.page('Performance').use(trainingBrowser, testBrowser);

dashboard.show();

init();