// Firebase App (the core Firebase SDK) is always required and must be listed first
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, collection, addDoc, query, orderBy, limit, onSnapshot, serverTimestamp, where, Timestamp } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCY-Wpqs2tVNmqaHG_pUoeidazljBStAeQ",
  authDomain: "netrunner-31ef2.firebaseapp.com",
  projectId: "netrunner-31ef2",
  storageBucket: "netrunner-31ef2.firebasestorage.app",
  messagingSenderId: "840623322760",
  appId: "1:840623322760:web:c5028b64470b54c1cf113d"
};

const appId = firebaseConfig.appId || 'default-netrunners-edge';
console.log("NetRunner's Edge Initializing with App ID:", appId);

let auth, db, userId, userProfile = null;
let currentChatChannel = 'world';
let chatUnsubscribe = () => {}; // Function to unsubscribe from Firestore listener
let techTimesUnsubscribe = () => {}; // Unsubscribe function for Tech Times

const loginScreen = document.getElementById('loginScreen');
const gameInterface = document.getElementById('gameInterface');
const usernameInput = document.getElementById('usernameInput');
const submitUsernameBtn = document.getElementById('submitUsername');
const raceSelectionDiv = document.getElementById('raceSelection');
const raceOptionsContainer = document.getElementById('raceOptionsContainer');
const raceDescriptionP = document.getElementById('raceDescription');
const confirmRaceBtn = document.getElementById('confirmRace');
const authStatusP = document.getElementById('authStatus');
const userIdDisplayP = document.getElementById('userIdDisplay');

const playerNameDisplay = document.getElementById('playerNameDisplay');
const playerLevelDisplay = document.getElementById('playerLevelDisplay');
const playerRankDisplay = document.getElementById('playerRankDisplay');
const playerCurrencyDisplay = document.getElementById('playerCurrencyDisplay');

const homePlayerName = document.getElementById('homePlayerName');
const playerUIDInfo = document.getElementById('playerUIDInfo');
const playerLevelInfo = document.getElementById('playerLevelInfo');
const playerRankInfo = document.getElementById('playerRankInfo');
const playerCreditsInfo = document.getElementById('playerCreditsInfo');

const profileName = document.getElementById('profileName');
const profileRace = document.getElementById('profileRace');
const profileLevel = document.getElementById('profileLevel');
const profileRank = document.getElementById('profileRank');
const profileXP = document.getElementById('profileXP');
const profileXPToNext = document.getElementById('profileXPToNext');
const profileUID = document.getElementById('profileUID');
const statStr = document.getElementById('statStr');
const statSpd = document.getElementById('statSpd');
const statCon = document.getElementById('statCon');
const statCyber = document.getElementById('statCyber');
const statLuck = document.getElementById('statLuck');

const chatDisplay = document.getElementById('chatDisplay');
const chatInput = document.getElementById('chatInput');
const sendChatMessageBtn = document.getElementById('sendChatMessage');
const chatChannelSelect = document.getElementById('chatChannelSelect');

const techTimesHighlightsUl = document.getElementById('techTimesHighlights');
const fullTechTimesFeedUl = document.getElementById('fullTechTimesFeed');

const races = {
  "street_kid": {
    name: "Street Kid",
    description: "Born in the gutters of Night City, you're a survivor, adaptable and resourceful. You know the streets, their dangers, and their hidden paths.",
    baseStats: { str: 12, spd: 11, con: 10, cyber: 8, luck: 9 }
  },
  "nomad": {
    name: "Nomad",
    description: "An outsider from the Badlands, you value family, freedom, and a working vehicle. You're tough, self-reliant, and skilled in scavenging and mechanics.",
    baseStats: { str: 11, spd: 10, con: 12, cyber: 7, luck: 10 }
  },
  "corpo": {
    name: "Ex-Corpo",
    description: "Once a cog in the corporate machine, you've seen the belly of the beast. You're calculating, well-connected (or burned), and possess a sharp intellect.",
    baseStats: { str: 9, spd: 9, con: 8, cyber: 12, luck: 12 }
  },
  "techie": {
    name: "Techie",
    description: "A wizard with wires and code, you thrive on innovation and cybernetics. You can build, break, and bend technology to your will.",
    baseStats: { str: 8, spd: 10, con: 9, cyber: 13, luck: 10 }
  }
};

