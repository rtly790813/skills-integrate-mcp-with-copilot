document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  const loginBtn = document.getElementById("login-btn");
  const logoutBtn = document.getElementById("logout-btn");
  const currentUserSpan = document.getElementById("current-user");
  const loginModal = document.getElementById("login-modal");
  const loginForm = document.getElementById("login-form");
  const cancelLoginBtn = document.getElementById("cancel-login");

  // 簡單 localStorage 模擬登入狀態
  function getAuth() {
    const user = localStorage.getItem("username");
    const pass = localStorage.getItem("password");
    return user && pass ? { user, pass } : null;
  }
  function setAuth(user, pass) {
    localStorage.setItem("username", user);
    localStorage.setItem("password", pass);
  }
  function clearAuth() {
    localStorage.removeItem("username");
    localStorage.removeItem("password");
  }

  function updateAuthUI() {
    const auth = getAuth();
    if (auth) {
      currentUserSpan.textContent = `User: ${auth.user}`;
      loginBtn.classList.add("hidden");
      logoutBtn.classList.remove("hidden");
    } else {
      currentUserSpan.textContent = "未登入";
      loginBtn.classList.remove("hidden");
      logoutBtn.classList.add("hidden");
    }
  }

  // API fetch with basic auth
  async function apiFetch(url, options = {}) {
    const auth = getAuth();
    if (auth) {
      options.headers = options.headers || {};
      options.headers["Authorization"] =
        "Basic " + btoa(`${auth.user}:${auth.pass}`);
    }
    return fetch(url, options);
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await apiFetch("/activities");
      const activities = await response.json();
      activitiesList.innerHTML = "";
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';
      const auth = getAuth();
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";
        const spotsLeft = details.max_participants - details.participants.length;
        let participantsHTML = "";
        if (details.participants.length > 0) {
          participantsHTML = `<div class="participants-section">
              <h5>Participants:</h5>
              <ul class="participants-list">
                ${details.participants
                  .map((email) => {
                    // 老師可刪除所有人，學生只能刪除自己
                    let showDelete = false;
                    if (auth && auth.user.startsWith("teacher")) showDelete = true;
                    else if (auth && auth.user.startsWith("student")) {
                      const myEmail = `${auth.user}@mergington.edu`;
                      if (email === myEmail) showDelete = true;
                    }
                    return `<li><span class="participant-email">${email}</span>${showDelete ? `<button class="delete-btn" data-activity="${name}" data-email="${email}">❌</button>` : ""}</li>`;
                  })
                  .join("")}
              </ul>
            </div>`;
        } else {
          participantsHTML = `<p><em>No participants yet</em></p>`;
        }
        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-container">
            ${participantsHTML}
          </div>
        `;
        activitiesList.appendChild(activityCard);
        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
      document.querySelectorAll(".delete-btn").forEach((button) => {
        button.addEventListener("click", handleUnregister);
      });
    } catch (error) {
      activitiesList.innerHTML =
        "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle unregister functionality
  async function handleUnregister(event) {
    const button = event.target;
    const activity = button.getAttribute("data-activity");
    const email = button.getAttribute("data-email");
    const auth = getAuth();
    if (!auth) {
      showMessage("請先登入！", "error");
      return;
    }
    let url = `/activities/${encodeURIComponent(activity)}/unregister`;
    let options = { method: "DELETE" };
    // 老師可移除任何人，學生只能移除自己
    if (auth.user.startsWith("teacher")) {
      url += `?target_email=${encodeURIComponent(email)}`;
    }
    try {
      const response = await apiFetch(url, options);
      const result = await response.json();
      if (response.ok) {
        showMessage(result.message, "success");
        fetchActivities();
      } else {
        showMessage(result.detail || "An error occurred", "error");
      }
    } catch (error) {
      showMessage("Failed to unregister. Please try again.", "error");
      console.error("Error unregistering:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const activity = document.getElementById("activity").value;
    const auth = getAuth();
    if (!auth) {
      showMessage("請先登入！", "error");
      return;
    }
    try {
      const response = await apiFetch(`/activities/${encodeURIComponent(activity)}/signup`, {
        method: "POST",
      });
      const result = await response.json();
      if (response.ok) {
        showMessage(result.message, "success");
        fetchActivities();
      } else {
        showMessage(result.detail || "An error occurred", "error");
      }
    } catch (error) {
      showMessage("Failed to sign up. Please try again.", "error");
      console.error("Error signing up:", error);
    }
  });

  // 登入/登出 UI
  loginBtn.addEventListener("click", () => {
    loginModal.classList.remove("hidden");
  });
  cancelLoginBtn.addEventListener("click", () => {
    loginModal.classList.add("hidden");
  });
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = document.getElementById("login-username").value;
    const password = document.getElementById("login-password").value;
    // 嘗試用帳密呼叫 /activities 驗證
    try {
      const resp = await fetch("/activities", {
        headers: {
          Authorization: "Basic " + btoa(`${username}:${password}`),
        },
      });
      if (resp.ok) {
        setAuth(username, password);
        updateAuthUI();
        loginModal.classList.add("hidden");
        fetchActivities();
      } else {
        showMessage("登入失敗，請檢查帳號密碼", "error");
      }
    } catch {
      showMessage("登入失敗，請稍後再試", "error");
    }
  });
  logoutBtn.addEventListener("click", () => {
    clearAuth();
    updateAuthUI();
    fetchActivities();
  });

  function showMessage(msg, type) {
    messageDiv.textContent = msg;
    messageDiv.className = type;
    messageDiv.classList.remove("hidden");
    setTimeout(() => {
      messageDiv.classList.add("hidden");
    }, 5000);
  }

  // 初始化
  updateAuthUI();
  fetchActivities();
});
