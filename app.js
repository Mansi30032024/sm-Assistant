import express from "express";
import axios from "axios";
import admin from "firebase-admin";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

const cuQAData = JSON.parse(fs.readFileSync("./data/cu_qa.json", "utf-8"));

const app = express();
app.use(express.json());
app.use(express.static("public"));

console.log("Private key length:", process.env.FIREBASE_PRIVATE_KEY.length);

// Firebase Setup
admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  }),
  databaseURL: process.env.FIREBASE_DATABASE_URL,
});

const db = admin.database();
const messagesRef = db.ref("messages");
function findAnswer(userQuestion) {
  const q = userQuestion.toLowerCase().trim();

  for (let item of cuQAData) {
    const cuQuestion = item.question.toLowerCase().trim();

    // 1️⃣ Exact match
    if (q === cuQuestion) return item.answer;

    // 2️⃣ Full phrase inclusion
    if (cuQuestion.includes(q) && q.length > 10) return item.answer; 
    // only match inclusion if question is long enough

    // 3️⃣ Word overlap: at least 3 meaningful words match
    const stopwords = ["the", "is", "in", "for", "of", "and", "to", "a"];
    const cuWords = cuQuestion
      .split(" ")
      .filter((w) => w.length > 3 && !stopwords.includes(w));
    const qWords = q.split(" ").filter((w) => w.length > 3 && !stopwords.includes(w));
    const common = cuWords.filter((word) => qWords.includes(word));

    if (common.length >= 3) return item.answer; // stricter overlap
  }

  return null; // fallback to Gemini
}


// -------------------
// Helper: Format AI Response
// -------------------
function formatAIResponse(rawText) {
  if (!rawText) return "";

  let formatted = rawText.replace(/\n{2,}/g, "\n");
  formatted = formatted.replace(/\*\*(.*?)\*\*/g, "<b>$1</b>");

  const paragraphs = formatted.split(/\n/).filter((p) => p.trim() !== "");
  return paragraphs.join("<br><br>");
}

// -------------------
// API Endpoint
// -------------------
app.post("/api/message", async (req, res) => {
  try {
    const { message } = req.body;
    console.log("User Question:", message);

    await messagesRef.push({ sender: "user", text: message });

    let aiMessage = findAnswer(message);

    if (!aiMessage) {
      const response = await axios.post(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
        { contents: [{ role: "user", parts: [{ text: message }] }] },
        {
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": process.env.GEMINI_API_KEY,
          },
        }
      );

      console.log("Gemini Raw Response:", response.data);

      aiMessage =
        response.data?.candidates?.[0]?.content?.parts?.[0]?.text ||
        "Sorry, I couldn't generate a response.";
    }

    aiMessage = formatAIResponse(aiMessage);
    await messagesRef.push({ sender: "ai", text: aiMessage });

    res.json({ aiMessage });
  } catch (error) {
    console.error("AI Error:", error.response?.data || error.message);
    res.status(500).json({ error: "Something went wrong." });
  }
});

// -------------------
// Start Server
// -------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`Server running on http://localhost:${PORT}`)
);
