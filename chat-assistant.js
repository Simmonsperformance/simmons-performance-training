(() => {
  const config = window.SPT_ORDER_CONFIG;
  const launcher = document.querySelector('#spt-chat-launcher');
  const panel = document.querySelector('#spt-chat-panel');
  const closeButton = document.querySelector('#spt-chat-close');
  const form = document.querySelector('#spt-chat-form');
  const input = document.querySelector('#spt-chat-input');
  const sendButton = document.querySelector('#spt-chat-send');
  const messages = document.querySelector('#spt-chat-messages');
  const status = document.querySelector('#spt-chat-status');
  if (!launcher || !panel || !form || !input || !messages) return;

  const history = [];
  const endpoint = config?.supabaseUrl
    ? `${config.supabaseUrl}/functions/v1/customer-ai-assistant`
    : '';

  const setOpen = (open) => {
    panel.hidden = !open;
    launcher.setAttribute('aria-expanded', String(open));
    launcher.innerHTML = open
      ? '<span class="spt-chat-launcher-icon" aria-hidden="true">×</span><span>Close chat</span>'
      : '<span class="spt-chat-launcher-icon" aria-hidden="true">✦</span><span>Ask AI</span>';
    if (open) input.focus();
  };
  launcher.addEventListener('click', () => setOpen(panel.hidden));
  closeButton?.addEventListener('click', () => { setOpen(false); launcher.focus(); });

  const addMessage = (text, role) => {
    const node = document.createElement('div');
    node.className = `spt-chat-message ${role === 'user' ? 'spt-chat-user' : 'spt-chat-bot'}`;
    node.textContent = text;
    messages.append(node);
    messages.scrollTop = messages.scrollHeight;
  };

  const send = async (text) => {
    const message = String(text || '').trim();
    if (!message || sendButton.disabled) return;
    setOpen(true);
    document.querySelector('#spt-chat-quick').hidden = true;
    addMessage(message, 'user');
    history.push({ role: 'user', content: message });
    while (history.length > 12) history.shift();
    input.value = '';
    sendButton.disabled = true;
    status.textContent = 'Thinking…';
    try {
      if (!endpoint) throw new Error('The assistant is not configured yet.');
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(config?.publishableKey ? { apikey: config.publishableKey, Authorization: `Bearer ${config.publishableKey}` } : {})
        },
        body: JSON.stringify({ messages: history })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'The assistant could not respond right now.');
      const answer = String(data.reply || '').trim();
      if (!answer) throw new Error('The assistant returned an empty response.');
      addMessage(answer, 'assistant');
      history.push({ role: 'assistant', content: answer });
      while (history.length > 12) history.shift();
      status.textContent = '';
    } catch (error) {
      status.textContent = error instanceof Error ? error.message : 'Something went wrong. Please try again.';
      if (history[history.length - 1]?.role === 'user') history.pop();
    } finally {
      sendButton.disabled = false;
      input.focus();
    }
  };

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    void send(input.value);
  });
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      form.requestSubmit();
    }
  });
  document.querySelectorAll('[data-chat-prompt]').forEach((button) => {
    button.addEventListener('click', () => { void send(button.dataset.chatPrompt); });
  });
})();