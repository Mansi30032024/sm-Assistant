import express from "express";
import axios from "axios";
import admin from "firebase-admin";
import dotenv from "dotenv";
dotenv.config();

const app = express();
app.use(express.json());
app.use(express.static("public"));

console.log("Private key length:", process.env.FIREBASE_PRIVATE_KEY.length);

// -------------------
// Firebase Setup
// -------------------
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

// -------------------
// Gemini API Endpoint
// -------------------
app.post("/api/message", async (req, res) => {
  try {
    const { message } = req.body;

    // Save user message to Firebase
    await messagesRef.push({ sender: "user", text: message });

    // Gemini 2.5 Flash API call
    const response = await axios.post(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
      {
        contents: [
          {
            role: "user",
            parts: [{ text: message }],
          },
        ],
      },
      {
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": process.env.GEMINI_API_KEY,
        },
      }
    );

    console.log("Gemini Raw Response:", response.data);

    // Extract AI response
    const aiMessage =
      response.data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "Sorry, I couldn't generate a response.";

    // Save AI message to Firebase
    await messagesRef.push({ sender: "ai", text: aiMessage });

    res.json({ aiMessage });
  } catch (error) {
    console.error(
      "Gemini API Error:",
      error.response?.data || error.message
    );
    res.status(500).json({ error: "Gemini request failed." });
  }
});

// -------------------
// Start Server
// -------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`Server running on http://localhost:${PORT}`)
);
