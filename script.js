// script.js

// --- State Management (Replacing React Hooks) ---
let messages = [
    { from: 'bot', text: 'Hi! I can help with admissions, courses, fees, placements and more. How can I help you today?' }
];
let input = '';
let loading = false;
const suggestions = [
    'Admission deadlines', 'Courses offered', 'Scholarships', 'Hostel details', 'Placement statistics'
];
let faqs = [];

// Fallback/Mock FAQs if API fails
const fallbackFaqs = [
    { q: 'What is the application deadline?', a: 'Deadlines vary by program; generally before June 30 for fall intake.' },
    { q: 'How do I apply for scholarship?', a: 'You can apply through the scholarships page after submitting your application.' }
];

// --- Helper Functions ---

/**
 * Scrolls the chat window to the bottom.
 */
function scrollToBottom() {
    const chatRef = document.getElementById('chat-messages');
    if (chatRef) {
        // Use a small delay to ensure the DOM has finished rendering the new message content
        setTimeout(() => {
            chatRef.scrollTop = chatRef.scrollHeight;
        }, 0);
    }
}

/**
 * Renders the entire application based on the current state.
 * This function effectively replaces the 'render' phase of a React component.
 */
function render() {
    const root = document.getElementById('chatbot-root');
    if (!root) return;

    // Use a single large template literal for the main structure
    root.innerHTML = `
        <div class="col-span-8 p-6 flex flex-col h-[80vh]">
            <div class="flex items-center justify-between mb-4">
                <div>
                    <h1 class="text-2xl font-semibold">College Inquiry AI</h1>
                    <p class="text-sm text-gray-500">Ask about admissions, courses, fees, placements, hostels and more.</p>
                </div>
                <div class="text-xs text-gray-400">Prototype · Demo</div>
            </div>

            <div id="chat-messages" class="flex-1 overflow-y-auto space-y-4 p-4 border rounded-lg bg-gray-50 mb-4">
                ${messages.map((m, i) => `
                    <div class="flex ${m.from === 'user' ? 'justify-end' : 'justify-start'}">
                        <div class="${m.from === 'user' ? 'bg-blue-600 text-white' : 'bg-white text-gray-800'} max-w-[70%] p-3 rounded-lg shadow-sm border">
                            <div class="whitespace-pre-wrap">${m.text}</div>
                        </div>
                    </div>
                `).join('')}
                ${loading ? '<div class="text-sm text-gray-500 p-3">Thinking...</div>' : ''}
            </div>

            <form id="chat-form" class="mt-4 flex gap-3 items-center">
                <input
                    id="chat-input"
                    value="${input}"
                    placeholder="Type your question (e.g. 'How do I apply for B.Tech?')"
                    class="flex-1 p-3 border rounded-lg focus:outline-none"
                    ${loading ? 'disabled' : ''}
                />
                <button type="submit" id="send-button" ${loading ? 'disabled' : ''} class="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:bg-blue-300">Send</button>
            </form>

            <div class="mt-3 text-sm text-gray-600">Quick suggestions:</div>
            <div id="suggestions" class="mt-2 flex gap-2 flex-wrap">
                ${suggestions.map((s) => `
                    <button class="suggestion-button px-3 py-1 border rounded-full text-sm bg-white" data-text="${s}">${s}</button>
                `).join('')}
            </div>

            <div class="mt-4 border-t pt-3 text-xs text-gray-500 flex items-center justify-between">
                <div>Upload knowledge base (PDF/CSV) to improve answers.</div>
                <div class="flex items-center gap-2">
                    <input id="kb" type="file" accept=".pdf,.txt,.csv" class="hidden" />
                    <label for="kb" class="px-3 py-1 border rounded cursor-pointer ${loading ? 'opacity-50 pointer-events-none' : ''}">Upload</label>
                    <a href="mailto:admissions@college.edu" class="text-blue-600">Contact human</a>
                </div>
            </div>
        </div>

        <div class="col-span-4 bg-gradient-to-b from-white to-gray-100 p-6 border-l h-[80vh] overflow-y-auto">
            <div class="mb-4">
                <h2 class="font-semibold">Popular FAQs</h2>
                <div class="mt-2 space-y-2">
                    ${faqs.slice(0, 5).map(f => `
                        <div class="faq-item p-2 bg-white rounded shadow-sm cursor-pointer" data-question="${f.q}">
                            <div class="text-sm font-medium">${f.q}</div>
                            <div class="text-xs text-gray-500 truncate">${f.a}</div>
                        </div>
                    `).join('')}
                </div>
            </div>

            <div class="mb-4">
                <h3 class="font-semibold">Ask by category</h3>
                <div class="mt-2 grid grid-cols-2 gap-2">
                    ${['Admissions', 'Courses', 'Fees', 'Hostel', 'Placements', 'Scholarship'].map(c => `
                        <button class="category-button p-2 bg-white rounded text-sm" data-text="${c}">${c}</button>
                    `).join('')}
                </div>
            </div>

            <div class="mb-4">
                <h3 class="font-semibold">Settings</h3>
                <div class="mt-2 text-sm text-gray-600">Model: <strong>Local LLM / OpenAI</strong></div>
                <div class="mt-2 text-sm text-gray-600">Language: <strong>English</strong></div>
            </div>

            <div class="text-xs text-gray-500">
                <strong>Privacy:</strong> Conversations are logged for quality and to improve answers. Do not share sensitive personal data here.
            </div>
        </div>
    `;

    // Attach event listeners after rendering
    attachEventListeners();
    scrollToBottom();
}

