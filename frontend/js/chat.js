/* MediCare AI — assistant chat
   One chat controller shared by the full chat page (chatbot.html) and the floating widget.
   Every assistant reply comes from POST /chatbot/message (the configured Gemini/OpenAI service
   behind the backend). Nothing here fabricates a reply: if the service fails, the person sees an
   error with a Retry action. API keys live only in the backend config, never in this bundle. */

const CHAT_STARTERS = [
  'How can I book an appointment?',
  'Help me find a doctor.',
  'What should I bring to my appointment?',
  'How can I view my upcoming appointments?',
  'Where can I find my prescription?',
];

const CHAT_INTRO = {
  title: 'MediCare AI assistant',
  text: "Ask about using MediCare or about general health topics. I can't diagnose conditions or prescribe medicine, and I'm not a substitute for a doctor.",
};

function createChat(root) {
  const $ = (sel) => root.querySelector(sel);
  const els = {
    log: $('[data-chat-log]'), form: $('[data-chat-form]'), input: $('[data-chat-input]'),
    send: $('[data-chat-send]'), starters: $('[data-chat-starters]'), mic: $('[data-chat-mic]'),
  };
  const state = { sessionId: null, sending: false, onSessionsChanged: null };

  function scrollDown() { els.log.scrollTop = els.log.scrollHeight; }
  const clock = () => new Date().toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });

  function renderIntro() {
    const intro = document.createElement('div');
    intro.className = 'callout';
    intro.setAttribute('data-intro', '');
    intro.innerHTML = `${icon('bot', { size: 20 })}<div><strong>${esc(CHAT_INTRO.title)}</strong><br><span>${esc(CHAT_INTRO.text)}</span></div>`;
    els.log.appendChild(intro);
  }

  function renderStarters() {
    if (!els.starters) return;
    els.starters.classList.remove('hidden');
    els.starters.innerHTML = CHAT_STARTERS.map((s) => `<button type="button" class="chip" data-starter>${esc(s)}</button>`).join('');
    els.starters.querySelectorAll('[data-starter]').forEach((b) => b.addEventListener('click', () => send(b.textContent)));
  }

  function append(sender, text, opts = {}) {
    const isUser = sender === 'USER';
    const row = document.createElement('div');
    row.className = `msg ${isUser ? 'user' : 'assistant'}${opts.emergency ? ' is-emergency' : ''}${opts.error ? ' is-error' : ''}`;
    const body = document.createElement('div');
    const bubble = document.createElement('div');
    bubble.className = 'bubble';
    bubble.textContent = text; // textContent: model output is never interpreted as HTML
    body.appendChild(bubble);
    if (opts.emergency) {
      const note = document.createElement('div');
      note.className = 'callout is-danger';
      note.style.marginTop = '8px';
      note.innerHTML = `${icon('siren', { size: 18 })}<div>This may be an emergency. Call <a href="tel:112" class="link" style="color:inherit;text-decoration:underline">112</a> or go to the nearest hospital now.</div>`;
      body.appendChild(note);
    }
    if (opts.retry) {
      const retry = document.createElement('button');
      retry.type = 'button';
      retry.className = 'btn btn-secondary btn-sm';
      retry.style.marginTop = '8px';
      retry.innerHTML = `${icon('rotate-ccw', { size: 14 })}Retry`;
      retry.addEventListener('click', () => { row.remove(); send(opts.retry, { isRetry: true }); });
      body.appendChild(retry);
    }
    if (opts.time !== false) {
      const t = document.createElement('div');
      t.className = 'time';
      t.style.textAlign = isUser ? 'right' : 'left';
      t.textContent = opts.timeText || clock();
      body.appendChild(t);
    }
    row.appendChild(body);
    els.log.appendChild(row);
    scrollDown();
  }

  function setTyping(on) {
    els.log.querySelector('[data-typing]')?.remove();
    if (!on) return;
    const row = document.createElement('div');
    row.className = 'msg assistant';
    row.setAttribute('data-typing', '');
    row.innerHTML = '<div class="bubble" role="status" aria-label="The assistant is replying"><span class="typing"><span></span><span></span><span></span></span></div>';
    els.log.appendChild(row);
    scrollDown();
  }

  function setSending(on) {
    state.sending = on;
    els.send.disabled = on;
    els.input.setAttribute('aria-busy', String(on));
  }

  async function send(raw, { isRetry = false } = {}) {
    const text = String(raw || '').trim();
    if (!text || state.sending) return; // blocks double-submits while a request is in flight
    setSending(true);
    if (!isRetry) append('USER', text);
    if (els.starters) els.starters.classList.add('hidden');
    els.input.value = '';
    autosize();
    setTyping(true);

    try {
      const response = await apiFetch('/chatbot/message', {
        method: 'POST',
        body: JSON.stringify({ sessionId: state.sessionId, message: text }),
        timeoutMs: 60000,
      });
      setTyping(false);
      if (!response || !String(response.reply || '').trim()) {
        append('AI', 'The assistant sent back an empty response.', { error: true, retry: text });
      } else {
        state.sessionId = response.sessionId || state.sessionId;
        append('AI', response.reply, { emergency: !!response.emergency });
        if (state.onSessionsChanged) state.onSessionsChanged();
      }
    } catch (err) {
      setTyping(false);
      append('AI', err.message || 'The assistant is unavailable right now.', { error: true, retry: text, time: false });
    } finally {
      setSending(false);
      els.input.focus();
    }
  }

  function autosize() {
    els.input.style.height = 'auto';
    els.input.style.height = `${Math.min(els.input.scrollHeight, 140)}px`;
  }

  function reset() {
    state.sessionId = null;
    els.log.innerHTML = '';
    renderIntro();
    renderStarters();
    els.input.value = '';
    autosize();
    els.input.focus();
  }

  async function openSession(sessionId) {
    els.log.innerHTML = '';
    els.log.innerHTML = skeletonLines(3);
    try {
      const history = await apiFetch(`/chatbot/history/${encodeURIComponent(sessionId)}`);
      state.sessionId = sessionId;
      els.log.innerHTML = '';
      history.forEach((h) => append(h.sender, h.message, { emergency: h.emergency, timeText: h.createdAt ? formatDateTime(h.createdAt) : '' }));
      if (els.starters) els.starters.classList.add('hidden');
    } catch (err) {
      showError(els.log, err.message, () => openSession(sessionId));
    }
  }

  function initVoice() {
    if (!els.mic) return;
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) { els.mic.remove(); return; }
    const rec = new Recognition();
    rec.lang = 'en-IN';
    rec.interimResults = false;
    let listening = false;
    els.mic.addEventListener('click', () => {
      if (listening) { rec.stop(); return; }
      try { rec.start(); } catch (e) { /* already started */ }
    });
    rec.addEventListener('start', () => { listening = true; els.mic.setAttribute('aria-pressed', 'true'); els.mic.style.color = 'var(--danger)'; });
    rec.addEventListener('end', () => { listening = false; els.mic.setAttribute('aria-pressed', 'false'); els.mic.style.color = ''; });
    rec.addEventListener('result', (e) => { els.input.value = e.results[0][0].transcript; autosize(); els.input.focus(); });
    rec.addEventListener('error', () => showToast('Voice input did not work. Check microphone permission and try again.', 'error'));
  }

  els.form.addEventListener('submit', (e) => { e.preventDefault(); send(els.input.value); });
  els.input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); send(els.input.value); }
  });
  els.input.addEventListener('input', autosize);
  initVoice();
  renderIntro();
  renderStarters();

  return { send, reset, openSession, state, focus: () => els.input.focus() };
}

