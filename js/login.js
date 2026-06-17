document.addEventListener('DOMContentLoaded', () => {
  if (isAuthenticated()) {
    window.location.replace('dashboard.html');
    return;
  }
  const form = document.getElementById('loginForm');
  const errorDiv = document.getElementById('loginError');
  const btnText = document.getElementById('loginBtnText');
  const btnSpinner = document.getElementById('loginBtnSpinner');
  form.onsubmit = async (e) => {
    e.preventDefault();
    errorDiv.classList.add('d-none');
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value.trim();
    if (!username || !password) {
      errorDiv.textContent = 'Username va parolni kiriting';
      errorDiv.classList.remove('d-none');
      return;
    }
    btnText.textContent = 'Kirish...';
    btnSpinner.classList.remove('d-none');
    try {
      await apiLogin(username, password);
      window.location.replace('dashboard.html');
    } catch (err) {
      errorDiv.textContent = err.message || 'Login xatosi';
      errorDiv.classList.remove('d-none');
      btnText.textContent = 'Kirish';
      btnSpinner.classList.add('d-none');
    }
  };
});
