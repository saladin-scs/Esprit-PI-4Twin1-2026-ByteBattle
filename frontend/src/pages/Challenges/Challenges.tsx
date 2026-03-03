import { useEffect, useState } from "react";
import axios from "axios";

const API_URL = "http://localhost:3000/challenges";

function TestChallenges() {
  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(API_URL)
      .then(res => {
        console.log(res.data); // Affiche les données de l'API
        setChallenges(res.data.challenges || []); // adapte selon la structure
      })
      .catch(err => {
        console.error(err);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Chargement...</p>;
  if (!challenges.length) return <p>Aucun challenge trouvé.</p>;

  return (
    <div>
      <h1>Challenges</h1>
      <ul>
        {challenges.map((c: any) => (
          <li key={c._id}>{c.title} ({c.difficulty})</li>
        ))}
      </ul>
    </div>
  );
}

export default TestChallenges;