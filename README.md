# 🏋️ Squat Coach — Marcelle Application

Squat Coach is an interactive machine learning application built with **Marcelle** for analyzing **squat movement quality** using computer vision.

The application is designed as a **coach-in-the-loop system**: a coach or athlete records squat repetitions, labels them (e.g. *good*, *knees_in*, *shallow*), trains a personalized model, and evaluates its performance on curated test data.

This project was developed as part of the **IML2026 course**.

---

## ✨ Features

- 📷 Webcam and image upload for data collection
- 🏷️ Manual labeling of squat form (*good*, *knees_in*, *shallow*)
- 🧠 Transfer learning with **MobileNet + MLP classifier**
- 🔁 Iterative training on user-provided data
- 📊 Real-time prediction with confidence visualization
- 🧪 Evaluation on a separate test dataset (accuracy + confusion matrix)

---

## 🗂️ Project Structure

```
src/
	index.js # Main application logic
	components/
		label-bar/ # Label selection UI
		repReviewer/ # (Future work) Uncertainty-based review component
		evalResults/ # Evaluation results visualization
```

---

## 🚀 Available Scripts

### `npm run dev`

Runs the app in development mode.  
Open **http://localhost:5173** to view it in the browser.

The page will automatically reload if you make edits.

---

### `npm run build`

Builds a production-ready version of the app into the `dist/` folder.

By default, production builds use the remote Marcelle backend:
https://marcelle.lisn.upsaclay.fr/iml2026/api

## Available Scripts

### npm run dev

Runs the app in the development mode.
Open http://localhost:5173 to view it in the browser.

The page will reload if you make edits.

**Data store:** In dev, the app uses an in-memory store by default so it works without the remote backend. To use the course backend or a local backend instead, set:

```bash
VITE_DATA_STORE_URL=https://marcelle.lisn.upsaclay.fr/iml2026/api npm run dev
# or, if you run a local backend (see below):
VITE_DATA_STORE_URL=http://localhost:3030 npm run dev
```

### npm run build

Builds a static copy of your site to the `dist/` folder.
Your app is ready to be deployed!

Production builds use the remote backend at `https://marcelle.lisn.upsaclay.fr/iml2026/api`


