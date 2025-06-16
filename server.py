import sqlite3
from flask import Flask, render_template, request, session, redirect, url_for
from flask_socketio import SocketIO, emit
from datetime import datetime
import pytz

# --- Config ---
PASSWORD = "Shayan"
DB_FILE = "chat.db"
TZ = pytz.timezone("Asia/Tehran")

app = Flask(__name__)
app.secret_key = "replace-with-a-secure-random-key"
socketio = SocketIO(app)

# --- Initialize DB ---
def init_db():
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute("""
    CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT,
        text TEXT,
        timestamp TEXT,
        parent_id INTEGER
    )""")
    conn.commit()
    conn.close()

init_db()

# --- Routes ---
@app.route("/", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        name = request.form.get("username", "").strip()
        pwd = request.form.get("password", "")
        if name and pwd == PASSWORD:
            session["username"] = name
            return redirect(url_for("chat"))
        return render_template("login.html", error="Invalid name or password.")
    return render_template("login.html", error=None)

@app.route("/chat")
def chat():
    if "username" not in session:
        return redirect(url_for("login"))
    return render_template("chat.html", username=session["username"])

@app.route("/logout")
def logout():
    session.clear()
    return redirect(url_for("login"))

# --- Socket.IO events ---
@socketio.on("send_message")
def handle_message(data):
    username = session.get("username", "Anonymous")
    text = data.get("text", "").strip()
    parent = data.get("parent_id")
    if not text:
        return
    ts = datetime.now(TZ).strftime("%Y-%m-%d %H:%M:%S")
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute(
        "INSERT INTO messages (username, text, timestamp, parent_id) VALUES (?, ?, ?, ?)",
        (username, text, ts, parent)
    )
    msg_id = c.lastrowid
    conn.commit()
    conn.close()
    emit("new_message", {
        "id": msg_id,
        "username": username,
        "text": text,
        "timestamp": ts,
        "parent_id": parent
    }, broadcast=True)

@socketio.on("load_history")
def load_history():
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute("SELECT id, username, text, timestamp, parent_id FROM messages ORDER BY id ASC")
    rows = c.fetchall()
    conn.close()
    history = [
        {"id": r[0], "username": r[1], "text": r[2], "timestamp": r[3], "parent_id": r[4]}
        for r in rows
    ]
    emit("history", history)

if __name__ == "__main__":
    socketio.run(app, host="0.0.0.0", port=8000)
