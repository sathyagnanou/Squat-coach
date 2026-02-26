// src/index.js
import '@marcellejs/core/dist/marcelle.css';
import * as marcelle from '@marcellejs/core';
import { writable } from 'svelte/store';
import { labelBar, evalResults } from './components';

// ✅ Store — use VITE_DATA_STORE_URL, or in dev default to 'memory' so the app works without the remote backend
const storeUrl =
  import.meta.env.VITE_DATA_STORE_URL ??
  (import.meta.env.DEV ? 'memory' : 'https://marcelle.lisn.upsaclay.fr/iml2026/api');
const store = marcelle.dataStore(storeUrl);

// Small polyfill so arrays work with Marcelle's internal `.map(...).toArray()` chains
if (!Array.prototype.toArray) {
  // eslint-disable-next-line no-extend-native
  Array.prototype.toArray = function () {
    return this;
  };
}

// ✅ Labels
const classLabels = ['good', 'knees_in', 'shallow'];
let selectedLabel = classLabels[0];

// ✅ Datasets (ONE training set so datasetBrowser groups by y like your screenshot)
const trainingSet = marcelle.dataset('project-images', store);
const testSet = marcelle.dataset('project-test-images', store);

// Keep simple per-label counters to generate instance names like "good_1"
const labelCounts = {};

function nextName(label) {
  const next = (labelCounts[label] || 0) + 1;
  labelCounts[label] = next;
  return `${label}_${next}`;
}

/**
 * Convert ImageData to a thumbnail data URL for datasetBrowser display.
 * Marcelle's datasetBrowser only loads 'thumbnail' for display, not 'x'.
 */
function imageDataToThumbnail(imgData, maxSize = 100) {
  if (!imgData || !imgData.data) return null;
  const scale = Math.min(maxSize / imgData.width, maxSize / imgData.height, 1);
  const w = Math.round(imgData.width * scale);
  const h = Math.round(imgData.height * scale);
  const srcCanvas = document.createElement('canvas');
  srcCanvas.width = imgData.width;
  srcCanvas.height = imgData.height;
  srcCanvas.getContext('2d').putImageData(imgData, 0, 0);
  const dstCanvas = document.createElement('canvas');
  dstCanvas.width = w;
  dstCanvas.height = h;
  dstCanvas.getContext('2d').drawImage(srcCanvas, 0, 0, imgData.width, imgData.height, 0, 0, w, h);
  return dstCanvas.toDataURL('image/jpeg');
}

async function init() {
  try {
    await store.connect();
  } catch (error) {
    await store.loginWithUI();
  }
}

// ✅ Inputs
const webcam = marcelle.webcam({ width: 224, height: 224 });
const upload = marcelle.imageUpload({ width: 224, height: 224 });

// Keep last webcam / uploaded image and thumbnail for labeling
let lastWebcamImage = null;
let lastWebcamThumbnail = null;
if (webcam.$images) webcam.$images.subscribe((img) => { lastWebcamImage = img; });
if (webcam.$thumbnails) webcam.$thumbnails.subscribe((t) => { lastWebcamThumbnail = t; });

let lastUploaded = null;
let lastUploadThumbnail = null;
if (upload.$images) upload.$images.subscribe((img) => { lastUploaded = img; });
if (upload.$thumbnails) upload.$thumbnails.subscribe((t) => { lastUploadThumbnail = t; });

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
// Save helpers
// --------------------
async function saveExampleToTraining(label) {
  const img = lastWebcamImage || lastUploaded;
  if (!img) {
    console.warn('No image available: activate webcam or upload an image.');
    return;
  }
  const fromWebcam = !!lastWebcamImage;
  const thumb = (fromWebcam ? lastWebcamThumbnail : lastUploadThumbnail) || imageDataToThumbnail(img);
  await trainingSet.create({
    name: nextName(label),
    x: img,
    y: label,
    thumbnail: thumb,
    createdAt: Date.now(),
    source: fromWebcam ? 'webcam' : 'upload',
  });
}

async function saveExampleToTest(label) {
  const img = upload.image || lastUploaded;
  if (!img) {
    console.warn('No uploaded image available: please upload a test image first.');
    return;
  }
  const thumb = lastUploadThumbnail || imageDataToThumbnail(img);
  await testSet.create({
    x: img,
    y: label,
    thumbnail: thumb,
    createdAt: Date.now(),
    source: 'upload-test',
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
// Add uploaded image to TEST set
// --------------------
const addToTestBtn = marcelle.button('Add uploaded image to TEST (selected label)');
addToTestBtn.title = 'Add current uploaded image to test set';
addToTestBtn.$click.subscribe(async () => {
  await saveExampleToTest(selectedLabel);
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
    const thumb = lastWebcamThumbnail || imageDataToThumbnail(img);
    await trainingSet.create({
      name: nextName(selectedLabel),
      x: img,
      y: selectedLabel,
      thumbnail: thumb,
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
// Evaluate on TEST set
// --------------------
const evalResultsStore = writable({
  status: 'idle',
  message: 'Click "Evaluate on TEST set" to run evaluation.',
});
const evalResultsComp = evalResults(evalResultsStore);

const evalBtn = marcelle.button('Evaluate on TEST set');
evalBtn.title = 'Run model on test set';
evalBtn.$click.subscribe(async () => {
  if (!classifier.ready) {
    evalResultsStore.set({ status: 'error', message: 'Model not trained yet. Train first, then evaluate.' });
    return;
  }
  try {
    evalResultsStore.set({ status: 'loading', message: 'Running evaluation...' });
    await testSet.ready;
    const items = await testSet.items().toArray();
    if (items.length === 0) {
      evalResultsStore.set({ status: 'error', message: 'Test set is empty. Add test images first.' });
      return;
    }

    const confusion = {};
    for (const y of classLabels) {
      confusion[y] = {};
      for (const pred of classLabels) confusion[y][pred] = 0;
    }

    for (const it of items) {
      if (!it?.x || !it?.y) continue;
      const feat = await featureExtractor.process(it.x);
      const out = await classifier.predict(feat);
      const pred = (typeof out === 'object' && out?.label != null) ? out.label : String(out);
      const trueLabel = it.y;
      if (classLabels.includes(trueLabel) && classLabels.includes(pred)) {
        confusion[trueLabel][pred] = (confusion[trueLabel][pred] || 0) + 1;
      }
    }

    let correct = 0;
    let total = 0;
    const perClass = {};
    for (const y of classLabels) {
      const row = confusion[y];
      const classTotal = Object.values(row).reduce((a, b) => a + b, 0);
      perClass[y] = classTotal > 0 ? ((row[y] || 0) / classTotal * 100).toFixed(1) + '%' : '—';
      correct += row[y] || 0;
      total += classTotal;
    }
    const accuracy = total > 0 ? (correct / total * 100).toFixed(1) : 0;

    evalResultsStore.set({
      status: 'done',
      accuracy,
      perClass,
      confusion,
    });
  } catch (err) {
    evalResultsStore.set({ status: 'error', message: err?.message || 'Evaluation failed.' });
  }
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
    captureOneBtn,   // ✅ capture 1 (webcam or uploaded) -> TRAIN set
    recordBtn,       // ✅ toggle recording (webcam)      -> TRAIN set
    addToTestBtn,    // ✅ add uploaded image             -> TEST set
    trainingBrowser
  );

dashboard.page('Training').use(trainBtn, prog);
dashboard.page('Real-time Prediction').use(webcam, predViz);
dashboard.page('Performance').use(evalBtn, evalResultsComp, trainingBrowser, testBrowser);

dashboard.show();

init();