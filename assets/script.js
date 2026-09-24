document.addEventListener("DOMContentLoaded", () => {
    initTabs();
    initExpenseTracker();
    initBookmarkManager();
    initQuizApp();
});

function initTabs() {
    const urlParams = new URLSearchParams(window.location.search);
    let currentTab = urlParams.get("tab");
    if (!["expense", "bookmark", "quiz"].includes(currentTab)) {
        currentTab = "expense";
        history.replaceState(null, "", "?tab=expense");
    }
    switchTab(currentTab, false);
}

function switchTab(tabName, updateHistory = true) {
    if (updateHistory) {
        history.replaceState(null, "", `?tab=${tabName}`);
    }

    const panels = {
        expense: document.getElementById("panel-expense"),
        bookmark: document.getElementById("panel-bookmark"),
        quiz: document.getElementById("panel-quiz")
    };

    const buttons = {
        expense: document.getElementById("tab-expense-btn"),
        bookmark: document.getElementById("tab-bookmark-btn"),
        quiz: document.getElementById("tab-quiz-btn")
    };

    Object.keys(panels).forEach(key => {
        if (key === tabName) {
            panels[key].classList.remove("hidden");
            buttons[key].className = "px-5 py-2 rounded-full text-sm font-medium transition-all bg-indigo-600 text-white shadow-sm";
        } else {
            panels[key].classList.add("hidden");
            buttons[key].className = "px-5 py-2 rounded-full text-sm font-medium transition-all text-slate-600 hover:text-indigo-600";
        }
    });
}

