import { useState, useEffect } from "react";

export default function QuizManager({ lesson, onClose, api, showToast }) {
  const [quizzes, setQuizzes] = useState([]);
  const [editingQuiz, setEditingQuiz] = useState(null);
  const [quizForm, setQuizForm] = useState({
    question: "",
    options: ["", "", "", ""],
    correct_answer: 0,
    explanation: "",
    points_awarded: 10,
    order: 0
  });

  const C = {
    surface: "#111318",
    surface2: "#181b22",
    text: "#e8e8ec",
    text2: "#9a9eb0",
    text3: "#5a6070",
    gold: "#d4a843",
    green: "#3dd68c",
    greenDim: "rgba(61,214,140,0.1)",
    red: "#f04f5a",
    border: "rgba(255,255,255,0.06)",
    mono: "'JetBrains Mono','Fira Mono',monospace",
    sans: "'Inter','Segoe UI',sans-serif",
    display: "'Syne','Space Grotesk',sans-serif",
  };

  const inputStyle = {
    width: "100%",
    padding: "10px 12px",
    background: "#111318",
    border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: 8,
    color: "#e8e8ec",
    fontFamily: C.mono,
    fontSize: 12,
    outline: "none",
  };

  const btnGold = {
    background: C.gold,
    border: "none",
    padding: "8px 16px",
    borderRadius: 6,
    fontFamily: C.mono,
    fontSize: 11,
    fontWeight: 600,
    color: "#000",
    cursor: "pointer",
  };

  const btnOutline = {
    background: "transparent",
    border: "1px solid rgba(255,255,255,0.06)",
    padding: "8px 16px",
    borderRadius: 6,
    fontFamily: C.mono,
    fontSize: 11,
    color: "#9a9eb0",
    cursor: "pointer",
  };

  const loadQuizzes = async () => {
    try {
      const res = await api.get(`/courses/lessons/${lesson.id}/quizzes`);
      setQuizzes(res.data || []);
    } catch (err) {
      setQuizzes([]);
    }
  };

  useEffect(() => {
    loadQuizzes();
  }, [lesson.id]);

  const saveQuiz = async () => {
    try {
      if (editingQuiz.new) {
        await api.post(`/courses/admin/lessons/${lesson.id}/quizzes`, quizForm);
        showToast("Quiz created");
      } else {
        await api.patch(`/courses/admin/quizzes/${editingQuiz.id}`, quizForm);
        showToast("Quiz updated");
      }
      await loadQuizzes();
      setEditingQuiz(null);
      setQuizForm({ question: "", options: ["","","",""], correct_answer: 0, explanation: "", points_awarded: 10, order: 0 });
    } catch (err) {
      showToast("Failed to save quiz");
    }
  };

  const deleteQuiz = async (quizId) => {
    if (!confirm("Delete this quiz?")) return;
    try {
      await api.delete(`/courses/admin/quizzes/${quizId}`);
      showToast("Quiz deleted");
      await loadQuizzes();
    } catch (err) {
      showToast("Failed to delete quiz");
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: C.surface, borderRadius: 12, width: 800, maxWidth: "90vw", maxHeight: "80vh", overflow: "auto", padding: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ color: C.text }}>Quizzes: {lesson.title}</h2>
          <button onClick={onClose} style={btnOutline}>Close</button>
        </div>
        <div style={{ marginBottom: 20, textAlign: "right" }}>
          <button onClick={() => setEditingQuiz({ new: true })} style={btnGold}>+ Add Quiz</button>
        </div>
        {quizzes.length === 0 ? (
          <div style={{ textAlign: "center", padding: 40, color: C.text3 }}>No quizzes yet</div>
        ) : (
          quizzes.map((q, idx) => (
            <div key={q.id} style={{ background: C.surface2, borderRadius: 8, padding: 12, marginBottom: 12 }}>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>{idx+1}. {q.question}</div>
              <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                {q.options.map((opt, i) => (
                  <span key={i} style={{ padding: "2px 6px", borderRadius: 4, background: i === q.correct_answer ? C.greenDim : "transparent", color: i === q.correct_answer ? C.green : C.text3 }}>
                    {String.fromCharCode(65+i)}: {opt}
                  </span>
                ))}
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <button onClick={() => {
                  setEditingQuiz(q);
                  setQuizForm({ question: q.question, options: q.options, correct_answer: q.correct_answer, explanation: q.explanation || "", points_awarded: q.points_awarded, order: q.order });
                }} style={btnOutline}>Edit</button>
                <button onClick={() => deleteQuiz(q.id)} style={{ ...btnOutline, color: C.red }}>Delete</button>
              </div>
            </div>
          ))
        )}
        {editingQuiz && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 1001, display: "flex", alignItems: "center", justifyContent: "center" }}
            onClick={e => e.target === e.currentTarget && setEditingQuiz(null)}>
            <div style={{ background: C.surface, borderRadius: 12, width: 700, padding: 24 }}>
              <h3>{editingQuiz.new ? "Create Quiz" : "Edit Quiz"}</h3>
              <input placeholder="Question" value={quizForm.question} onChange={e => setQuizForm({...quizForm, question: e.target.value})} style={inputStyle} />
              {quizForm.options.map((opt, i) => (
                <input key={i} placeholder={`Option ${String.fromCharCode(65+i)}`} value={opt} onChange={e => {
                  const newOpts = [...quizForm.options];
                  newOpts[i] = e.target.value;
                  setQuizForm({...quizForm, options: newOpts});
                }} style={{...inputStyle, marginTop: 8}} />
              ))}
              <select value={quizForm.correct_answer} onChange={e => setQuizForm({...quizForm, correct_answer: parseInt(e.target.value)})} style={inputStyle}>
                {quizForm.options.map((_, i) => <option key={i} value={i}>{String.fromCharCode(65+i)}</option>)}
              </select>
              <input placeholder="Points" type="number" value={quizForm.points_awarded} onChange={e => setQuizForm({...quizForm, points_awarded: parseInt(e.target.value)})} style={inputStyle} />
              <textarea placeholder="Explanation" rows={2} value={quizForm.explanation} onChange={e => setQuizForm({...quizForm, explanation: e.target.value})} style={inputStyle} />
              <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                <button onClick={() => setEditingQuiz(null)} style={btnOutline}>Cancel</button>
                <button onClick={saveQuiz} style={btnGold}>Save</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
