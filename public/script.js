
const chatBox = document.getElementById("chat-box");
const userInput = document.getElementById("user-input");
const sendBtn = document.getElementById("send-btn");

sendBtn.addEventListener("click", sendMessage);
userInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") sendMessage();
});
window.onload = () => {
  appendMessage("ai", "Hi! I’m CU Smart Assistant..");
};


async function sendMessage() {
  const message = userInput.value.trim();
  if (!message) return;

  appendMessage("user", message);
  userInput.value = "";

  try {
    const response = await fetch("/api/message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    });

    const data = await response.json();
    appendMessage("ai", data.aiMessage);
  } catch (err) {
    appendMessage("ai", "Error: Could not get response from AI.");
    console.error(err);
  }
}

function appendMessage(sender, text) {
  const div = document.createElement("div");
  div.classList.add("message", sender === "user" ? "user-msg" : "ai-msg");
  div.textContent = text;
  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
}
function appendTyping() {
  const div = document.createElement("div");
  div.id = "typing";
  div.classList.add("message", "ai-msg");

  const dots = document.createElement("div");
  dots.classList.add("typing-dots");
  dots.innerHTML = "<span></span><span></span><span></span>"; // 3 animated dots

  div.appendChild(dots);
  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
}