const playerRanks = [
  "Noob Choom", "Street Rat", "Edgerunner", "Netrunner Ace",
  "Fixer Prime", "Solo Legend", "Night City Legend"
];

async function initializeGame() {
  try {
    const app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    authStatusP.textContent = "Connecting to authentication servers...";

    onAuthStateChanged(auth, async (user) => {
      if (user) {
        userId = user.uid;
        console.log("Authenticated User ID:", userId);
        authStatusP.textContent = "Authenticated. User ID: " + userId.substring(0, 10) + "...";
        userIdDisplayP.textContent = "Your User ID (for sharing/finding others): " + userId;
        await loadOrCreatePlayerProfile();
      } else {
        authStatusP.textContent = "Authenticating anonymously...";
        userIdDisplayP.textContent = "";
        try {
          await signInAnonymously(auth);
        } catch (error) {
          console.error("Anonymous sign-in error:", error);
          authStatusP.textContent = "Anonymous sign-in failed: " + error.message;
        }
      }
    });
  } catch (error) {
    console.error("Firebase initialization error:", error);
    authStatusP.textContent = "Error: Firebase initialization failed. " + error.message;
  }
}

async function loadOrCreatePlayerProfile() {
  if (!userId || !appId) {
    console.error("User ID or App ID is missing for profile load/create.");
    authStatusP.textContent = "Critical error: Identifier missing.";
    return;
  }
  const playerProfileCollectionName = "playerCoreData";
  const playerProfileDocumentId = "profile";
  const playerDocRef = doc(db, `artifacts/${appId}/users/${userId}/${playerProfileCollectionName}/${playerProfileDocumentId}`);

  try {
    const docSnap = await getDoc(playerDocRef);
    if (docSnap.exists()) {
      userProfile = docSnap.data();
      if (!userProfile.username || !userProfile.race) {
        console.log("User profile exists but incomplete. Proceeding to setup.");
        showUsernameSelection();
      } else {
        console.log("Player profile loaded:", userProfile);
        startGameWithProfile();
      }
    } else {
      console.log("No player profile found. Starting creation process.");
      showUsernameSelection();
    }
  } catch (error) {
    console.error("Error loading player profile:", error);
    authStatusP.textContent = "Error loading profile: " + error.message;
  }
}

function showUsernameSelection() {
  loginScreen.classList.remove('hidden');
  document.getElementById('usernameSelection').classList.remove('hidden');
  document.getElementById('raceSelection').classList.add('hidden');
  authStatusP.textContent = "Enter your desired Runner ID.";
}

async function handleUsernameSubmit() {
  const username = usernameInput.value.trim();
  if (username.length < 3 || username.length > 20) {
    const alertBox = document.createElement('div');
    alertBox.textContent = "Username must be between 3 and 20 characters.";
    alertBox.style.position = 'fixed';
    alertBox.style.top = '20px';
    alertBox.style.left = '50%';
    alertBox.style.transform = 'translateX(-50%)';
    alertBox.style.padding = '10px 20px';
    alertBox.style.backgroundColor = 'rgba(100, 0, 0, 0.8)';
    alertBox.style.color = '#ff4444';
    alertBox.style.border = '1px solid #ff4444';
    alertBox.style.borderRadius = '5px';
    alertBox.style.zIndex = '2000';
    alertBox.style.fontFamily = "'Orbitron', sans-serif";
    alertBox.style.boxShadow = '0 0 10px #ff0000';
    document.body.appendChild(alertBox);
    setTimeout(() => {
      alertBox.remove();
    }, 3000);
    return;
  }
  userProfile = {
    username: username,
    race: null,
    level: 1,
    rank: playerRanks[0],
    xp: 0,
    xpToNextLevel: 100,
    currency: 500,
    stats: {},
    createdAt: serverTimestamp(),
    lastLogin: serverTimestamp()
  };
  document.getElementById('usernameSelection').classList.add('hidden');
  populateRaceOptions();
  raceSelectionDiv.classList.remove('hidden');
  authStatusP.textContent = "Choose your origin story, runner.";
}

