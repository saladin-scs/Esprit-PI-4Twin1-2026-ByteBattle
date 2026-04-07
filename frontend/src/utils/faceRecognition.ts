// frontend/src/utils/faceRecognition.ts
import * as faceapi from 'face-api.js';

const MODEL_URL = '/models'; // public/models

export const loadModels = async () => {
  await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
  await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
  await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
};

export const getFaceEmbedding = async (video: HTMLVideoElement) => {
  const detection = await faceapi
    .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
    .withFaceLandmarks()
    .withFaceDescriptor();

  return detection?.descriptor || null; // vecteur 128 dimensions
};