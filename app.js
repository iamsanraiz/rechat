// =================================================================
// 1. SECURITY WARNING - DO NOT EXPOSE YOUR API KEYS
// =================================================================
// It is critical to protect your Firebase configuration.
// In a real production app, use environment variables.
// For example, using a tool like Vite or Create React App, you would store these in a `.env` file:
// VITE_API_KEY="AIzaSy..."
// And access them in your code as `import.meta.env.VITE_API_KEY`
//
// NEVER commit your actual API keys to a public repository.
// The keys in your original post have been exposed.
// YOU MUST GO TO YOUR FIREBASE CONSOLE, GENERATE NEW KEYS, AND DELETE THE OLD ONES.

const firebaseConfig = {
    apiKey: "YOUR_NEW_API_KEY", // <-- Replace with your new key
    authDomain: "YOUR_AUTH_DOMAIN",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_STORAGE_BUCKET",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// =================================================================
// 2. INITIALIZATION
// =================================================================
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const provider = new firebase.auth.GoogleAuthProvider();

// =================================================================
// 3. DOM ELEMENT REFERENCES
// =================================================================
const loginContainer = document.getElementById('loginContainer');
const chatContainer = document.getElementById('chatContainer');
const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const userAvatar = document.getElementById('userAvatar');
const userName = document.getElementById('userName');
const messagesContainer = document.getElementById('messages');
const messageForm = document.getElementById('messageForm');
const messageInput = document.getElementById('messageInput');

// =================================================================
// 4. AUTHENTICATION LOGIC
// =================================================================

// Listen for authentication state changes
auth.onAuthStateChanged(user => {
    if (user) {
        // User is signed in
        showChatUI(user);
        listenForMessages();
    } else {
        // User is signed out
        showLoginUI();
    }
});

// Sign-in function
loginBtn.addEventListener('click', () => {
    auth.signInWithPopup(provider).catch(error => {
        console.error("Authentication Error:", error);
        alert(`Error signing in: ${error.message}`);
    });
});

// Sign-out function
logoutBtn.addEventListener('click', () => {
    auth.signOut().catch(error => {
        console.error("Sign Out Error:", error);
    });
});

// =================================================================
// 5. UI MANAGEMENT
// =================================================================

function showLoginUI() {
    loginContainer.style.display = 'flex';
    chatContainer.style.display = 'none';
}

function showChatUI(user) {
    loginContainer.style.display = 'none';
    chatContainer.style.display = 'flex'; // Use flex as per CSS
    userAvatar.src = user.photoURL || 'default-avatar.png'; // Use a default avatar if none exists
    userName.textContent = user.displayName || 'Anonymous';
}

// =================================================================
// 6. CHAT LOGIC (FIRESTORE)
// =================================================================

// Send a new message
messageForm.addEventListener('submit', event => {
    event.preventDefault(); // Prevent page reload
    const messageText = messageInput.value.trim();
    const user = auth.currentUser;

    if (messageText && user) {
        db.collection("messages").add({
            text: messageText,
            uid: user.uid,
            author: user.displayName,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        })
        .then(() => {
            messageInput.value = ""; // Clear input on successful send
        })
        .catch(error => console.error("Error sending message:", error));
    }
});

// Listen for incoming messages in real-time
let unsubscribe = null; // To hold the listener function
function listenForMessages() {
    // Unsubscribe from previous listener if it exists
    if (unsubscribe) {
        unsubscribe();
    }

    unsubscribe = db.collection("messages")
        .orderBy("createdAt")
        .limitToLast(50) // Only get the last 50 messages to start
        .onSnapshot(snapshot => {
            messagesContainer.innerHTML = ""; // Clear existing messages
            snapshot.forEach(doc => {
                const messageData = doc.data();
                renderMessage(messageData);
            });
            // Auto-scroll to the latest message
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }, error => {
            console.error("Error listening to messages:", error);
        });
}

// Render a single message to the DOM
function renderMessage(data) {
    const { text, author, createdAt, uid } = data;
    const currentUser = auth.currentUser;
    
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message');

    // Check if the message was sent by the current user
    if (currentUser && uid === currentUser.uid) {
        messageDiv.classList.add('sent');
    } else {
        messageDiv.classList.add('received');
    }

    const formattedTime = createdAt ? new Date(createdAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
    
    // Using textContent for security (prevents XSS)
    const authorSpan = document.createElement('span');
    authorSpan.classList.add('author');
    authorSpan.textContent = author;
    
    const textSpan = document.createElement('span');
    textSpan.classList.add('text');
    textSpan.textContent = text;
    
    const timeSpan = document.createElement('span');
    timeSpan.classList.add('timestamp');
    timeSpan.textContent = formattedTime;

    if (messageDiv.classList.contains('received')) {
        messageDiv.appendChild(authorSpan);
    }
    
    messageDiv.appendChild(textSpan);
    messageDiv.appendChild(timeSpan);
    
    messagesContainer.appendChild(messageDiv);
}