function populateRaceOptions() {
  raceOptionsContainer.innerHTML = '';
  Object.keys(races).forEach(raceKey => {
    const race = races[raceKey];
    const card = document.createElement('div');
    card.className = 'race-card';
    card.dataset.raceKey = raceKey;
    card.innerHTML = `<h3>${race.name}</h3><p>${race.description}</p>`;
    card.onclick = () => selectRace(raceKey, card);
    raceOptionsContainer.appendChild(card);
  });
}

let selectedRaceKey = null;
function selectRace(raceKey, selectedCardElement) {
  selectedRaceKey = raceKey;
  const race = races[raceKey];
  raceDescriptionP.innerHTML = `<strong>Base Stats for ${race.name}:</strong><br>
    Str: ${race.baseStats.str}, Spd: ${race.baseStats.spd}, Con: ${race.baseStats.con},
    Cyber: ${race.baseStats.cyber}, Luck: ${race.baseStats.luck}`;
  document.querySelectorAll('.race-card').forEach(card => card.classList.remove('selected'));
  selectedCardElement.classList.add('selected');
  confirmRaceBtn.disabled = false;
}

async function handleRaceConfirmation() {
  if (!selectedRaceKey || !userProfile || !userId || !appId) {
    console.error("Missing data for race confirmation.");
    return;
  }
  userProfile.race = selectedRaceKey;
  userProfile.stats = { ...races[selectedRaceKey].baseStats };

  authStatusP.textContent = "Saving profile to the Grid...";
  confirmRaceBtn.disabled = true;
  try {
    const playerProfileCollectionName = "playerCoreData";
    const playerProfileDocumentId = "profile";
    const playerDocRef = doc(db, `artifacts/${appId}/users/${userId}/${playerProfileCollectionName}/${playerProfileDocumentId}`);
    await setDoc(playerDocRef, userProfile, { merge: true });
    console.log("Player profile saved to:", playerDocRef.path);
    startGameWithProfile();
  } catch (error) {
    console.error("Error saving player profile:", error);
    authStatusP.textContent = "Error saving profile: " + error.message;
    confirmRaceBtn.disabled = false;
  }
}

function startGameWithProfile() {
  loginScreen.classList.add('hidden');
  gameInterface.classList.remove('hidden');
  updateUIWithProfile();
  setupChat();
  setupTechTimesFeed();
  console.log("Game started for user:", userProfile.username);
  logTechTimesEvent(`${userProfile.username} (Rank: ${userProfile.rank}) has jacked into the Grid.`);
}

function updateUIWithProfile() {
  if (!userProfile) return;
  // Header
  playerNameDisplay.textContent = userProfile.username;
  playerLevelDisplay.textContent = `Lvl ${userProfile.level}`;
  playerRankDisplay.textContent = userProfile.rank;
  playerCurrencyDisplay.textContent = `${userProfile.currency} €$`;

  // Home Tab
  homePlayerName.textContent = userProfile.username;
  playerUIDInfo.textContent = userId;
  playerLevelInfo.textContent = userProfile.level;
  playerRankInfo.textContent = userProfile.rank;
  playerCreditsInfo.textContent = userProfile.currency;

  // Profile Tab
  profileName.textContent = userProfile.username;
  profileRace.textContent = races[userProfile.race]?.name || 'Unknown';
  profileLevel.textContent = userProfile.level;
  profileRank.textContent = userProfile.rank;
  profileXP.textContent = userProfile.xp;
  profileXPToNext.textContent = userProfile.xpToNextLevel;
  profileUID.textContent = userId;
  statStr.textContent = userProfile.stats.str;
  statSpd.textContent = userProfile.stats.spd;
  statCon.textContent = userProfile.stats.con;
  statCyber.textContent = userProfile.stats.cyber;
  statLuck.textContent = userProfile.stats.luck;
}

// Tab Navigation
const tabButtons = document.querySelectorAll('.tab-button');
const tabContents = document.querySelectorAll('.tab-content');

tabButtons.forEach(button => {
  button.addEventListener('click', () => {
    tabButtons.forEach(btn => btn.classList.remove('active'));
    button.classList.add('active');

    tabContents.forEach(content => content.classList.remove('active'));
    document.getElementById(button.dataset.tab + 'Tab').classList.add('active');

    // Re-setup chat listener if the chat tab is clicked to ensure correct channel subscription
    if (button.dataset.tab === 'chat') {
      setupChat();
    }
  });
});

