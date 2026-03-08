import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";
import Editor from "@monaco-editor/react";
import { Group, Panel, Separator } from "react-resizable-panels";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { initVimMode } from "monaco-vim";
import { Moon, Sun, Keyboard, Bug, AlignLeft, Lightbulb } from "lucide-react";
import CommunitySolutions from "./CommunitySolutions";

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
  hints?: Array<{ text: string; tier: string; cost: number }>;
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
  const [activeTab, setActiveTab] = useState<"description" | "result" | "solutions">("description");
  const [isVimMode, setIsVimMode] = useState(false);
  const [editorTheme, setEditorTheme] = useState("vs-dark");
  const [revealedHints, setRevealedHints] = useState<number[]>([]);
  const [selectedTestCase, setSelectedTestCase] = useState<number>(0);
  
  const editorRef = useRef<any>(null);
  const vimModeRef = useRef<any>(null);

  const handleEditorDidMount = (editor: any) => {
    editorRef.current = editor;
  };

  useEffect(() => {
    if (editorRef.current) {
      if (isVimMode) {
        if (!vimModeRef.current) {
          const statusNode = document.getElementById('vim-status-node');
          vimModeRef.current = initVimMode(editorRef.current, statusNode);
        }
      } else {
        if (vimModeRef.current) {
          vimModeRef.current.dispose();
          vimModeRef.current = null;
        }
      }
    }
  }, [isVimMode]);

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
      <Group orientation="horizontal">
        {/* ─── Panneau gauche : description ─── */}
        <Panel defaultSize="45%" minSize="30%">
          <div style={{ ...s.left, width: '100%', height: '100%' }}>
            <div style={s.tabs}>
              <div
                style={{ ...s.tab, borderBottomColor: activeTab === "description" ? "#4f46e5" : "transparent", color: activeTab === "description" ? "#4f46e5" : "#666" }}
                onClick={() => setActiveTab("description")}
              >Description</div>
              <div
                style={{ ...s.tab, borderBottomColor: activeTab === "solutions" ? "#4f46e5" : "transparent", color: activeTab === "solutions" ? "#4f46e5" : "#666" }}
                onClick={() => setActiveTab("solutions")}
              >Solutions</div>
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

                {/* Description avec Markdown et LaTeX */}
                <div style={{ lineHeight: 1.7, color: "#374151", fontSize: 15, marginBottom: 20 }} className="markdown-body">
                  <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeKatex]}>
                    {challenge.description}
                  </ReactMarkdown>
                </div>

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

                {/* Hints */}
                {challenge.hints && challenge.hints.length > 0 && (
                  <div style={{ marginTop: 24 }}>
                    <h3 style={{ fontSize: 15, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Lightbulb size={16} color="#f59e0b" /> Indices ({challenge.hints.length})
                    </h3>
                    {challenge.hints.map((hint, i) => {
                      const isRevealed = revealedHints.includes(i);
                      return (
                        <div key={i} style={{ marginBottom: 8, padding: 12, borderRadius: 6, background: isRevealed ? '#fef3c7' : '#f3f4f6', border: `1px solid ${isRevealed ? '#fde68a' : '#e5e7eb'}` }}>
                          {isRevealed ? (
                            <div style={{ color: '#92400e', fontSize: 14 }}>
                              <strong style={{ display: 'block', marginBottom: 4 }}>Indice {i + 1} ({hint.tier})</strong>
                              <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeKatex]}>{hint.text}</ReactMarkdown>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ color: '#6b7280', fontSize: 14 }}>Indice {i + 1} masqué {hint.cost > 0 && `(Coût : ${hint.cost} XP)`}</span>
                              <button 
                                onClick={() => setRevealedHints([...revealedHints, i])}
                                style={{ padding: '4px 12px', background: '#e5e7eb', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#374151' }}
                              >
                                Révéler
                              </button>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            ) : activeTab === "result" ? (
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
            ) : activeTab === "solutions" ? (
              <div style={{ flex: 1, overflowY: 'hidden' }}>
                <CommunitySolutions challengeId={id as string} />
              </div>
            ) : null}
          </div>
        </Panel>

        {/* Poignée centrale */}
        <Separator style={{ width: 8, background: '#f3f4f6', cursor: 'col-resize', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', zIndex: 10 }}>
          <div style={{ width: 4, height: 24, background: '#9ca3af', borderRadius: 2 }} />
        </Separator>

        {/* ─── Panneau droit : Workspace (Éditeur + Console) ─── */}
        <Panel minSize="30%">
          <Group orientation="vertical">
            {/* Haut droit : Éditeur Monaco */}
            <Panel defaultSize="70%" minSize="20%">
              <div style={{ ...s.right, height: '100%' }}>
                {/* Barre du haut */}
                <div style={s.topbar}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
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
                    <div style={{ width: 1, height: 20, background: '#3e3e42', margin: '0 8px' }} />
                    <button
                      title="Toggle Vim Mode"
                      style={{ background: 'transparent', border: 'none', color: isVimMode ? '#4f46e5' : '#ccc', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                      onClick={() => setIsVimMode(!isVimMode)}
                    >
                      <Keyboard size={16} />
                    </button>
                    <button
                      title="Toggle Theme"
                      style={{ background: 'transparent', border: 'none', color: '#ccc', cursor: 'pointer', display: 'flex', alignItems: 'center', marginLeft: 6 }}
                      onClick={() => setEditorTheme(editorTheme === "vs-dark" ? "light" : "vs-dark")}
                    >
                      {editorTheme === "vs-dark" ? <Sun size={16} /> : <Moon size={16} />}
                    </button>
                    <div style={{ width: 1, height: 20, background: '#3e3e42', margin: '0 8px' }} />
                    <button
                      title="Format Code"
                      style={{ background: 'transparent', border: 'none', color: '#ccc', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                      onClick={() => editorRef.current?.getAction('editor.action.formatDocument')?.run()}
                    >
                      <AlignLeft size={16} />
                    </button>
                    <button
                      title="Debug Mode (Coming Soon)"
                      style={{ background: 'transparent', border: 'none', color: '#ccc', cursor: 'not-allowed', display: 'flex', alignItems: 'center', marginLeft: 6, opacity: 0.5 }}
                      disabled
                    >
                      <Bug size={16} />
                    </button>
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
                <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ flex: 1 }}>
                    <Editor
                      height="100%"
                      onMount={handleEditorDidMount}
                      language={MONACO_LANG[selectedLang] || "javascript"}
                      value={code}
                      onChange={(val) => setCode(val || "")}
                      theme={editorTheme}
                      options={{
                        fontSize: 14,
                        minimap: { enabled: false },
                        scrollBeyondLastLine: false,
                        tabSize: 2,
                        wordWrap: "on",
                        automaticLayout: true,
                        padding: { top: 16 }
                      }}
                    />
                  </div>
                  {/* Status bar pour VIM */}
                  <div id="vim-status-node" style={{ height: isVimMode ? 24 : 0, background: '#007acc', color: 'white', fontSize: 12, padding: '0 8px', display: 'flex', alignItems: 'center', fontFamily: 'monospace', overflow: 'hidden' }}></div>
                </div>
              </div>
            </Panel>

            <Separator style={{ height: 6, background: '#252526', borderTop: '1px solid #3e3e42', borderBottom: '1px solid #3e3e42', cursor: 'row-resize' }} />

            {/* Bas droit : Console et Tests */}
            <Panel defaultSize="30%" minSize="10%">
              <div style={{ background: '#1e1e1e', height: '100%', color: '#fff', display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '8px 16px', background: '#2d2d30', borderBottom: '1px solid #3e3e42', fontSize: 13, fontWeight: 600, color: '#e5e7eb', display: 'flex', gap: 16 }}>
                  <span style={{ cursor: 'pointer', color: '#fff' }}>Test Cases</span>
                  <span style={{ cursor: 'pointer', color: '#9ca3af' }}>Console</span>
                </div>
                
                <div style={{ padding: 16, overflowY: 'auto', flex: 1, fontSize: 13 }}>
                  {challenge.examples?.length > 0 ? (
                    <div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
                        {challenge.examples.map((_, i) => (
                          <button 
                            key={i} 
                            onClick={() => setSelectedTestCase(i)}
                            style={{ 
                              padding: '6px 16px', 
                              background: selectedTestCase === i ? '#4f46e5' : '#3e3e42', 
                              border: 'none', 
                              borderRadius: 6, 
                              color: selectedTestCase === i ? '#fff' : '#d1d5db', 
                              cursor: 'pointer', 
                              fontSize: 13,
                              fontWeight: selectedTestCase === i ? 600 : 400
                            }}>
                            Case {i + 1}
                          </button>
                        ))}
                      </div>
                      
                      {challenge.examples[selectedTestCase] && (
                        <div style={{ background: '#252526', padding: 16, borderRadius: 8 }}>
                          <div style={{ marginBottom: 16 }}>
                            <div style={{ color: '#9ca3af', marginBottom: 6, fontSize: 12, textTransform: 'uppercase', fontWeight: 600 }}>Input</div>
                            <div style={{ background: '#1e1e1e', padding: '10px 12px', borderRadius: 6, fontFamily: 'monospace', color: '#e5e7eb', whiteSpace: 'pre-wrap' }}>
                              {challenge.examples[selectedTestCase].input}
                            </div>
                          </div>
                          <div>
                            <div style={{ color: '#9ca3af', marginBottom: 6, fontSize: 12, textTransform: 'uppercase', fontWeight: 600 }}>Expected Output</div>
                            <div style={{ background: '#1e1e1e', padding: '10px 12px', borderRadius: 6, fontFamily: 'monospace', color: '#e5e7eb', whiteSpace: 'pre-wrap' }}>
                              {challenge.examples[selectedTestCase].output}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p style={{ color: '#9ca3af' }}>Select a test case or run your code to view output.</p>
                  )}
                </div>
              </div>
            </Panel>
          </Group>
        </Panel>
      </Group>
    </div>
  );
};

export default ChallengeDetail;