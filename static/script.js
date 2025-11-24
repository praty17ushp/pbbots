/* ---------- UI elements ---------- */
const messagesEl = document.getElementById('messages');
const inputEl = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');
const voiceToggle = document.getElementById('voiceToggle');
const voiceSelect = document.getElementById('voiceSelect');
const accentSelect = document.getElementById('accentSelect');
const clearNameBtn = document.getElementById('clearName');
const exportBtn = document.getElementById('exportChat');
const themeToggle = document.getElementById('themeToggle');
const statusEl = document.getElementById('status');

let recognition = null;
let voiceEnabled = false;
let userName = localStorage.getItem('pablo_name') || null;
let selectedVoice = null;
let voices = [];

/* ---------- helper: bubble append ---------- */
function appendBubble(text, who='bot', meta='') {
  const wrap = document.createElement('div');
  const bubble = document.createElement('div');
  bubble.className = 'bubble ' + (who === 'user' ? 'user' : 'bot');
  bubble.textContent = text;
  wrap.appendChild(bubble);
  if (meta) {
    const m = document.createElement('div'); m.className = 'meta'; m.textContent = meta; wrap.appendChild(m);
  }
  messagesEl.appendChild(wrap);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

/* ---------- typing indicator ---------- */
function showTyping() {
  const tWrap = document.createElement('div');
  const t = document.createElement('div');
  t.className = 'typing';
  t.innerHTML = '<span class="dot"></span><span class="dot"></span><span class="dot"></span>';
  tWrap.appendChild(t);
  messagesEl.appendChild(tWrap);
  messagesEl.scrollTop = messagesEl.scrollHeight;
  return tWrap;
}

/* ---------- TTS ---------- */
function populateVoices() {
  voices = window.speechSynthesis.getVoices();
  voiceSelect.innerHTML = '';
  voices.forEach((v, i) => {
    const opt = document.createElement('option');
    opt.value = i;
    opt.textContent = `${v.name} — ${v.lang}`;
    voiceSelect.appendChild(opt);
  });
  // select default matching accent if possible
  if (voices.length) {
    // choose first English voice
    const idx = voices.findIndex(v => /en(-|_)?US/i.test(v.lang) || /en/i.test(v.lang));
    selectedVoice = voices[idx > -1 ? idx : 0];
    voiceSelect.value = voices.indexOf(selectedVoice);
  }
}

if (window.speechSynthesis) {
  populateVoices();
  window.speechSynthesis.onvoiceschanged = populateVoices;
}

/* apply accent filter when user selects accent */
accentSelect.addEventListener('change', () => {
  const val = accentSelect.value;
  if (val === 'deep') {
    // leave voice selection alone; deep handled in speak()
    statusEl.textContent = 'Deep voice enabled';
    return;
  }
  // find first voice that matches the target lang code
  const voice = voices.find(v => v.lang && v.lang.toLowerCase().startsWith(val.toLowerCase()));
  if (voice) {
    selectedVoice = voice;
    voiceSelect.value = voices.indexOf(voice);
    statusEl.textContent = `Accent set: ${val}`;
  } else {
    statusEl.textContent = `Accent ${val} not found on your browser — choose any voice.`;
  }
});

/* manual voice choose */
voiceSelect.addEventListener('change', () => {
  const idx = parseInt(voiceSelect.value, 10);
  selectedVoice = voices[idx];
});

/* speak function with options */
function speak(text) {
  if (!voiceEnabled) return;
  if (!window.speechSynthesis) return;
  const utter = new SpeechSynthesisUtterance(text);

  // selectedVoice may be null on some systems
  if (selectedVoice) {
    utter.voice = selectedVoice;
  } else {
    const v = window.speechSynthesis.getVoices().find(v=>/en/i.test(v.lang));
    if (v) utter.voice = v;
  }

  // deep voice option: when accentSelect == 'deep'
  if (accentSelect.value === 'deep') {
    utter.rate = 0.85; utter.pitch = 0.6; // deeper
  } else {
    utter.rate = 1; utter.pitch = 1;
  }

  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utter);
}