// Chat System
function setupChat() {
  if (chatUnsubscribe) chatUnsubscribe();
  const chatCollectionName = `chat_${currentChatChannel}`;
  const messagesCollectionPath = `artifacts/${appId}/public/data/${chatCollectionName}`;
  const messagesCollectionRef = collection(db, messagesCollectionPath);

  // Order by timestamp ascending to display newest messages at the bottom
  const q = query(messagesCollectionRef, orderBy('timestamp', 'asc'), limit(50));
  console.log("Setting up chat listener for:", messagesCollectionPath);

  chatDisplay.innerHTML = '<p class="text-gray-500 text-sm p-2">Loading messages...</p>';
  chatUnsubscribe = onSnapshot(q, (querySnapshot) => {
    const messages = [];
    querySnapshot.forEach((doc) => {
      messages.push({ id: doc.id, ...doc.data() });
    });
    renderChatMessages(messages);
  }, (error) => {
    console.error(`Error fetching chat messages for ${currentChatChannel}:`, error);
    chatDisplay.innerHTML = `<p class="text-red-500">Error loading ${currentChatChannel} chat: ${error.message}</p>`;
  });
}

function renderChatMessages(messages) {
  chatDisplay.innerHTML = '';
  if (messages.length === 0) {
    chatDisplay.innerHTML = `<p class="text-gray-400 text-sm text-center p-4">No messages in ${currentChatChannel} yet. Be the first!</p>`;
  }
  messages.forEach(msg => {
    const msgDiv = document.createElement('div');
    msgDiv.classList.add('chat-message', currentChatChannel);
    if (msg.username === 'Gemini AI') {
      msgDiv.classList.add('system');
    }

    const userSpan = document.createElement('span');
    userSpan.classList.add('username');
    userSpan.textContent = `${msg.username || 'Anonymous'}: `;

    const textSpan = document.createElement('span');
    textSpan.textContent = msg.text;

    const timeSpan = document.createElement('span');
    timeSpan.classList.add('timestamp');
    timeSpan.textContent = msg.timestamp ? new Date(msg.timestamp.seconds * 1000).toLocaleTimeString() : '';

    msgDiv.appendChild(userSpan);
    msgDiv.appendChild(textSpan);
    msgDiv.appendChild(timeSpan);
    chatDisplay.appendChild(msgDiv);
  });
  chatDisplay.scrollTop = chatDisplay.scrollHeight;
}

async function sendChatMessage() {
  const text = chatInput.value.trim();
  if (!text || !userProfile) return;

  chatInput.value = '';

  if (currentChatChannel === 'ai-assistant') {
    displayMessage({ username: 'You', text: text, timestamp: Timestamp.now(), channel: currentChatChannel });
    await simulateGeminiResponse(text);
  } else {
    const message = {
      userId: userId,
      username: userProfile.username,
      text: text,
      timestamp: serverTimestamp(),
      channel: currentChatChannel
    };
    try {
      const chatCollectionName = `chat_${currentChatChannel}`;
      const messagesCollectionPath = `artifacts/${appId}/public/data/${chatCollectionName}`;
      await addDoc(collection(db, messagesCollectionPath), message);
    } catch (error) {
      console.error("Error sending message:", error);
    }
  }
}

function displayMessage(msg) {
  const msgDiv = document.createElement('div');
  msgDiv.classList.add('chat-message', msg.channel);
  if (msg.username === 'Gemini AI') {
    msgDiv.classList.add('system');
  }

  const userSpan = document.createElement('span');
  userSpan.classList.add('username');
  userSpan.textContent = `${msg.username || 'System'}: `;

  const textSpan = document.createElement('span');
  textSpan.textContent = msg.text;

  const timeSpan = document.createElement('span');
  timeSpan.classList.add('timestamp');
  timeSpan.textContent = msg.timestamp ? new Date(msg.timestamp.seconds * 1000).toLocaleTimeString() : '';

  msgDiv.appendChild(userSpan);
  msgDiv.appendChild(textSpan);
  msgDiv.appendChild(timeSpan);
  chatDisplay.appendChild(msgDiv);
  chatDisplay.scrollTop = chatDisplay.scrollHeight;
}

