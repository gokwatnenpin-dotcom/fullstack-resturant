"use strict";

const tabLogin = document.getElementById("tabLogin");
const tabRegister = document.getElementById("tabRegister");
const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");
const errorBox = document.getElementById("authError");
const successBox = document.getElementById("authSuccess");

function showError(msg) {
  errorBox.textContent = msg;
  errorBox.style.display = "block";
  successBox.style.display = "none";
}

function showSuccess(msg) {
  successBox.textContent = msg;
  successBox.style.display = "block";
  errorBox.style.display = "none";
}

tabLogin.addEventListener("click", () => {
  tabLogin.classList.add("active");
  tabRegister.classList.remove("active");
  loginForm.style.display = "block";
  registerForm.style.display = "none";
  errorBox.style.display = "none";
});

tabRegister.addEventListener("click", () => {
  tabRegister.classList.add("active");
  tabLogin.classList.remove("active");
  registerForm.style.display = "block";
  loginForm.style.display = "none";
  errorBox.style.display = "none";
});

async function postJson(url, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error((data && data.error && data.error.message) || (data && data.message) || `Request failed (${res.status})`);
  }
  return data;
}

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  try {
    const data = await postJson("/api/auth/login", {
      email: document.getElementById("loginEmail").value.trim(),
      password: document.getElementById("loginPassword").value,
    });
    localStorage.setItem("bf_user", JSON.stringify(data.data));
    window.location.href = "/";
  } catch (err) {
    showError(err.message);
  }
});

registerForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  try {
    await postJson("/api/auth/register", {
      name: document.getElementById("regName").value.trim(),
      email: document.getElementById("regEmail").value.trim(),
      phone: document.getElementById("regPhone").value.trim(),
      password: document.getElementById("regPassword").value,
    });
    showSuccess("Account created! You can now log in.");
    registerForm.reset();
    tabLogin.click();
  } catch (err) {
    showError(err.message);
  }
});

// If already logged in, go straight to the app
try {
  if (JSON.parse(localStorage.getItem("bf_user"))) {
    window.location.href = "/";
  }
} catch (_) {}
