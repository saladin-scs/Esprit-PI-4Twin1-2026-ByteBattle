"use client";

import { useRef } from "react";
import * as faceapi from "face-api.js";

export default function FaceLogin({ userId }) {

  const videoRef = useRef();

  const verifyFace = async () => {

    const detection = await faceapi
      .detectSingleFace(
        videoRef.current,
        new faceapi.TinyFaceDetectorOptions()
      )
      .withFaceLandmarks()
      .withFaceDescriptor();

    const descriptor = detection.descriptor;

    const res = await fetch("/api/verify-face", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        userId,
        embedding: Array.from(descriptor)
      })
    });

    const data = await res.json();

    if(data.match){
      alert("Login Success");
    } else {
      alert("Face Not Recognized");
    }
  };

  return (
    <div>
      <video ref={videoRef} autoPlay width="300" />
      <button onClick={verifyFace}>
        Login with Face
      </button>
    </div>
  );
}