async function simulateGeminiResponse(userQuery) {
  displayMessage({ username: 'Gemini AI', text: 'Processing your query...', timestamp: Timestamp.now(), channel: 'ai-assistant' });

  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1000));

  // Remove "Processing" message, then display actual AI response
  const processingMessage = chatDisplay.querySelector('.chat-message.system:last-child');
  if (processingMessage && processingMessage.textContent.includes('Processing')) {
    processingMessage.remove();
  }

  displayMessage({ username: 'Gemini AI', text: 'Gemini AI response', timestamp: Timestamp.now(), channel: 'ai-assistant' });
}

// Market Tabs
const showRegularMarketBtn = document.getElementById('showRegularMarket');
const showBlackMarketBtn = document.getElementById('showBlackMarket');
const regularMarketContent = document.getElementById('regularMarketContent');
const blackMarketContent = document.getElementById('blackMarketContent');

showRegularMarketBtn.addEventListener('click', () => {
  regularMarketContent.classList.remove('hidden');
  blackMarketContent.classList.add('hidden');
  showRegularMarketBtn.classList.add('active');
showBlackMarketBtn.classList.remove('active');
});

showBlackMarketBtn.addEventListener('click', () => {
  regularMarketContent.classList.add('hidden');
  blackMarketContent.classList.remove('hidden');
  showRegularMarketBtn.classList.remove('active');
  showBlackMarketBtn.classList.add('active');
});

// Tech Times
function setupTechTimesFeed() {
  if (techTimesUnsubscribe) techTimesUnsubscribe();
  const techTimesCollectionName = "techTimesLog";
  const techTimesCollectionPath = `artifacts/${appId}/public/data/${techTimesCollectionName}`;
  const techTimesCollectionRef = collection(db, techTimesCollectionPath);

  // Order by timestamp descending for Tech Times (newest first)
  const q = query(techTimesCollectionRef, orderBy('timestamp', 'desc'), limit(20));
  console.log("Setting up Tech Times listener for:", techTimesCollectionPath);

  techTimesUnsubscribe = onSnapshot(q, (querySnapshot) => {
    const events = [];
    querySnapshot.forEach((doc) => {
      events.push({ id: doc.id, ...doc.data() });
    });
    renderTechTimes(events);
  }, (error) => {
    console.error("Error fetching Tech Times:", error);
    techTimesHighlightsUl.innerHTML = '<li>Error loading Tech Times feed.</li>';
    fullTechTimesFeedUl.innerHTML = '<li>Error loading Tech Times feed.</li>';
  });
}

function renderTechTimes(events) {
  techTimesHighlightsUl.innerHTML = '';
  fullTechTimesFeedUl.innerHTML = '';

  if (events.length === 0) {
    const noNewsLi = '<li>No significant network ripples detected. Grid is stable.</li>';
    techTimesHighlightsUl.innerHTML = noNewsLi;
    fullTechTimesFeedUl.innerHTML = noNewsLi;
    return;
  }

  // Highlights: top 5 newest events
  events.slice(0, 5).forEach(event => {
    const li = document.createElement('li');
    const eventTime = event.timestamp ? new Date(event.timestamp.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recently';
    li.innerHTML = `<strong class="text-cyan-500">[${eventTime}]</strong> ${event.message}`;
    techTimesHighlightsUl.appendChild(li);
  });

  // Full feed: display in reverse order (oldest first) so newest appear at the bottom
  events.forEach(event => {
    const li = document.createElement('li');
    const eventTime = event.timestamp ? new Date(event.timestamp.seconds * 1000).toLocaleString() : 'Recently';
    li.innerHTML = `<strong class="text-cyan-500">[${eventTime}]</strong> ${event.message}`;
    fullTechTimesFeedUl.appendChild(li);
  });
}

async function logTechTimesEvent(message, type = 'general') {
  if (!db) return;
  try {
    const techTimesCollectionName = "techTimesLog";
    const techTimesCollectionPath = `artifacts/${appId}/public/data/${techTimesCollectionName}`;
    await addDoc(collection(db, techTimesCollectionPath), {
      message: message,
      type: type,
      timestamp: serverTimestamp()
    });
  } catch (error) {
    console.error("Error logging Tech Times event:", error);
  }
}

// Event Listeners
submitUsernameBtn.addEventListener('click', handleUsernameSubmit);
confirmRaceBtn.addEventListener('click', handleRaceConfirmation);

// Start the game
initializeGame();
