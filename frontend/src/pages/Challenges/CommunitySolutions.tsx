import React, { useEffect, useState } from "react";
import axios from "axios";
import { ThumbsUp, Code as CodeIcon, Clock, HardDrive } from "lucide-react";
import ReactMarkdown from "react-markdown";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

interface Solution {
  _id: string;
  user: { _id: string; username: string };
  code: string;
  language: string;
  explanation: string;
  timeComplexity: string;
  spaceComplexity: string;
  upvotes: number;
  upvotedBy: string[];
  createdAt: string;
}

interface CommunitySolutionsProps {
  challengeId: string;
}

const CommunitySolutions: React.FC<CommunitySolutionsProps> = ({ challengeId }) => {
  const [solutions, setSolutions] = useState<Solution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [sortBy, setSortBy] = useState("upvotes");

  const [expandedSolutionId, setExpandedSolutionId] = useState<string | null>(null);

  const fetchSolutions = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/challenges/${challengeId}/solutions`, {
        params: { page, limit: 10, sortBy }
      });
      setSolutions(res.data.solutions);
      setTotalPages(res.data.totalPages);
    } catch (err: any) {
      setError("Erreur lors de la récupération des solutions communautaires.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSolutions();
  }, [challengeId, page, sortBy]);

  const handleUpvote = async (solutionId: string) => {
    const token = localStorage.getItem("access_token");
    if (!token) return;

    try {
      const res = await axios.post(`${API_URL}/challenges/solutions/${solutionId}/upvote`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Update local state
      setSolutions(prev => prev.map(s => 
        s._id === solutionId ? { ...s, upvotes: res.data.upvotes, upvotedBy: res.data.upvotedBy } : s
      ));
    } catch (err) {
      console.error("Upvote failed", err);
    }
  };

  if (loading && solutions.length === 0) return <div style={{ padding: 20 }}>Chargement des solutions...</div>;
  if (error) return <div style={{ padding: 20, color: "red" }}>{error}</div>;

  return (
    <div style={{ padding: '20px 24px', height: '100%', overflowY: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h3 style={{ margin: 0, fontSize: 18, color: '#111827' }}>Solutions communautaires</h3>
        <select 
          value={sortBy} 
          onChange={(e) => setSortBy(e.target.value)}
          style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #d1d5db', background: '#fff' }}
        >
          <option value="upvotes">Les plus votées</option>
          <option value="recent">Plus récentes</option>
        </select>
      </div>

      {solutions.length === 0 ? (
        <p style={{ color: '#6b7280' }}>Aucune solution n'a encore été publiée. Soyez le premier !</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {solutions.map(sol => {
            const isExpanded = expandedSolutionId === sol._id;
            return (
              <div key={sol._id} style={{ border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff', overflow: 'hidden' }}>
                {/* Header */}
                <div 
                  style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f9fafb', cursor: 'pointer', borderBottom: isExpanded ? '1px solid #e5e7eb' : 'none' }}
                  onClick={() => setExpandedSolutionId(isExpanded ? null : sol._id)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 16, background: '#4f46e5', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600 }}>
                      {sol.user.username.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, color: '#111827' }}>{sol.user.username}</div>
                      <div style={{ fontSize: 12, color: '#6b7280' }}>{sol.language} • il y a {new Date(sol.createdAt).toLocaleDateString()}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#6b7280', fontSize: 13 }}>
                      <Clock size={14} /> {sol.timeComplexity}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#6b7280', fontSize: 13 }}>
                      <HardDrive size={14} /> {sol.spaceComplexity}
                    </div>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleUpvote(sol._id); }}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', background: 'transparent', border: '1px solid #d1d5db', borderRadius: 6, cursor: 'pointer', color: '#4b5563', fontWeight: 500 }}
                    >
                      <ThumbsUp size={14} color="#f59e0b" /> {sol.upvotes}
                    </button>
                  </div>
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <div style={{ padding: 16 }}>
                    {sol.explanation && (
                      <div style={{ marginBottom: 16, fontSize: 14, color: '#374151', lineHeight: 1.6 }} className="markdown-body">
                        <ReactMarkdown>{sol.explanation}</ReactMarkdown>
                      </div>
                    )}
                    <div style={{ background: '#1e1e1e', padding: 16, borderRadius: 6, position: 'relative' }}>
                      <div style={{ position: 'absolute', top: 8, right: 12, color: '#9ca3af', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <CodeIcon size={14} /> {sol.language}
                      </div>
                      <pre style={{ margin: 0, fontFamily: 'monospace', color: '#d4d4d4', fontSize: 13, overflowX: 'auto', paddingTop: 16 }}>
                        <code>{sol.code}</code>
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 24, gap: 8 }}>
          <button 
            disabled={page === 1} 
            onClick={() => setPage(p => p - 1)}
            style={{ padding: '6px 12px', border: '1px solid #d1d5db', background: page === 1 ? '#f3f4f6' : '#fff', borderRadius: 6, cursor: page === 1 ? 'not-allowed' : 'pointer' }}
          >Précédent</button>
          <span style={{ display: 'flex', alignItems: 'center', fontSize: 14 }}>Page {page} / {totalPages}</span>
          <button 
            disabled={page === totalPages} 
            onClick={() => setPage(p => p + 1)}
            style={{ padding: '6px 12px', border: '1px solid #d1d5db', background: page === totalPages ? '#f3f4f6' : '#fff', borderRadius: 6, cursor: page === totalPages ? 'not-allowed' : 'pointer' }}
          >Suivant</button>
        </div>
      )}
    </div>
  );
};

export default CommunitySolutions;
