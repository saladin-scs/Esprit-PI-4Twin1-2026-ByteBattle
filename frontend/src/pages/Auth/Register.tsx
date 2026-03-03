import React, { useEffect, useRef, useState } from "react";
import * as faceapi from "face-api.js";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

const Register = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [faceDescriptor, setFaceDescriptor] = useState<number[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const init = async () => {
      try {
        const MODEL_URL = "/models";
        await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
        await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
        await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
        setModelsLoaded(true);
        await startVideo();
      } catch (err) {
        setError("Erreur lors du chargement des modèles de reconnaissance faciale.");
        console.error(err);
      }
    };
    init();
    return () => stopCamera();
  }, []);

  const startVideo = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) {
      setError("Impossible d'accéder à la caméra. Vérifiez les permissions.");
    }
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  };

  const captureFace = async () => {
    if (!videoRef.current || !modelsLoaded) return;
    setCapturing(true);
    setError("");
    try {
      const detection = await faceapi
        .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor();
      if (!detection) {
        setError("Aucun visage détecté. Assurez-vous d'être bien face à la caméra.");
        return;
      }
      setFaceDescriptor(Array.from(detection.descriptor));
      setSuccess("Visage capturé avec succès ✅");
    } catch (err) {
      setError("Erreur lors de la capture du visage.");
    } finally {
      setCapturing(false);
    }
  };

  const handleRegister = async () => {
    setError("");
    setSuccess("");

    if (!email || !username || !password) {
      setError("Veuillez remplir tous les champs (email, nom d'utilisateur, mot de passe).");
      return;
    }
    if (username.trim().length < 3) {
      setError("Le nom d'utilisateur doit contenir au moins 3 caractères.");
      return;
    }
    if (password.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }

    try {
      setLoading(true);
      await axios.post(`${API_URL}/auth/register`, {
        email,
        username: username.trim(),
        password,
        faceDescriptor: faceDescriptor ?? null,
      });
      setSuccess("Inscription réussie 🎉 Vous pouvez maintenant vous connecter.");
      stopCamera();
    } catch (err: any) {
      const raw = err?.response?.data?.message;
      const message = Array.isArray(raw) ? raw.join(", ") : raw || "Erreur lors de l'inscription.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  // ✅ AJOUT : redirection OAuth — le backend gère tout, on redirige simplement
  const handleSocialLogin = (provider: "google" | "github") => {
    stopCamera(); // arrêter la caméra avant de quitter la page
    window.location.href = `${API_URL}/auth/${provider}`;
  };

  const inputStyle: React.CSSProperties = {
    display: "block", width: "100%", padding: 8, marginBottom: 12,
    boxSizing: "border-box", borderRadius: 4, border: "1px solid #ccc", fontSize: 14,
  };

  const btnStyle: React.CSSProperties = {
    display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
    width: "100%", padding: "10px 16px", borderRadius: 6, border: "1px solid #ddd",
    cursor: "pointer", fontSize: 14, fontWeight: 500, marginBottom: 10,
    background: "#fff", transition: "background 0.15s",
  };

  return (
    <div style={{ textAlign: "center", maxWidth: 480, margin: "30px auto", padding: "0 16px" }}>
      <h2 style={{ marginBottom: 24 }}>Créer un compte</h2>

      {error && (
        <div style={{ color: "red", marginBottom: 12, padding: 8, background: "#fee", borderRadius: 6, textAlign: "left" }}>
          {error}
        </div>
      )}
      {success && (
        <div style={{ color: "green", marginBottom: 12, padding: 8, background: "#efe", borderRadius: 6, textAlign: "left" }}>
          {success}
        </div>
      )}

      {/* ✅ AJOUT : boutons OAuth Google et GitHub */}
      <button
        onClick={() => handleSocialLogin("google")}
        style={{ ...btnStyle, borderColor: "#ddd" }}
        onMouseEnter={e => (e.currentTarget.style.background = "#f5f5f5")}
        onMouseLeave={e => (e.currentTarget.style.background = "#fff")}
      >
        {/* Icône Google SVG */}
        <svg width="18" height="18" viewBox="0 0 48 48">
          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
          <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
        </svg>
        Continuer avec Google
      </button>

      <button
        onClick={() => handleSocialLogin("github")}
        style={{ ...btnStyle, background: "#24292e", color: "#fff", border: "1px solid #24292e" }}
        onMouseEnter={e => (e.currentTarget.style.background = "#1a1f24")}
        onMouseLeave={e => (e.currentTarget.style.background = "#24292e")}
      >
        {/* Icône GitHub SVG */}
        <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
          <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
        </svg>
        Continuer avec GitHub
      </button>

      {/* Séparateur */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "16px 0" }}>
        <div style={{ flex: 1, height: 1, background: "#e0e0e0" }} />
        <span style={{ color: "#999", fontSize: 13 }}>ou avec email</span>
        <div style={{ flex: 1, height: 1, background: "#e0e0e0" }} />
      </div>

      {/* Formulaire classique */}
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={inputStyle}
      />

      <input
        type="text"
        placeholder="Nom d'utilisateur (min. 3 caractères)"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        style={inputStyle}
      />

      <input
        type="password"
        placeholder="Mot de passe (min. 6 caractères)"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        style={{ ...inputStyle, marginBottom: 16 }}
      />

      {/* Caméra */}
      {!modelsLoaded && (
        <p style={{ color: "#888", fontSize: 13 }}>Chargement des modèles de reconnaissance faciale...</p>
      )}

      <video
        ref={videoRef}
        autoPlay
        muted
        width="400"
        height="300"
        style={{ borderRadius: 10, border: `2px solid ${faceDescriptor ? "green" : "#ccc"}` }}
      />

      <br /><br />

      <button onClick={captureFace} disabled={capturing || !modelsLoaded} style={{ marginRight: 8 }}>
        {capturing ? "Capture en cours..." : faceDescriptor ? "Recapturer le visage 🔄" : "Capturer le visage 📸"}
      </button>

      <br /><br />

      <button
        onClick={handleRegister}
        disabled={loading}
        style={{ width: "100%", padding: "10px 24px", borderRadius: 6, background: "#4f46e5", color: "#fff", border: "none", fontSize: 15, fontWeight: 600, cursor: "pointer" }}
      >
        {loading ? "Inscription en cours..." : "S'inscrire"}
      </button>

      {!faceDescriptor && (
        <p style={{ fontSize: 12, color: "#888", marginTop: 8 }}>
          La capture du visage est optionnelle mais permet la connexion faciale ensuite.
        </p>
      )}
    </div>
  );
};

export default Register;
