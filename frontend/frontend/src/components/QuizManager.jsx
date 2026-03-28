import { useState, useEffect } from "react";

const C = {
  surface: "#111318",
  surface2: "#181b22",
  text: "#e8e8ec",
  text2: "#9a9eb0",
  text3: "#5a6070",
  gold: "#d4a843",
  goldDim: "rgba(212,168,67,0.1)",
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
  fontFamily: "'JetBrains Mono','Fira Mono',monospace",
  fontSize: 12,
  outline: "none",
};

const btnGold = {
  background: "#d4a843",
  border: "none",
  padding: "8px 16px",
  borderRadius: 6,
  fontFamily: "'JetBrains Mono','Fira Mono',monospace",
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
  fontFamily: "'JetBrains Mono','Fira Mono',monospace",
  fontSize: 11,
  color: "#9a9eb0",
  cursor: "pointer",
};

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

  const loadQuizzes = async () => {
    try {
      const res = await api.get(`/courses/lessons/${lesson.id}/quizzes`);
      setQuizzes(res.data || []);
    } catch (err) {
      console.error("Failed to load quizzes:", err);
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
        showToast("Quiz created successfully");
      } else {
        await api.patch(`/courses/admin/quizzes/${editingQuiz.id}`, quizForm);
        showToast("Quiz updated successfully");
      }
      await loadQuizzes();
      setEditingQuiz(null);
      setQuizForm({
        question: "",
        options: ["", "", "", ""],
        correct_answer: 0,
        explanation: "",
        points_awarded: 10,
        order: 0
      });
    } catch (err) {
      console.error("Failed to save quiz:", err);
      showToast(err.response?.data?.detail || "Failed to save quiz");
    }
  };

  const deleteQuiz = async (quizId) => {
    if (!window.confirm("Are you sure you want to delete this quiz?")) return;
    try {
      await api.delete(`/courses/admin/quizzes/${quizId}`);
      showToast("Quiz deleted successfully");
      await loadQuizzes();
    } catch (err) {
      console.error("Failed to delete quiz:", err);
      showToast(err.response?.data?.detail || "Failed to delete quiz");
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: C.surface, borderRadius: 12, width: 800, maxWidth: "90vw", maxHeight: "80vh", overflow: "auto", padding: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ fontFamily: C.display, fontSize: 20, color: C.text }}>Quizzes: {lesson.title}</h2>
          <button onClick={onClose} style={btnOutline}>✕</button>
        </div>
        
        <div style={{ marginBottom: 20, display: "flex", justifyContent: "flex-end" }}>
          <button onClick={() => setEditingQuiz({ new: true })} style={btnGold}>+ Add Quiz</button>
        </div>

        {quizzes.length === 0 ? (
          <div style={{ textAlign: "center", padding: 40, color: C.text3 }}>No quizzes yet. Click "Add Quiz" to create one.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {quizzes.map((q, idx) => (
              <div key={q.id} style={{ background: C.surface2, borderRadius: 8, padding: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, marginBottom: 8 }}>Q{idx + 1}: {q.question}</div>
                    <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
                      {q.options.map((opt, optIdx) => (
                        <span key={optIdx} style={{ fontSize: 11, padding: "2px 6px", borderRadius: 4, background: optIdx === q.correct_answer ? C.greenDim : "transparent", color: optIdx === q.correct_answer ? C.green : C.text3 }}>
                          {String.fromCharCode(65 + optIdx)}: {opt}
                        </span>
                      ))}
                    </div>
                    {q.explanation && <div style={{ fontSize: 10, color: C.text3 }}>📝 {q.explanation}</div>}
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => {
                      setEditingQuiz(q);
                      setQuizForm({
                        question: q.question,
                        options: q.options,
                        correct_answer: q.correct_answer,
                        explanation: q.explanation || "",
                        points_awarded: q.points_awarded,
                        order: q.order
                      });
                    }} style={{ ...btnOutline, padding: "4px 8px", fontSize: 9 }}>Edit</button>
                    <button onClick={() => deleteQuiz(q.id)} style={{ ...btnOutline, padding: "4px 8px", fontSize: 9, color: C.red }}>Delete</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {editingQuiz && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 1001, display: "flex", alignItems: "center", justifyContent: "center" }}
            onClick={e => e.target === e.currentTarget && setEditingQuiz(null)}>
            <div style={{ background: C.surface, borderRadius: 12, width: 700, maxWidth: "90vw", padding: 24 }}>
              <h2 style={{ fontFamily: C.display, fontSize: 20, marginBottom: 20 }}>{editingQuiz.new ? "Create Quiz" : "Edit Quiz"}</h2>
              
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 9, color: C.text3, marginBottom: 7 }}>QUESTION</div>
                <textarea value={quizForm.question} onChange={e => setQuizForm(p => ({...p, question: e.target.value}))} rows={3} style={inputStyle} />
              </div>

              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 9, color: C.text3, marginBottom: 7 }}>OPTIONS</div>
                {quizForm.options.map((opt, idx) => (
                  <div key={idx} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                    <span style={{ width: 30, paddingTop: 8 }}>{String.fromCharCode(65 + idx)}:</span>
                    <input value={opt} onChange={e => {
                      const newOpts = [...quizForm.options];
                      newOpts[idx] = e.target.value;
                      setQuizForm(p => ({...p, options: newOpts}));
                    }} style={{ flex: 1, ...inputStyle }} />
                  </div>
                ))}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 9, color: C.text3, marginBottom: 7 }}>CORRECT ANSWER</div>
                  <select value={quizForm.correct_answer} onChange={e => setQuizForm(p => ({...p, correct_answer: parseInt(e.target.value)}))} style={inputStyle}>
                    {quizForm.options.map((_, idx) => <option key={idx} value={idx}>{String.fromCharCode(65 + idx)}</option>)}
                  </select>
                </div>
                <div>
                  <div style={{ fontSize: 9, color: C.text3, marginBottom: 7 }}>POINTS</div>
                  <input type="number" value={quizForm.points_awarded} onChange={e => setQuizForm(p => ({...p, points_awarded: parseInt(e.target.value)}))} style={inputStyle} />
                </div>
              </div>

              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 9, color: C.text3, marginBottom: 7 }}>EXPLANATION (optional)</div>
                <textarea value={quizForm.explanation} onChange={e => setQuizForm(p => ({...p, explanation: e.target.value}))} rows={2} style={inputStyle} />
              </div>

              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button onClick={() => setEditingQuiz(null)} style={btnOutline}>Cancel</button>
                <button onClick={saveQuiz} style={btnGold}>{editingQuiz.new ? "Create" : "Save"}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
