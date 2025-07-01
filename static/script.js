document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('revenueForm');
  const loginBtn = document.getElementById('loginBtn');
  const calculateBtn = document.getElementById('calculateBtn');
  const stopBtn = document.getElementById('stopBtn');
  const clearBtn = document.getElementById('clearBtn');
  const otpSection = document.getElementById('otpSection');
  const output = document.getElementById('output');
  const pageType = document.getElementById('page_type');
  const gameType = document.getElementById('game_type');

  let controller = null;
  let reading = false;

  // Disable game type dropdown if Match History is selected
  pageType.addEventListener('change', () => {
    gameType.disabled = pageType.value === 'match_history';
  });

  function appendOutput(text) {
    output.textContent += text;
    output.scrollTop = output.scrollHeight;
  }

  function setFormDisabled(state) {
    const elements = form.querySelectorAll('input, select, button');
    elements.forEach(el => {
      if (el !== stopBtn) el.disabled = state;
    });
  }

  function resetUI() {
    otpSection.style.display = 'none';
    setFormDisabled(false);
    calculateBtn.disabled = true;
    loginBtn.disabled = false;
    stopBtn.disabled = true;
    clearBtn.disabled = false;
    gameType.disabled = pageType.value === 'match_history';
    reading = false;
  }

  resetUI();

  loginBtn.addEventListener('click', async () => {
    output.textContent = 'Checking login...\n';
    loginBtn.disabled = true;
    calculateBtn.disabled = true;
    otpSection.style.display = 'none';

    const formData = new FormData(form);
    try {
      const res = await fetch('/check_login', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();

      if (data.status === 'success') {
        appendOutput('Login successful, now click calculate to check Revenue..!\n');
        calculateBtn.disabled = false;
      } else if (data.status === 'otp_required') {
        appendOutput('OTP required. Please enter OTP.\n');
        otpSection.style.display = 'block';
        calculateBtn.disabled = false;
      } else {
        appendOutput(`Login failed: ${data.message || 'Unknown error'}\n`);
        loginBtn.disabled = false;
      }
    } catch (err) {
      appendOutput(`Error during login: ${err.message}\n`);
      loginBtn.disabled = false;
    }
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    output.textContent = '';

    const formData = new FormData(form); 
    setFormDisabled(true); 
    stopBtn.disabled = false;
    reading = true;

    controller = new AbortController();

    for (let [key, value] of formData.entries()) {
    console.log(`${key}: ${value}`);
  }


    try {
      const res = await fetch('/calculate', {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });

      if (!res.ok) {
        appendOutput(`Server error: ${res.statusText}\n`);
        resetUI();
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      while (reading) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        appendOutput(chunk);
      }

    } catch (err) {
      if (err.name === 'AbortError') {
        appendOutput('\nTest Abort.\n');
      } else {
        appendOutput(`\nError during calculation: ${err.message}\n`);
      }
    } finally {
      controller = null;
      resetUI();
    }
  });

  stopBtn.addEventListener('click', () => {
    if (controller) {
      controller.abort();
      controller = null;
    }
    stopBtn.disabled = true;
    reading = false;
    calculateBtn.disabled = false;
    loginBtn.disabled = false;
  });

  clearBtn.addEventListener('click', () => {
    output.textContent = '';
    reading = false;
    if (controller) {
      controller.abort();
      controller = null;
    }
    resetUI();
  });
});