function initExpenseTracker() {
    const STORAGE_KEY = "pabwe_expenses";
    let expenses = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];

    const form = document.getElementById("expense-form");
    const idInput = document.getElementById("exp-id");
    const titleInput = document.getElementById("exp-title");
    const amountInput = document.getElementById("exp-amount");
    const categoryInput = document.getElementById("exp-category");
    const typeInput = document.getElementById("exp-type");
    const dateInput = document.getElementById("exp-date");
    const cancelBtn = document.getElementById("exp-cancel-btn");
    const submitBtn = document.getElementById("exp-submit-btn");
    const searchInput = document.getElementById("exp-search");
    const filterType = document.getElementById("exp-filter-type");

    form.addEventListener("submit", (e) => {
        e.preventDefault();
        const id = idInput.value ? Number(idInput.value) : Date.now();
        const title = titleInput.value.trim();
        const amount = Number(amountInput.value);
        const category = categoryInput.value.trim();
        const type = typeInput.value;
        const date = dateInput.value;

        if (!title || !amount || !category || !date) return;

        const index = expenses.findIndex(item => item.id === id);
        if (index !== -1) {
            expenses[index] = { id, title, amount, category, type, date };
        } else {
            expenses.push({ id, title, amount, category, type, date });
        }

        saveAndRender();
        resetExpenseForm();
    });

    window.resetExpenseForm = function() {
        form.reset();
        idInput.value = "";
        cancelBtn.classList.add("hidden");
        submitBtn.textContent = "Tambah Catatan";
    };

    window.editExpense = function(id) {
        const item = expenses.find(exp => exp.id === id);
        if (!item) return;
        idInput.value = item.id;
        titleInput.value = item.title;
        amountInput.value = item.amount;
        categoryInput.value = item.category;
        typeInput.value = item.type;
        dateInput.value = item.date;
        cancelBtn.classList.remove("hidden");
        submitBtn.textContent = "Simpan Perubahan";
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    window.deleteExpense = function(id) {
        if (confirm("Apakah anda yakin ingin menghapus catatan ini?")) {
            expenses = expenses.filter(exp => exp.id !== id);
            saveAndRender();
        }
    };

    function saveAndRender() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
        renderExpenses();
    }

    window.renderExpenses = function() {
        const keyword = searchInput.value.toLowerCase();
        const filter = filterType.value;
        const tbody = document.getElementById("expense-table-body");
        const emptyState = document.getElementById("expense-empty");

        let filtered = expenses.filter(item => {
            const matchKeyword = item.title.toLowerCase().includes(keyword) || item.category.toLowerCase().includes(keyword);
            const matchFilter = filter === "Semua" || item.type === filter;
            return matchKeyword && matchFilter;
        });

        filtered.sort((a, b) => new Date(b.date) - new Date(a.date));

        tbody.innerHTML = "";
        let totalIncome = 0;
        let totalExpense = 0;

        expenses.forEach(item => {
            if (item.type === "Pemasukan") totalIncome += Number(item.amount);
            else totalExpense += Number(item.amount);
        });

        document.getElementById("total-income").textContent = formatRupiah(totalIncome);
        document.getElementById("total-expense").textContent = formatRupiah(totalExpense);
        document.getElementById("total-balance").textContent = formatRupiah(totalIncome - totalExpense);

        if (filtered.length === 0) {
            emptyState.classList.remove("hidden");
        } else {
            emptyState.classList.add("hidden");
            filtered.forEach(item => {
                const tr = document.createElement("tr");
                tr.className = "border-b border-slate-100 hover:bg-slate-50";
                tr.innerHTML = `
                    <td class="py-3 px-2 text-slate-600">${item.date}</td>
                    <td class="py-3 px-2 font-medium text-slate-800">${escapeHTML(item.title)}</td>
                    <td class="py-3 px-2 text-slate-600">${escapeHTML(item.category)}</td>
                    <td class="py-3 px-2">
                        <span class="px-2 py-1 rounded-full text-xs font-semibold ${item.type === 'Pemasukan' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}">
                            ${item.type}
                        </span>
                    </td>
                    <td class="py-3 px-2 font-semibold ${item.type === 'Pemasukan' ? 'text-emerald-700' : 'text-rose-700'}">
                        ${item.type === 'Pemasukan' ? '+' : '-'}${formatRupiah(item.amount)}
                    </td>
                    <td class="py-3 px-2 text-center space-x-2">
                        <button onclick="editExpense(${item.id})" class="text-indigo-600 hover:text-indigo-800 text-xs font-medium">Ubah</button>
                        <button onclick="deleteExpense(${item.id})" class="text-rose-600 hover:text-rose-800 text-xs font-medium">Hapus</button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        }
    };

    renderExpenses();
}

function initBookmarkManager() {
    const STORAGE_KEY = "pabwe_bookmarks";
    let bookmarks = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];

    const form = document.getElementById("bookmark-form");
    const idInput = document.getElementById("bm-id");
    const titleInput = document.getElementById("bm-title");
    const urlInput = document.getElementById("bm-url");
    const categoryInput = document.getElementById("bm-category");
    const noteInput = document.getElementById("bm-note");
    const cancelBtn = document.getElementById("bm-cancel-btn");
    const submitBtn = document.getElementById("bm-submit-btn");
    const searchInput = document.getElementById("bm-search");

    form.addEventListener("submit", (e) => {
        e.preventDefault();
        const urlVal = urlInput.value.trim();
        if (!urlVal.startsWith("http://") && !urlVal.startsWith("https://")) {
            alert("URL wajib diawali dengan http:// atau https://");
            return;
        }

        const id = idInput.value ? Number(idInput.value) : Date.now();
        const title = titleInput.value.trim();
        const category = categoryInput.value.trim();
        const note = noteInput.value.trim();

        const index = bookmarks.findIndex(item => item.id === id);
        if (index !== -1) {
            bookmarks[index] = { id, title, url: urlVal, category, note };
        } else {
            bookmarks.push({ id, title, url: urlVal, category, note });
        }

        saveAndRender();
        resetBookmarkForm();
    });

    window.resetBookmarkForm = function() {
        form.reset();
        idInput.value = "";
        cancelBtn.classList.add("hidden");
        submitBtn.textContent = "Simpan Bookmark";
    };

    window.editBookmark = function(id) {
        const item = bookmarks.find(bm => bm.id === id);
        if (!item) return;
        idInput.value = item.id;
        titleInput.value = item.title;
        urlInput.value = item.url;
        categoryInput.value = item.category;
        noteInput.value = item.note;
        cancelBtn.classList.remove("hidden");
        submitBtn.textContent = "Simpan Perubahan";
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    window.deleteBookmark = function(id) {
        if (confirm("Apakah anda yakin ingin menghapus bookmark ini?")) {
            bookmarks = bookmarks.filter(bm => bm.id !== id);
            saveAndRender();
        }
    };

    function saveAndRender() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(bookmarks));
        renderBookmarks();
    }

    window.renderBookmarks = function() {
        const keyword = searchInput.value.toLowerCase();
        const listContainer = document.getElementById("bookmark-list");
        const emptyState = document.getElementById("bookmark-empty");

        let filtered = bookmarks.filter(item => 
            item.title.toLowerCase().includes(keyword) || 
            item.category.toLowerCase().includes(keyword) ||
            item.url.toLowerCase().includes(keyword)
        );

        listContainer.innerHTML = "";
        if (filtered.length === 0) {
            emptyState.classList.remove("hidden");
        } else {
            emptyState.classList.add("hidden");
            filtered.forEach(item => {
                const card = document.createElement("div");
                card.className = "p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-col justify-between gap-3";
                card.innerHTML = `
                    <div>
                        <span class="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-xs font-semibold rounded-full">${escapeHTML(item.category)}</span>
                        <h3 class="font-bold text-slate-800 text-base mt-1">${escapeHTML(item.title)}</h3>
                        <a href="${item.url}" target="_blank" rel="noopener noreferrer" class="text-xs text-indigo-600 hover:underline break-all block mt-0.5">${escapeHTML(item.url)}</a>
                        ${item.note ? `<p class="text-xs text-slate-600 mt-2">${escapeHTML(item.note)}</p>` : ''}
                    </div>
                    <div class="flex justify-end gap-3 pt-2 border-t border-slate-200 text-xs">
                        <button onclick="editBookmark(${item.id})" class="text-indigo-600 font-medium hover:underline">Ubah</button>
                        <button onclick="deleteBookmark(${item.id})" class="text-rose-600 font-medium hover:underline">Hapus</button>
                    </div>
                `;
                listContainer.appendChild(card);
            });
        }
    };

    renderBookmarks();
}

function initQuizApp() {
    const HIGH_SCORE_KEY = "pabwe_quiz_highscore";
    const questions = [
        {
            question: "Atribut HTML apa yang digunakan untuk menentukan URL tujuan pada sebuah tautan (link)?",
            options: ["src", "href", "link", "target"],
            answer: 1
        },
        {
            question: "Properti CSS manakah yang digunakan untuk mengubah warna teks?",
            options: ["font-color", "text-color", "color", "background-color"],
            answer: 2
        },
        {
            question: "Metode JavaScript apa yang digunakan untuk memilih elemen tunggal berdasarkan selector CSS?",
            options: ["getElementById", "querySelector", "querySelectorAll", "getElementsByClassName"],
            answer: 1
        },
        {
            question: "Manakah method array JavaScript yang digunakan untuk menambahkan elemen baru ke akhir array?",
            options: ["pop", "shift", "unshift", "push"],
            answer: 3
        },
        {
            question: "Apa fungsi utama dari penyimpanan lokal (localStorage) pada peramban web?",
            options: ["Menyimpan data sesi tanpa batas waktu kedaluwarsa otomatis", "Mengirim data secara langsung ke server basis data", "Mengamankan kredensial sandi pengguna", "Mempercepat unduhan aset gambar"],
            answer: 0
        }
    ];

    let currentIdx = 0;
    let score = 0;
    let highScore = Number(localStorage.getItem(HIGH_SCORE_KEY)) || 0;

    document.getElementById("high-score").textContent = highScore;

    window.startQuiz = function() {
        currentIdx = 0;
        score = 0;
        document.getElementById("quiz-start-screen").classList.add("hidden");
        document.getElementById("quiz-result-screen").classList.add("hidden");
        document.getElementById("quiz-question-screen").classList.remove("hidden");
        loadQuestion();
    };

    function loadQuestion() {
        const q = questions[currentIdx];
        document.getElementById("quiz-progress").textContent = `Soal ${currentIdx + 1} dari ${questions.length}`;
        document.getElementById("quiz-score-live").textContent = `Skor: ${score}`;
        document.getElementById("quiz-question-text").textContent = q.question;
        
        const optionsList = document.getElementById("quiz-options-list");
        optionsList.innerHTML = "";
        
        const feedback = document.getElementById("quiz-feedback");
        feedback.classList.add("hidden");
        document.getElementById("quiz-next-btn").classList.add("hidden");

        q.options.forEach((opt, idx) => {
            const btn = document.createElement("button");
            btn.className = "w-full text-left px-4 py-2.5 rounded-lg border border-slate-200 text-sm font-medium bg-white hover:bg-indigo-50 hover:border-indigo-300 transition";
            btn.textContent = opt;
            btn.onclick = () => selectAnswer(idx, btn);
            optionsList.appendChild(btn);
        });
    }

    function selectAnswer(selectedIndex, selectedBtn) {
        const q = questions[currentIdx];
        const optionsList = document.getElementById("quiz-options-list");
        const buttons = optionsList.querySelectorAll("button");
        
        buttons.forEach(b => b.disabled = true);

        const feedback = document.getElementById("quiz-feedback");
        feedback.classList.remove("hidden");

        if (selectedIndex === q.answer) {
            score += 20;
            selectedBtn.className = "w-full text-left px-4 py-2.5 rounded-lg border border-emerald-300 text-sm font-medium bg-emerald-50 text-emerald-800 transition";
            feedback.textContent = "Jawaban anda benar!";
            feedback.className = "text-sm font-medium text-emerald-700";
        } else {
            selectedBtn.className = "w-full text-left px-4 py-2.5 rounded-lg border border-rose-300 text-sm font-medium bg-rose-50 text-rose-800 transition";
            buttons[q.answer].className = "w-full text-left px-4 py-2.5 rounded-lg border border-emerald-300 text-sm font-medium bg-emerald-50 text-emerald-800 transition";
            feedback.textContent = "Jawaban anda kurang tepat.";
            feedback.className = "text-sm font-medium text-rose-700";
        }

        document.getElementById("quiz-score-live").textContent = `Skor: ${score}`;
        document.getElementById("quiz-next-btn").classList.remove("hidden");
    }

    window.nextQuestion = function() {
        currentIdx++;
        if (currentIdx < questions.length) {
            loadQuestion();
        } else {
            endQuiz();
        }
    };

    function endQuiz() {
        document.getElementById("quiz-question-screen").classList.add("hidden");
        document.getElementById("quiz-result-screen").classList.remove("hidden");
        document.getElementById("final-score").textContent = score;

        if (score > highScore) {
            highScore = score;
            localStorage.setItem(HIGH_SCORE_KEY, highScore);
            document.getElementById("high-score").textContent = highScore;
        }
    }
}

function formatRupiah(number) {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(number);
}

function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, 
        tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
}