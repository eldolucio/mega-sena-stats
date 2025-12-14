const API_URL = 'https://raw.githubusercontent.com/guilhermeasn/loteria.json/master/data/megasena.json';

const elements = {
    loader: document.getElementById('stats-loading'),
    dashboard: document.getElementById('stats-dashboard'),
    hotNumbers: document.getElementById('hot-numbers'),
    coldNumbers: document.getElementById('cold-numbers'),
    overdueNumbers: document.getElementById('overdue-numbers'),
    generateBtn: document.getElementById('generate-btn'),
    resultContainer: document.getElementById('result-container'),
    modeToggle: document.getElementById('mode-toggle')
};

let stats = {
    frequency: {},
    lastSeen: {},
    totalContests: 0,
    hot: [],
    cold: [],
    overdue: []
};

// --- Initialization ---

async function init() {
    try {
        const data = await fetchData();
        processStats(data);
        renderStats();
        enableInterface();
    } catch (error) {
        console.error("Failed to load data", error);
        elements.loader.innerHTML = `<p style="color: #ff5252">Erro ao carregar dados. <br><small>Usando modo offline (aleatório simples).</small></p>`;
        // Fallback to offline mode after a delay
        setTimeout(enableInterface, 2000);
    }
}

async function fetchData() {
    const response = await fetch(API_URL);
    if (!response.ok) throw new Error('Network response was not ok');
    return await response.json();
}

// --- Logic ---

function processStats(data) {
    stats.totalContests = data.length;
    
    // Initialize counters
    for (let i = 1; i <= 60; i++) {
        stats.frequency[i] = 0;
        stats.lastSeen[i] = -1;
    }

    // Process all draws
    data.forEach((contest) => {
        // contest might differ in structure, checking common fields
        // The API returns mainly an array of objects. Let's assume standard 'dezenas' or similar.
        // Checking the specific JSON format from guilhermeasn/loteria.json:
        // It's usually like: [ { "Concurso": 1, "Data": "...", "Dezenas": ["04", "05", ...] }, ... ]
        
        // Dezenas are strings "01", etc.
        const numbers = contest.Dezenas || contest.dezenas || [];
        
        numbers.forEach(numStr => {
            const num = parseInt(numStr, 10);
            if (!isNaN(num)) {
                stats.frequency[num]++;
                stats.lastSeen[num] = contest.Concurso || contest.concurso; // Track last contest ID
            }
        });
    });

    // Calculate Hot/Cold
    const sortedFreq = Object.entries(stats.frequency)
        .sort(([,a], [,b]) => b - a)
        .map(([num]) => parseInt(num)); // [Num, Freq]

    stats.hot = sortedFreq.slice(0, 10);
    stats.cold = sortedFreq.slice(-10).reverse(); // Coldest first

    // Calculate Overdue
    const currentContest = data[data.length - 1].Concurso || data.length;
    const delays = [];
    for (let i = 1; i <= 60; i++) {
        const last = stats.lastSeen[i];
        const delay = last === -1 ? currentContest : currentContest - last;
        delays.push({ num: i, delay });
    }
    
    stats.overdue = delays
        .sort((a,b) => b.delay - a.delay)
        .slice(0, 10)
        .map(d => d.num);
}

function processOfflineStats() {
    // Fallback if API fails
    stats.hot = [5, 10, 53, 23, 4, 54, 33, 24, 51, 42]; // Historical approximations
    stats.overdue = [1, 2, 3, 4, 5, 6]; // Mock
}

// --- Rendering ---

function renderStats() {
    elements.loader.classList.add('hidden');
    elements.dashboard.classList.remove('hidden');
    elements.dashboard.classList.add('visible');

    renderNumberList(elements.hotNumbers, stats.hot);
    renderNumberList(elements.coldNumbers, stats.cold);
    renderNumberList(elements.overdueNumbers, stats.overdue);
}

function renderNumberList(container, numbers) {
    container.innerHTML = numbers.map(n => 
        `<div class="mini-ball">${n.toString().padStart(2, '0')}</div>`
    ).join('');
}

function enableInterface() {
    elements.generateBtn.disabled = false;
    elements.generateBtn.addEventListener('click', generateGame);
}

// --- Generator ---

function generateGame() {
    elements.generateBtn.disabled = true;
    elements.resultContainer.innerHTML = ''; // Clear
    
    const useStats = elements.modeToggle.checked;
    let numbers = [];

    if (useStats && stats.hot.length > 0) {
        numbers = generateSmartNumbers();
    } else {
        numbers = generateRandomNumbers();
    }

    // Display animation
    numbers.forEach((num, index) => {
        setTimeout(() => {
            const ball = document.createElement('div');
            ball.className = 'ball';
            ball.textContent = num.toString().padStart(2, '0');
            elements.resultContainer.appendChild(ball);
            
            // Re-enable button after last ball
            if (index === numbers.length - 1) {
                setTimeout(() => { elements.generateBtn.disabled = false; }, 200);
            }
        }, index * 200);
    });
}

function generateRandomNumbers() {
    const pool = Array.from({length: 60}, (_, i) => i + 1);
    const selection = [];
    for(let i=0; i<6; i++) {
        const idx = Math.floor(Math.random() * pool.length);
        selection.push(pool.splice(idx, 1)[0]);
    }
    return selection.sort((a,b) => a - b);
}

function generateSmartNumbers() {
    // Strategy: 3 Hot, 1 Cold, 2 Random (but excluding already picked)
    const selection = new Set();
    
    // Helper to pick random from array
    const sample = (arr) => arr[Math.floor(Math.random() * arr.length)];

    // 1. Pick 3 Hot numbers
    while(selection.size < 3) {
        selection.add(sample(stats.hot));
    }

    // 2. Pick 1 Overdue number
    while(selection.size < 4) {
        const num = sample(stats.overdue);
        if(!selection.has(num)) selection.add(num);
    }
    
    // 3. Fill rest with random
    while(selection.size < 6) {
        const num = Math.floor(Math.random() * 60) + 1;
        selection.add(num);
    }

    return Array.from(selection).sort((a,b) => a - b);
}

// Start
init();