/* Shared composer markup (page + widget). */
function chatComposerMarkup(placeholder) {
  return `
    <form class="composer" data-chat-form autocomplete="off">
      <button type="button" class="btn btn-secondary btn-icon" data-chat-mic aria-label="Dictate your message" aria-pressed="false">${icon('mic', { size: 20 })}</button>
      <label for="chat-input-${placeholder.length}" class="sr-only">Message</label>
      <textarea id="chat-input-${placeholder.length}" class="input" data-chat-input rows="1" placeholder="${esc(placeholder)}" maxlength="2000"></textarea>
      <button type="submit" class="btn btn-primary btn-icon" data-chat-send aria-label="Send message">${icon('send', { size: 20 })}</button>
    </form>`;
}

/* ---------------- Floating widget ---------------- */

const ChatWidget = (() => {
  let panel = null, controller = null, launcher = null;

  function build() {
    panel = document.createElement('section');
    panel.className = 'chat-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'AI health assistant');
    panel.innerHTML = `
      <header class="flex items-center justify-between gap-2 px-4" style="height:56px;background:var(--surface);border-bottom:1px solid var(--line)">
        <div class="flex items-center gap-2 min-w-0">
          <span class="brand-glyph" style="width:30px;height:30px">${icon('bot', { size: 18 })}</span>
          <div class="leading-tight min-w-0"><p class="text-sm font-bold" style="margin:0">AI assistant</p><p class="text-xs text-muted" style="margin:0">General information only</p></div>
        </div>
        <div class="flex items-center">
          <button type="button" class="btn btn-ghost btn-icon" data-chat-reset aria-label="Start a new conversation" title="New conversation">${icon('rotate-ccw', { size: 18 })}</button>
          <a href="chatbot.html" class="btn btn-ghost btn-icon" aria-label="Open full chat page" title="Open full page">${icon('external-link', { size: 18 })}</a>
          <button type="button" class="btn btn-ghost btn-icon" data-chat-close aria-label="Close assistant">${icon('x', { size: 20 })}</button>
        </div>
      </header>
      <div class="flex-1 overflow-y-auto p-4" style="min-height:0"><div class="chat-log" data-chat-log role="log" aria-live="polite" aria-label="Conversation"></div></div>
      <div class="px-3 pb-2 flex gap-2 overflow-x-auto" data-chat-starters style="flex-wrap:wrap;max-height:112px;overflow-y:auto"></div>
      ${chatComposerMarkup('Ask a question')}
      <p class="text-xs text-faint text-center" style="margin:0;padding:0 12px 10px;background:var(--surface)">Not a substitute for professional medical advice. Emergency? Call 112.</p>`;
    document.body.appendChild(panel);
    controller = createChat(panel);
    panel.querySelector('[data-chat-reset]').addEventListener('click', () => controller.reset());
    panel.querySelector('[data-chat-close]').addEventListener('click', close);
    panel.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
  }

  function open(opener) {
    launcher = opener || launcher;
    if (!panel) build();
    panel.classList.remove('hidden');
    if (launcher) launcher.classList.add('hidden');
    controller.focus();
  }
  function close() {
    if (panel) panel.classList.add('hidden');
    if (launcher) { launcher.classList.remove('hidden'); launcher.focus(); }
  }
  return { open, close };
})();

