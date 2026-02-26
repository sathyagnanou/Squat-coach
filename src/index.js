// src/index.js
import '@marcellejs/core/dist/marcelle.css';
import * as marcelle from '@marcellejs/core';
import { labelBar } from './components';

// ✅ Store — use VITE_DATA_STORE_URL, or in dev default to 'memory' so the app works without the remote backend
const storeUrl =
  import.meta.env.VITE_DATA_STORE_URL ??
  (import.meta.env.DEV ? 'memory' : 'https://marcelle.lisn.upsaclay.fr/iml2026/api');
const store = marcelle.dataStore(storeUrl);

async function init() {
  try {
    await store.connect();
  } catch (error) {
    await store.loginWithUI();
  }

  // ✅ Labels
const classLabels = ['good', 'knees_in', 'heels_up', 'shallow'];
let selectedLabel = classLabels[0];

// ✅ Datasets (ONE training set so datasetBrowser groups by y like your screenshot)
const trainingSet = marcelle.dataset('project-images', store);
const testSet = marcelle.dataset('project-test-images', store);

// ✅ Inputs
const webcam = marcelle.webcam({ width: 224, height: 224 });
const upload = marcelle.imageUpload({ width: 224, height: 224 });

// Keep last uploaded image for labeling
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
const testBrowser = marcelle.datasetBrowser(testSet);

// ✅ Label bar (custom component)
const labelsUI = labelBar(classLabels, (lab) => {
  selectedLabel = lab;
});

// --------------------
// Save helper (webcam preferred, else upload)
// --------------------
async function saveExampleToTraining(label) {
  const img = webcam.image || upload.image || lastUploaded;
  if (!img) {
    console.warn('No image available: activate webcam or upload an image.');
    return;
  }
  await trainingSet.create({
    x: img,
    y: label,
    createdAt: Date.now(),
    source: webcam.image ? 'webcam' : 'upload',
  });
}

// --------------------
// One-click capture button (uses selectedLabel)
// --------------------
const captureOneBtn = marcelle.button({ label: 'Capture 1 instance (selected label)' });
captureOneBtn.$click.subscribe(async () => {
  await saveExampleToTraining(selectedLabel);
});

// --------------------
// Hold-to-record (webcam only)
// --------------------
const recordBtn = marcelle.button({ label: 'Hold to record instances' });
let recordInterval = null;

function startRecording() {
  if (recordInterval) return;

  recordInterval = setInterval(async () => {
    const img = webcam.image;
    if (!img) return;

    await trainingSet.create({
      x: img,
      y: selectedLabel,
      createdAt: Date.now(),
      source: 'webcam-hold',
    });
  }, 250); // capture every 250ms
}

function stopRecording() {
  if (recordInterval) clearInterval(recordInterval);
  recordInterval = null;
}

// Attach hold events after mount
function wireHoldEvents() {
  const btn = document.querySelector(`#${recordBtn.id} button`);
  if (!btn) {
    setTimeout(wireHoldEvents, 200);
    return;
  }

  btn.addEventListener('mousedown', startRecording);
  btn.addEventListener('mouseup', stopRecording);
  btn.addEventListener('mouseleave', stopRecording);

  btn.addEventListener('touchstart', (e) => {
    e.preventDefault();
    startRecording();
  });
  btn.addEventListener('touchend', (e) => {
    e.preventDefault();
    stopRecording();
  });
}

// --------------------
// Training
// --------------------
const trainBtn = marcelle.button({ label: 'Train model' });
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
  wireHoldEvents();
}

init();