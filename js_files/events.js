let isSignedUp = false;
let currentEventTitle = '';

function openModal(title, description, date, time, location) {
    currentEventTitle = title;
    
    // Set modal content
    document.getElementById('modalEventTitle').textContent = title;
    document.getElementById('modalEventDescription').textContent = description;
    document.getElementById('modalEventDate').textContent = date;
    document.getElementById('modalEventTime').textContent = time;
    document.getElementById('modalEventLocation').textContent = location;
    
    // Reset signup state
    isSignedUp = false;
    document.getElementById('signupButton').textContent = 'Sign Up for Event';
    document.getElementById('signupButton').classList.remove('signed-up');
    document.getElementById('signupStatus').textContent = '';
    document.getElementById('chatSection').style.display = 'none';
    
    // Show modal
    document.getElementById('eventModal').style.display = 'block';
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    document.getElementById('eventModal').style.display = 'none';
    document.body.style.overflow = 'auto';
}

function toggleSignup() {
    const signupButton = document.getElementById('signupButton');
    const signupStatus = document.getElementById('signupStatus');
    const chatSection = document.getElementById('chatSection');
    
    if (!isSignedUp) {
        // Sign up
        isSignedUp = true;
        signupButton.textContent = 'Signed Up ✓';
        signupButton.classList.add('signed-up');
        signupStatus.textContent = 'You have successfully signed up for this event!';
        chatSection.style.display = 'block';
        
        // Add welcome message to chat
        addChatMessage('System', 'You have joined the event chat. Introduce yourself to other participants!');
    } else {
        // Cancel signup
        isSignedUp = false;
        signupButton.textContent = 'Sign Up for Event';
        signupButton.classList.remove('signed-up');
        signupStatus.textContent = '';
        chatSection.style.display = 'none';
    }
}

function sendMessage() {
    const chatInput = document.getElementById('chatInput');
    const message = chatInput.value.trim();
    
    if (message && isSignedUp) {
        addChatMessage('You', message);
        chatInput.value = '';
    }
}

function addChatMessage(user, text) {
    const chatMessages = document.getElementById('chatMessages');
    const messageDiv = document.createElement('div');
    messageDiv.className = 'chat-message';
    messageDiv.innerHTML = `
        <span class="chat-user">${user}:</span>
        <span class="chat-text">${text}</span>
    `;
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function handleChatKeypress(event) {
    if (event.key === 'Enter') {
        sendMessage();
    }
}

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('eventModal');
    if (event.target === modal) {
        closeModal();
    }
}

// Close modal with Escape key
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        closeModal();
    }
});
