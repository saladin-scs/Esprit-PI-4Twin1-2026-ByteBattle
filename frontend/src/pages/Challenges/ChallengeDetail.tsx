import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";
import Editor from "@monaco-editor/react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

const DIFFICULTY_COLORS: Record<string, { bg: string; color: string; label: string }> = {
  easy:   { bg: "#d1fae5", color: "#065f46", label: "Facile" },
  medium: { bg: "#fef3c7", color: "#92400e", label: "Moyen" },
  hard:   { bg: "#fee2e2", color: "#991b1b", label: "Difficile" },
  expert: { bg: "#ede9fe", color: "#5b21b6", label: "Expert" },
};

const MONACO_LANG: Record<string, string> = {
  javascript: "javascript",
  python: "python",
  java: "java",
  cpp: "cpp",
};

interface Challenge {
  _id: string;
  title: string;
  description: string;
  difficulty: string;
  languages: string[];
  examples: Array<{ input: string; output: string; explanation?: string }>;
  constraints: string[];
  tags: string[];
  xpReward: number;
  starterCode: Record<string, string>;
}

interface SubmissionResult {
  status: string;
  passedTests: number;
  totalTests: number;
  xpEarned: number;
  executionTimeMs: number;
  testResults: Array<{
    testNumber: number;
    passed: boolean;
    input?: string;
    expectedOutput?: string;
    actualOutput?: string;
    error?: string;
  }>;
}

const ChallengeDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedLang, setSelectedLang] = useState("javascript");
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<SubmissionResult | null>(null);
  const [activeTab, setActiveTab] = useState<"description" | "result">("description");

  useEffect(() => {
    const fetchChallenge = async () => {
      try {
        const res = await axios.get(`${API_URL}/challenges/${id}`);
        setChallenge(res.data);
        const firstLang = res.data.languages[0] || "javascript";
        setSelectedLang(firstLang);
        setCode(res.data.starterCode?.[firstLang] || "");
      } catch {
        setError("Challenge introuvable.");
      } finally {
        setLoading(false);
      }
    };
    fetchChallenge();
  }, [id]);

  const handleLangChange = (lang: string) => {
    setSelectedLang(lang);
    setCode(challenge?.starterCode?.[lang] || "");
  };

  const handleSubmit = async () => {
    const token = localStorage.getItem("access_token");
    if (!token) { navigate("/login"); return; }

    setSubmitting(true);
    setResult(null);

    try {
      const res = await axios.post(
        `${API_URL}/challenges/${id}/submit`,
        { code, language: selectedLang },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setResult(res.data);
      setActiveTab("result");
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Erreur lors de la soumission.";
      setError(Array.isArray(msg) ? msg.join(", ") : msg);
    } finally {
      setSubmitting(false);
    }
  };

  const s: Record<string, React.CSSProperties> = {
    page:     { display: "flex", height: "calc(100vh - 60px)", fontFamily: "sans-serif", overflow: "hidden" },
    left:     { width: "45%", overflowY: "auto" as const, borderRight: "1px solid #e5e7eb", background: "#fff" },
    right:    { flex: 1, display: "flex", flexDirection: "column" as const, background: "#1e1e1e" },
    topbar:   { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", background: "#252526", borderBottom: "1px solid #3e3e42" },
    langBtn:  { padding: "5px 14px", borderRadius: 5, border: "none", cursor: "pointer", fontSize: 13, marginRight: 6 },
    submitBtn:{ padding: "8px 24px", borderRadius: 6, background: "#22c55e", color: "#fff", border: "none", cursor: "pointer", fontWeight: 700, fontSize: 14 },
    tabs:     { display: "flex", borderBottom: "1px solid #e5e7eb" },
    tab:      { padding: "12px 20px", cursor: "pointer", fontSize: 14, fontWeight: 500, borderBottom: "2px solid transparent" },
    content:  { padding: "20px 24px" },
    badge:    { padding: "3px 10px", borderRadius: 99, fontSize: 12, fontWeight: 600 },
    exBox:    { background: "#f9fafb", borderRadius: 8, padding: "12px 16px", marginBottom: 12, fontSize: 13 },
    code:     { fontFamily: "monospace", background: "#f0f0f0", padding: "2px 6px", borderRadius: 3 },
    resultBox:{ padding: "20px 24px", overflowY: "auto" as const, flex: 1 },
  };

  if (loading) return <div style={{ padding: 40, textAlign: "center" }}>Chargement...</div>;
  if (error || !challenge) return <div style={{ padding: 40, color: "red" }}>{error || "Challenge introuvable"}</div>;

  const diff = DIFFICULTY_COLORS[challenge.difficulty] ?? { bg: "#f0f0f0", color: "#333", label: challenge.difficulty };

  return (
    <div style={s.page}>
      {/* ─── Panneau gauche : description ─── */}
      <div style={s.left}>
        <div style={s.tabs}>
          <div
            style={{ ...s.tab, borderBottomColor: activeTab === "description" ? "#4f46e5" : "transparent", color: activeTab === "description" ? "#4f46e5" : "#666" }}
            onClick={() => setActiveTab("description")}
          >Description</div>
          {result && (
            <div
              style={{ ...s.tab, borderBottomColor: activeTab === "result" ? "#4f46e5" : "transparent", color: activeTab === "result" ? "#4f46e5" : "#666" }}
              onClick={() => setActiveTab("result")}
            >
              Résultat {result.status === "accepted" ? "✅" : "❌"}
            </div>
          )}
        </div>

        {activeTab === "description" ? (
          <div style={s.content}>
            {/* Titre + badge */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <h2 style={{ margin: 0, fontSize: 20 }}>{challenge.title}</h2>
              <span style={{ ...s.badge, background: diff.bg, color: diff.color }}>{diff.label}</span>
              <span style={{ marginLeft: "auto", fontWeight: 700, color: "#f59e0b" }}>+{challenge.xpReward} XP</span>
            </div>

            {/* Tags */}
            <div style={{ marginBottom: 16, display: "flex", gap: 6, flexWrap: "wrap" }}>
              {challenge.tags.map(t => (
                <span key={t} style={{ padding: "2px 8px", borderRadius: 4, background: "#e0e7ff", color: "#3730a3", fontSize: 12 }}>{t}</span>
              ))}
            </div>

            {/* Description */}
            <p style={{ lineHeight: 1.7, color: "#374151", whiteSpace: "pre-wrap" }}>{challenge.description}</p>

            {/* Exemples */}
            {challenge.examples?.length > 0 && (
              <>
                <h3 style={{ fontSize: 15, marginTop: 20 }}>Exemples</h3>
                {challenge.examples.map((ex, i) => (
                  <div key={i} style={s.exBox}>
                    <div><strong>Entrée :</strong> <code style={s.code}>{ex.input}</code></div>
                    <div style={{ marginTop: 6 }}><strong>Sortie :</strong> <code style={s.code}>{ex.output}</code></div>
                    {ex.explanation && <div style={{ marginTop: 6, color: "#666" }}><strong>Explication :</strong> {ex.explanation}</div>}
                  </div>
                ))}
              </>
            )}

            {/* Contraintes */}
            {challenge.constraints?.length > 0 && (
              <>
                <h3 style={{ fontSize: 15, marginTop: 20 }}>Contraintes</h3>
                <ul style={{ paddingLeft: 20, color: "#374151", lineHeight: 1.8 }}>
                  {challenge.constraints.map((c, i) => <li key={i}><code style={s.code}>{c}</code></li>)}
                </ul>
              </>
            )}
          </div>
        ) : (
          /* ─── Onglet résultat ─── */
          result && (
            <div style={s.resultBox}>
              {/* Status global */}
              <div style={{
                padding: "16px 20px", borderRadius: 10, marginBottom: 20,
                background: result.status === "accepted" ? "#d1fae5" : "#fee2e2",
                color: result.status === "accepted" ? "#065f46" : "#991b1b",
              }}>
                <div style={{ fontSize: 18, fontWeight: 700 }}>
                  {result.status === "accepted" ? "✅ Accepté !" : result.status === "wrong_answer" ? "❌ Mauvaise réponse" : "💥 Erreur d'exécution"}
                </div>
                <div style={{ marginTop: 8, fontSize: 14 }}>
                  Tests : <strong>{result.passedTests}/{result.totalTests}</strong> passés
                  {" · "}{result.executionTimeMs}ms
                  {result.xpEarned > 0 && <span style={{ marginLeft: 12, fontWeight: 700, color: "#f59e0b" }}>+{result.xpEarned} XP gagnés 🎉</span>}
                </div>
              </div>

              {/* Détail des tests */}
              {result.testResults.map((t) => (
                <div key={t.testNumber} style={{ marginBottom: 12, padding: "12px 16px", borderRadius: 8, border: `1px solid ${t.passed ? "#86efac" : "#fca5a5"}`, background: t.passed ? "#f0fdf4" : "#fff1f2" }}>
                  <div style={{ fontWeight: 600, color: t.passed ? "#16a34a" : "#dc2626" }}>
                    {t.passed ? "✅" : "❌"} Test #{t.testNumber}
                  </div>
                  {!t.passed && (
                    <div style={{ marginTop: 8, fontSize: 13 }}>
                      {t.input && <div><strong>Entrée :</strong> <code>{t.input}</code></div>}
                      {t.expectedOutput && <div><strong>Attendu :</strong> <code>{t.expectedOutput}</code></div>}
                      {t.actualOutput && <div><strong>Obtenu :</strong> <code>{t.actualOutput}</code></div>}
                      {t.error && <div style={{ color: "#dc2626", marginTop: 4 }}><strong>Erreur :</strong> {t.error}</div>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )
        )}
      </div>

      {/* ─── Panneau droit : éditeur ─── */}
      <div style={s.right}>
        {/* Barre du haut */}
        <div style={s.topbar}>
          <div>
            {challenge.languages.map(lang => (
              <button
                key={lang}
                style={{
                  ...s.langBtn,
                  background: selectedLang === lang ? "#4f46e5" : "#3e3e42",
                  color: selectedLang === lang ? "#fff" : "#ccc",
                }}
                onClick={() => handleLangChange(lang)}
              >{lang}</button>
            ))}
          </div>

          <button
            style={{ ...s.submitBtn, opacity: submitting ? 0.7 : 1 }}
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? "⏳ Exécution..." : "▶ Soumettre"}
          </button>
        </div>

        {/* Éditeur Monaco */}
        <Editor
          height="100%"
          language={MONACO_LANG[selectedLang] || "javascript"}
          value={code}
          onChange={(val) => setCode(val || "")}
          theme="vs-dark"
          options={{
            fontSize: 14,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            tabSize: 2,
            wordWrap: "on",
            automaticLayout: true,
          }}
        />
      </div>
    </div>
  );
};

export default ChallengeDetail;