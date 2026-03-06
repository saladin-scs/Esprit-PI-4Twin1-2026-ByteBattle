import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

const DIFFICULTY_COLORS: Record<string, { bg: string; color: string; label: string }> = {
  easy:   { bg: "#d1fae5", color: "#065f46", label: "Easy" },
  medium: { bg: "#fef3c7", color: "#92400e", label: "Medium" },
  hard:   { bg: "#fee2e2", color: "#991b1b", label: "Hard" },
  expert: { bg: "#ede9fe", color: "#5b21b6", label: "Expert" },
};

const LANGUAGES = ["All", "javascript", "python", "java", "cpp", "c", "c++", "c#", "ruby", "go", "rust", "swift", "kotlin", "php", "sql"];
const DIFFICULTIES = ["All", "easy", "medium", "hard", "expert"];

interface Challenge {
  _id: string;
  title: string;
  difficulty: string;
  languages: string[];
  tags: string[];
  xpReward: number;
  totalSubmissions: number;
  totalAccepted: number;
}

const Challenges = () => {
  const navigate = useNavigate();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [difficulty, setDifficulty] = useState("All");
  const [language, setLanguage] = useState("All");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchChallenges = async () => {
    setLoading(true);
    setError("");
    try {
      const params: any = { page, limit: 15 };
      if (difficulty !== "All") params.difficulty = difficulty;
      if (language !== "All")   params.language = language;
      if (search.trim())         params.search = search.trim();

      const res = await axios.get(`${API_URL}/challenges`, { params });
      setChallenges(res.data.challenges);
      setTotal(res.data.total);
      setTotalPages(res.data.totalPages);
    } catch {
      setError("Impossible de charger les challenges.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchChallenges(); }, [difficulty, language, page]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchChallenges();
  };

  const acceptanceRate = (c: Challenge) =>
    c.totalSubmissions > 0 ? Math.round((c.totalAccepted / c.totalSubmissions) * 100) : 0;

  const s: Record<string, React.CSSProperties> = {
    page:   { maxWidth: 1000, margin: "0 auto", padding: "24px 16px", fontFamily: "sans-serif" },
    header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 },
    title:  { fontSize: 26, fontWeight: 700, margin: 0 },
    count:  { color: "#666", fontSize: 14 },
    filters:{ display: "flex", gap: 10, flexWrap: "wrap" as const, marginBottom: 20 },
    input:  { flex: 1, minWidth: 200, padding: "8px 12px", borderRadius: 6, border: "1px solid #ddd", fontSize: 14 },
    select: { padding: "8px 12px", borderRadius: 6, border: "1px solid #ddd", fontSize: 14, background: "#fff" },
    btn:    { padding: "8px 16px", borderRadius: 6, background: "#4f46e5", color: "#fff", border: "none", cursor: "pointer", fontSize: 14 },
    table:  { width: "100%", borderCollapse: "collapse" as const, background: "#fff", borderRadius: 10, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.08)" },
    th:     { textAlign: "left" as const, padding: "12px 16px", borderBottom: "2px solid #f0f0f0", color: "#666", fontSize: 13, fontWeight: 600 },
    td:     { padding: "14px 16px", borderBottom: "1px solid #f9f9f9", fontSize: 14 },
    row:    { cursor: "pointer" },
    badge:  { padding: "3px 10px", borderRadius: 99, fontSize: 12, fontWeight: 600 },
    tag:    { padding: "2px 8px", borderRadius: 4, background: "#f0f0f0", fontSize: 12, marginRight: 4 },
    pagination: { display: "flex", justifyContent: "center", gap: 8, marginTop: 24 },
    pgBtn:  { padding: "6px 14px", borderRadius: 6, border: "1px solid #ddd", cursor: "pointer", background: "#fff" },
  };

  return (
    <div style={s.page}>
      <div style={s.header}>
        <h1 style={s.title}>Challenges</h1>
        <span style={s.count}>{total} challenges available</span>
      </div>

      {/* Filtres */}
      <form onSubmit={handleSearch} style={s.filters}>
        <input
          style={s.input}
          placeholder="Search challenges..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select style={s.select} value={difficulty} onChange={e => { setDifficulty(e.target.value); setPage(1); }}>
          {DIFFICULTIES.map(d => <option key={d} value={d}>{d === "All" ? "All difficulties" : DIFFICULTY_COLORS[d]?.label}</option>)}
        </select>
        <select style={s.select} value={language} onChange={e => { setLanguage(e.target.value); setPage(1); }}>
          {LANGUAGES.map(l => <option key={l} value={l}>{l === "All" ? "All languages" : l}</option>)}
        </select>
        <button type="submit" style={s.btn}>Search</button>
      </form>

      {/* Erreur */}
      {error && <div style={{ color: "red", marginBottom: 16 }}>{error}</div>}

      {/* Tableau */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 40, color: "#888" }}>Loading...</div>
      ) : (
        <table style={s.table}>
          <thead>
            <tr>
              <th style={s.th}>#</th>
              <th style={s.th}>Title</th>
              <th style={s.th}>Difficulty</th>
              <th style={s.th}>Languages</th>
              <th style={s.th}>Acceptance Rate</th>
              <th style={s.th}>XP</th>
            </tr>
          </thead>
          <tbody>
            {challenges.length === 0 ? (
              <tr><td colSpan={6} style={{ ...s.td, textAlign: "center", color: "#888" }}>No challenges found</td></tr>
            ) : challenges.map((c, i) => {
              const diff = DIFFICULTY_COLORS[c.difficulty] ?? { bg: "#f0f0f0", color: "#333", label: c.difficulty };
              return (
                <tr
                  key={c._id}
                  style={s.row}
                  onClick={() => navigate(`/challenges/${c._id}`)}
                  onMouseEnter={e => (e.currentTarget.style.background = "#f9f9ff")}
                  onMouseLeave={e => (e.currentTarget.style.background = "")}
                >
                  <td style={{ ...s.td, color: "#999" }}>{(page - 1) * 15 + i + 1}</td>
                  <td style={s.td}>
                    <div style={{ fontWeight: 600 }}>{c.title}</div>
                    <div style={{ marginTop: 4 }}>
                      {c.tags.slice(0, 3).map(t => <span key={t} style={s.tag}>{t}</span>)}
                    </div>
                  </td>
                  <td style={s.td}>
                    <span style={{ ...s.badge, background: diff.bg, color: diff.color }}>{diff.label}</span>
                  </td>
                  <td style={s.td}>
                    {c.languages.map(l => <span key={l} style={{ ...s.tag, background: "#e0e7ff", color: "#3730a3" }}>{l}</span>)}
                  </td>
                  <td style={{ ...s.td, color: acceptanceRate(c) > 50 ? "#16a34a" : "#dc2626" }}>
                    {acceptanceRate(c)}%
                  </td>
                  <td style={{ ...s.td, fontWeight: 700, color: "#f59e0b" }}>+{c.xpReward} XP</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={s.pagination}>
          <button style={s.pgBtn} disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Previous</button>
          <span style={{ padding: "6px 14px", fontSize: 14, color: "#666" }}>Page {page} / {totalPages}</span>
          <button style={s.pgBtn} disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Next →</button>
        </div>
      )}
    </div>
  );

};

export default Challenges;
