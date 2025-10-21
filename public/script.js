const chatBox = document.querySelector(".chat-box");
const userInput = document.getElementById("user-input");
const sendBtn = document.getElementById("send-btn");

function appendMessage(text, sender) {
  const msgDiv = document.createElement("div");
  msgDiv.classList.add("message");

  // ✅ Add correct class based on sender
  if (sender === "user") {
    msgDiv.classList.add("user-message");
  } else if (sender === "ai") {
    msgDiv.classList.add("ai-message");
  }

  msgDiv.innerHTML = text;
  chatBox.appendChild(msgDiv);
  chatBox.scrollTop = chatBox.scrollHeight;
}

sendBtn.addEventListener("click", async () => {
  const message = userInput.value.trim();
  if (!message) return;

  // Append user message
  appendMessage(message, "user");
  userInput.value = "";

  try {
    const response = await fetch("/api/message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    });

    const data = await response.json();
    // Append AI message
    appendMessage(data.aiMessage, "ai");
  } catch (err) {
    console.error(err);
    appendMessage("Error: Could not get response from AI.", "ai");
  }
});

// Optional: send message on Enter key
userInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") sendBtn.click();
});