/* ---------- SpeechRecognition (voice input) ---------- */
function initRecognition() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    statusEl.textContent = 'Voice input unsupported in this browser';
    voiceToggle.disabled = true;
    return;
  }
  recognition = new SR();
  recognition.lang = 'en-US';
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  recognition.onresult = (e) => {
    const text = e.results[0][0].transcript;
    inputEl.value = text;
    // auto-send after recognition
    setTimeout(() => sendMessage(), 120);
  };

  recognition.onend = () => {
    if (voiceEnabled) {
      // continuous mode
      try { recognition.start(); } catch(e) { /* ignore */ }
    }
  };

  recognition.onerror = (err) => {
    console.warn('Recognition error', err);
    statusEl.textContent = 'Voice recognition error';
  };
}

/* ---------- message send flow ---------- */
async function sendMessage() {
  const text = inputEl.value.trim();
  if (!text) return;
  appendBubble(text, 'user', new Date().toLocaleTimeString());
  inputEl.value = '';

  // client memory name capture
  if (text.toLowerCase().startsWith('my name is ')) {
    const name = text.substring(11).trim();
    if (name) { localStorage.setItem('pablo_name', name); userName = name; }
  }

  const t = showTyping();

  try {
    const res = await fetch('/chat', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({message: text})
    });
    const data = await res.json();
    t.remove();

    let reply = data.reply || "I didn't get that.";
    // personalize name reminders
    if (reply.includes("I'll remember your name") && userName) {
      reply = `Nice to meet you, ${userName}. I will remember your name in this browser.`;
    }

    appendBubble(reply, 'bot', new Date().toLocaleTimeString());
    speak(reply);
  } catch (err) {
    t.remove();
    appendBubble('Server error. Try again.', 'bot');
    console.error(err);
  }
}

/* ---------- controls ---------- */
sendBtn.addEventListener('click', sendMessage);
inputEl.addEventListener('keypress', (e)=> { if (e.key === 'Enter') sendMessage(); });

voiceToggle.addEventListener('click', ()=>{
  voiceEnabled = !voiceEnabled;
  voiceToggle.textContent = voiceEnabled ? '🎤 Voice: On' : '🎤 Voice: Off';
  if (voiceEnabled && !recognition) initRecognition();
  if (voiceEnabled && recognition) {
    try { recognition.start(); } catch(e){}
  } else if (recognition) recognition.stop();
});

clearNameBtn.addEventListener('click', ()=>{
  localStorage.removeItem('pablo_name'); userName = null;
  appendBubble('Name cleared from memory.', 'bot');
});

exportBtn.addEventListener('click', ()=>{
  let txt = '';
  document.querySelectorAll('.bubble').forEach(b => txt += b.textContent + '\n');
  const blob = new Blob([txt], {type:'text/plain'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = 'pablobot_chat.txt'; a.click();
  URL.revokeObjectURL(url);
});

themeToggle.addEventListener('change', (e)=>{
  document.body.setAttribute('data-theme', e.target.checked ? 'light' : 'dark');
});

/* ---------- on load ---------- */
window.addEventListener('load', ()=>{
  // greet
  appendBubble('Hello. I am PabloBot. Say "My name is ..." to teach me your name. Try "Give me game recommendations", "Tell a joke", "Tell the time".', 'bot');

  // populate voices (async)
  if (window.speechSynthesis) {
    window.speechSynthesis.onvoiceschanged = () => {
      voices = window.speechSynthesis.getVoices();
      voiceSelect.innerHTML = '';
      voices.forEach((v,i)=> {
        const opt = document.createElement('option');
        opt.value = i; opt.textContent = `${v.name} — ${v.lang}`;
        voiceSelect.appendChild(opt);
      });
      if (voices.length) { selectedVoice = voices[0]; voiceSelect.value = 0; }
    };
    // trigger populate
    window.speechSynthesis.getVoices();
  }

  // init recognition if available (not started)
  initRecognition();
});
