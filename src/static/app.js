document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // --- Auth helpers ---
  function getToken() {
    return sessionStorage.getItem("auth_token");
  }

  function getUsername() {
    return sessionStorage.getItem("auth_username");
  }

  function isLoggedIn() {
    return !!getToken();
  }

  function updateAuthUI() {
    const authStatus = document.getElementById("auth-status");
    const authBtn = document.getElementById("auth-btn");
    const signupContainer = document.getElementById("signup-container");

    if (isLoggedIn()) {
      authStatus.textContent = `👤 ${getUsername()}`;
      authBtn.textContent = "Logout";
      authBtn.onclick = submitLogout;
      signupContainer.classList.remove("hidden");
    } else {
      authStatus.textContent = "";
      authBtn.textContent = "🔑 Teacher Login";
      authBtn.onclick = openLoginModal;
      signupContainer.classList.add("hidden");
    }
    // Refresh to show/hide delete buttons
    fetchActivities();
  }

  // --- Login modal ---
  window.openLoginModal = function () {
    document.getElementById("login-modal").classList.remove("hidden");
    document.getElementById("login-username").focus();
  };

  window.closeLoginModal = function () {
    document.getElementById("login-modal").classList.add("hidden");
    document.getElementById("login-error").classList.add("hidden");
    document.getElementById("login-username").value = "";
    document.getElementById("login-password").value = "";
  };

  window.submitLogin = async function () {
    const username = document.getElementById("login-username").value.trim();
    const password = document.getElementById("login-password").value;
    const errorDiv = document.getElementById("login-error");

    try {
      const response = await fetch(
        `/login?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`,
        { method: "POST" }
      );
      const result = await response.json();
      if (response.ok) {
        sessionStorage.setItem("auth_token", result.token);
        sessionStorage.setItem("auth_username", result.username);
        closeLoginModal();
        updateAuthUI();
      } else {
        errorDiv.textContent = result.detail || "Login failed";
        errorDiv.classList.remove("hidden");
      }
    } catch {
      errorDiv.textContent = "Login failed. Please try again.";
      errorDiv.classList.remove("hidden");
    }
  };

  window.submitLogout = async function () {
    const token = getToken();
    if (token) {
      await fetch("/logout", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    }
    sessionStorage.removeItem("auth_token");
    sessionStorage.removeItem("auth_username");
    updateAuthUI();
  };

  // Allow pressing Enter in login form
  document.getElementById("login-password").addEventListener("keydown", (e) => {
    if (e.key === "Enter") window.submitLogin();
  });
  document.getElementById("login-username").addEventListener("keydown", (e) => {
    if (e.key === "Enter") document.getElementById("login-password").focus();
  });

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft =
          details.max_participants - details.participants.length;

        // Only show delete buttons if teacher is logged in
        const participantsHTML =
          details.participants.length > 0
            ? `<div class="participants-section">
              <h5>Participants:</h5>
              <ul class="participants-list">
                ${details.participants
                  .map(
                    (email) =>
                      isLoggedIn()
                        ? `<li><span class="participant-email">${email}</span><button class="delete-btn" data-activity="${name}" data-email="${email}">❌</button></li>`
                        : `<li><span class="participant-email">${email}</span></li>`
                  )
                  .join("")}
              </ul>
            </div>`
            : `<p><em>No participants yet</em></p>`;

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

      // Add event listeners to delete buttons
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

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/unregister?email=${encodeURIComponent(email)}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${getToken()}` },
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to unregister. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error unregistering:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${getToken()}` },
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  updateAuthUI();
});
