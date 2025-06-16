const socket = io();
const messagesDiv = document.getElementById("messages");
const form = document.getElementById("msgForm");
const input = document.getElementById("msgInput");
const parentInput = document.getElementById("parentId");
const cancelBtn = document.getElementById("cancelReply");

// Load chat history on connect
socket.on("connect", () => {
  socket.emit("load_history");
});

socket.on("history", (msgs) => {
  messagesDiv.innerHTML = "";
  msgs.forEach(addMessage);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
});

socket.on("new_message", addMessage);

function addMessage(msg) {
  const div = document.createElement("div");
  div.className = "message" + (msg.parent_id ? " reply" : "");
  div.innerHTML = `
    <div class="meta">
      <strong>${msg.username}</strong> @ ${msg.timestamp}
      <button class="replyBtn" data-id="${msg.id}">Reply</button>
    </div>
    <div class="text">${msg.text}</div>
  `;
  messagesDiv.appendChild(div);
  div.querySelector(".replyBtn").onclick = () => {
    parentInput.value = msg.id;
    cancelBtn.style.display = "inline-block";
    input.focus();
  };
}

// Send new message
form.addEventListener("submit", (e) => {
  e.preventDefault();
  if (!input.value) return;
  socket.emit("send_message", {
    text: input.value,
    parent_id: parentInput.value || null
  });
  input.value = "";
  parentInput.value = "";
  cancelBtn.style.display = "none";
});

// Cancel reply
cancelBtn.addEventListener("click", () => {
  parentInput.value = "";
  cancelBtn.style.display = "none";
});
