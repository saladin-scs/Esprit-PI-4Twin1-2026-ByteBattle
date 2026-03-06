"use client";

import { useEffect, useRef } from "react";
import * as faceapi from "face-api.js";

export default function FaceRegister({ userId }) {

  const videoRef = useRef();

  useEffect(() => {
    loadModels();
    startVideo();
  }, []);

  const loadModels = async () => {
    await faceapi.nets.tinyFaceDetector.loadFromUri("/models");
    await faceapi.nets.faceLandmark68Net.loadFromUri("/models");
    await faceapi.nets.faceRecognitionNet.loadFromUri("/models");
  };

  const startVideo = () => {
    navigator.mediaDevices.getUserMedia({ video: true })
      .then(stream => {
        videoRef.current.srcObject = stream;
      });
  };

  const registerFace = async () => {

    const detection = await faceapi
      .detectSingleFace(
        videoRef.current,
        new faceapi.TinyFaceDetectorOptions()
      )
      .withFaceLandmarks()
      .withFaceDescriptor();

    const descriptor = detection.descriptor;

    await fetch("/api/register-face", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        embedding: Array.from(descriptor)
      })
    });

    alert("Face Registered !");
  };

  return (
    <div>
      <video ref={videoRef} autoPlay width="300" />
      <button onClick={registerFace}>
        Register Face
      </button>
    </div>
  );
}