/**
 * Attaches all event listeners for interaction (re-attached on every render).
 */
function attachEventListeners() {
    const chatInput = document.getElementById('chat-input');
    
    // IMPORTANT FIX: Re-attach oninput listener on every render to correctly update the global 'input' state
    if (chatInput) {
        chatInput.oninput = (e) => {
            input = e.target.value;
        };
    }

    const chatForm = document.getElementById('chat-form');
    if (chatForm) {
        // Using onsubmit ensures we capture the Enter key press
        chatForm.onsubmit = (e) => {
            e.preventDefault();
            sendMessage(input);
        };
    }

    // Suggestions and Category buttons (using querySelectorAll for all dynamic elements)
    document.querySelectorAll('.suggestion-button, .category-button, .faq-item').forEach(button => {
        button.onclick = (e) => {
            // dataset.text for suggestion/category buttons, dataset.question for FAQ items
            const text = e.currentTarget.dataset.text || e.currentTarget.dataset.question;
            sendMessage(text);
        };
    });

    // Knowledge Upload
    const kbInput = document.getElementById('kb');
    // NOTE: We only need to attach the change handler once after the *initial* render,
    // but re-attaching here is safe since it overwrites the handler each time.
    if (kbInput) {
        kbInput.onchange = handleUpload;
    }
}

// --- Core Logic Functions ---

/**
 * Sends a message to the bot/backend.
 * @param {string} text - The user's message.
 */
async function sendMessage(text) {
    if (!text.trim() || loading) return;
    
    // 1. Add user message and clear input
    messages.push({ from: 'user', text });
    input = '';
    
    // 2. Check for FAQ match (short-circuit logic)
    const matchedFaq = faqs.find(f => f.q.toLowerCase().includes(text.toLowerCase()));
    if (matchedFaq) {
        messages.push({ from: 'bot', text: matchedFaq.a });
        render(); // Re-render immediately for FAQ answer
        return;
    }
    
    // 3. Start API call
    loading = true;
    render(); // Show loading state

    try {
        const res = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: text })
        });
        
        if (!res.ok) throw new Error('Server error');
        
        const data = await res.json();
        const replyText = data.reply || 'Sorry, I could not find that.';
        messages.push({ from: 'bot', text: replyText });
    } catch (e) {
        messages.push({ from: 'bot', text: "Sorry — I'm having trouble connecting. You can contact admissions@college.edu" });
    } finally {
        loading = false;
        render(); // Hide loading state and show final message
    }
}

/**
 * Handles knowledge base file upload.
 * @param {Event} ev - The change event from the file input.
 */
async function handleUpload(ev) {
    const file = ev.target.files[0];
    if (!file) return;
    
    const fd = new FormData();
    fd.append('file', file);
    
    loading = true;
    render();

    try {
        const res = await fetch('/api/upload-knowledge', { method: 'POST', body: fd });
        if (!res.ok) throw new Error('Upload failed');
        
        const data = await res.json();
        // FIX: Corrected template literal escaping
        messages.push({ from: 'bot', text: `Knowledge uploaded: ${data.filename || file.name}. I will use it to answer future questions.` });
    } catch (e) {
        messages.push({ from: 'bot', text: 'Upload failed. Try again or contact the admin.' });
    } finally {
        loading = false;
        render();
        // Clear file input value to allow re-uploading the same file
        ev.target.value = ''; 
    }
}

/**
 * Loads FAQs from the mock endpoint on initial load.
 */
async function loadFaqs() {
    try {
        const res = await fetch('/api/faqs');
        if (res.ok) {
            const data = await res.json();
            faqs = data;
        } else {
            faqs = fallbackFaqs;
        }
    } catch (e) {
        faqs = fallbackFaqs;
    }
    render(); // Initial render after state is loaded
}

// --- Initialization ---

// Start the application by loading initial data once the DOM is ready
document.addEventListener('DOMContentLoaded', loadFaqs);