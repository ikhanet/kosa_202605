(async () => {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (session) {
    window.location.href = 'index.html';
  }
})();

const redirectTo = window.location.origin + '/index.html';

document.getElementById('btn-google').addEventListener('click', async () => {
  const { error } = await supabaseClient.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo },
  });
  if (error) showError(error.message);
});

document.getElementById('btn-github').addEventListener('click', async () => {
  const { error } = await supabaseClient.auth.signInWithOAuth({
    provider: 'github',
    options: { redirectTo },
  });
  if (error) showError(error.message);
});

document.getElementById('btn-login').addEventListener('click', async () => {
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  if (!email || !password) {
    showError('이메일과 비밀번호를 입력해주세요.');
    return;
  }
  const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error) {
    showError(error.message);
  } else {
    window.location.href = 'index.html';
  }
});

document.getElementById('btn-signup').addEventListener('click', async () => {
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  if (!email || !password) {
    showError('이메일과 비밀번호를 입력해주세요.');
    return;
  }
  const { error } = await supabaseClient.auth.signUp({ email, password });
  if (error) {
    showError(error.message);
  } else {
    showMessage('확인 이메일을 전송했습니다. 메일함을 확인해주세요.');
  }
});

document.getElementById('password').addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('btn-login').click();
});

function showError(msg) {
  const errEl = document.getElementById('auth-error');
  const msgEl = document.getElementById('auth-message');
  msgEl.hidden = true;
  errEl.textContent = msg;
  errEl.hidden = false;
}

function showMessage(msg) {
  const errEl = document.getElementById('auth-error');
  const msgEl = document.getElementById('auth-message');
  errEl.hidden = true;
  msgEl.textContent = msg;
  msgEl.hidden = false;
}
