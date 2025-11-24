from flask import Flask, render_template, request, jsonify
from datetime import datetime
import random

app = Flask(__name__, static_folder="static", template_folder="templates")

# ---------- Data (server brain) ----------
QA = {
    "hey give me game recommendations":
        "Red Dead Redemption 2, Ghost of Tsushima, Grand Theft Auto V, Hitman World of Assassination, Forza Horizon, Assassin's Creed, Ace Combat 7.",
    "list the greatest football players of all time":
        "The greatest football players include Cristiano Ronaldo, Lionel Messi, Sergio Ramos, and Neymar.",
    "what is the powerhouse of the cell": "The powerhouse of the cell is the mitochondria.",
    "list the best movies of all time":
        "Some of the best movies include Transformers, John Wick, Terminator, Fast and Furious, Fight Club, Red Notice, and The Avengers.",
    "list the most famous comic book characters":
        "Batman, Superman, Spider-Man, Iron Man, Deadpool, Black Widow, and Hulk."
}

JOKES = [
    "Do you want to hear a pizza joke? Nahhh, it's too cheesy!",
    "What did the buffalo say when his son left? Bison!",
    "What do you call a cold dog? A chili dog.",
    "Where do you learn to make banana splits? At sundae school.",
    "What did one ocean say to the other? Nothing, they just waved."
]

FACTS = [
    "Honey never spoils; archaeologists found edible honey in ancient tombs.",
    "Octopuses have three hearts.",
    "Bananas are berries but strawberries are not.",
    "A group of flamingos is called a flamboyance."
]

# ---------- helpers ----------
def now_time(): return datetime.now().strftime("%I:%M %p")
def now_date(): return datetime.now().strftime("%d %B %Y")
def now_day(): return datetime.now().strftime("%A")

def find_qa(msg: str):
    q = msg.lower()
    for k, v in QA.items():
        if k in q: return v
    return None

def generate_reply(message: str):
    t = message.lower().strip()

    # name pattern handled client-side memory too, but provide a reply
    if "my name is " in t:
        name = message.split("my name is",1)[1].strip()
        if name: return f"Nice to meet you, {name}. I will remember your name in this browser."

    if "what is my name" in t or "who am i" in t:
        return "I can remember your name in this browser if you tell me 'My name is ...'"

    # greetings
    if any(t.startswith(g) for g in ("hi","hello","hey","yo")):
        return "Hello. How may I assist you?"

    # predefined Q&A (check first)
    qa = find_qa(t)
    if qa: return qa

    # time/date/day (careful that 'all time' doesn't trigger time)
    if ("time" in t) and ("best movies of all time" not in t):
        return f"The current time is {now_time()}."
    if "date" in t:
        return f"Today's date is {now_date()}."
    if "day" in t:
        return f"Today is {now_day()}."

    # game specific
    if "game" in t and ("recommend" in t or "give" in t):
        return QA.get("hey give me game recommendations")

    # jokes / facts
    if "joke" in t: return random.choice(JOKES)
    if "fun fact" in t or "fact" in t: return random.choice(FACTS)

    # fallback
    small = ["Interesting — tell me more.","I see. Can you clarify?","Okay. What else would you like to ask?"]
    return random.choice(small)

# ---------- routes ----------
@app.route("/")
def index():
    return render_template("index.html")

@app.route("/chat", methods=["POST"])
def chat():
    payload = request.get_json() or {}
    msg = payload.get("message", "")
    reply = generate_reply(msg)
    return jsonify({"reply": reply})

if __name__ == "__main__":
    app.run(debug=True)