/* ---------------- Full chat page ---------------- */

async function loadChatSessions(controller) {
  const lists = ['session-list', 'session-list-mobile'].map((id) => document.getElementById(id)).filter(Boolean);
  try {
    const sessions = await apiFetch('/chatbot/sessions');
    const html = sessions.length ? sessions.map((s) => `
      <button type="button" class="menu-item" data-session="${esc(s.sessionId)}" style="border-radius:8px;flex-direction:column;align-items:flex-start;gap:2px">
        <span class="text-sm font-semibold" style="display:block;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(s.lastMessage || 'Conversation')}</span>
        <span class="text-xs text-faint">${esc(formatDateTime(s.lastMessageAt))}</span>
      </button>`).join('')
      : '<p class="text-sm text-muted" style="padding:8px 12px;margin:0">Your past conversations will appear here.</p>';
    lists.forEach((list) => {
      list.innerHTML = html;
      list.querySelectorAll('[data-session]').forEach((btn) => btn.addEventListener('click', () => {
        controller.openSession(btn.dataset.session);
        document.getElementById('history-panel')?.classList.add('hidden');
        document.getElementById('history-toggle')?.setAttribute('aria-expanded', 'false');
      }));
    });
  } catch (err) {
    lists.forEach((list) => { list.innerHTML = ''; showError(list, err.message, () => loadChatSessions(controller)); });
  }
}

async function initChatbotPage() {
  if (!Auth.requireAuth()) return;
  await initDashboardChrome({ crumbs: [['Dashboard', 'dashboard.html'], ['AI assistant']] });
  hydrateIcons();
  const controller = createChat(document.getElementById('chat-root'));
  controller.state.onSessionsChanged = () => loadChatSessions(controller);
  document.querySelectorAll('[data-chat-reset]').forEach((b) => b.addEventListener('click', () => controller.reset()));
  document.getElementById('history-toggle')?.addEventListener('click', () => {
    const panel = document.getElementById('history-panel');
    const open = panel.classList.toggle('hidden') === false;
    document.getElementById('history-toggle').setAttribute('aria-expanded', String(open));
  });
  loadChatSessions(controller);
}
