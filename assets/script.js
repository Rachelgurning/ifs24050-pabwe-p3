document.addEventListener("DOMContentLoaded", () => {
    initTabs();
    initExpenseTracker();
    initBookmarkManager();
    initQuizApp();
});

function getStorageData(key, fallback = []) {
    try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : fallback;
    } catch (e) {
        return fallback;
    }
}

function initTabs() {
    const urlParams = new URLSearchParams(window.location.search);
    let currentTab = urlParams.get("tab");
    if (!["expense", "bookmark", "quiz"].includes(currentTab)) {
        currentTab = "expense";
        history.replaceState(null, "", "?tab=expense");
    }
    switchTab(currentTab, false);

    document.getElementById("tab-expense-btn").addEventListener("click", () => switchTab("expense"));
    document.getElementById("tab-bookmark-btn").addEventListener("click", () => switchTab("bookmark"));
    document.getElementById("tab-quiz-btn").addEventListener("click", () => switchTab("quiz"));
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
    let expenses = getStorageData(STORAGE_KEY, []);

    const form = document.getElementById("expense-form");
    const titleInput = document.getElementById("exp-title");
    const amountInput = document.getElementById("exp-amount");
    const categoryInput = document.getElementById("exp-category");
    const typeInput = document.getElementById("exp-type");
    const dateInput = document.getElementById("exp-date");
    const searchInput = document.getElementById("exp-search");
    const filterType = document.getElementById("exp-filter-type");
    const sortSelect = document.getElementById("exp-sort");
    const tableBody = document.getElementById("expense-table-body");

    form.addEventListener("submit", (e) => {
        e.preventDefault();
        const amountVal = Number(amountInput.value);

        if (!Number.isFinite(amountVal) || amountVal <= 0) {
            alert("Jumlah pengeluaran/pemasukan harus berupa angka positif yang valid.");
            return;
        }

        const newExpense = {
            id: Date.now(),
            title: titleInput.value.trim(),
            amount: amountVal,
            category: categoryInput.value.trim(),
            type: typeInput.value,
            date: dateInput.value
        };

        expenses.push(newExpense);
        saveAndRender();
        form.reset();
    });

    searchInput.addEventListener("input", renderExpenses);
    filterType.addEventListener("change", renderExpenses);
    sortSelect.addEventListener("change", renderExpenses);

    tableBody.addEventListener("click", (e) => {
        const target = e.target;
        const id = Number(target.dataset.id);
        if (!id) return;

        if (target.classList.contains("btn-edit")) {
            openExpenseEditModal(id);
        } else if (target.classList.contains("btn-delete")) {
            openExpenseDeleteModal(id);
        }
    });

    function saveAndRender() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
        renderExpenses();
    }

    function renderExpenses() {
        const keyword = searchInput.value.toLowerCase();
        const filter = filterType.value;
        const sortVal = sortSelect.value;
        const emptyState = document.getElementById("expense-empty");

        let filtered = expenses.filter(item => {
            const matchKeyword = item.title.toLowerCase().includes(keyword) || item.category.toLowerCase().includes(keyword);
            const matchFilter = filter === "Semua" || item.type === filter;
            return matchKeyword && matchFilter;
        });

        filtered.sort((a, b) => {
            if (sortVal === "newest") return new Date(b.date) - new Date(a.date);
            if (sortVal === "oldest") return new Date(a.date) - new Date(b.date);
            if (sortVal === "highest") return b.amount - a.amount;
        });

        tableBody.innerHTML = "";
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
                        <button data-id="${item.id}" class="btn-edit text-indigo-600 hover:text-indigo-800 text-xs font-medium">Ubah</button>
                        <button data-id="${item.id}" class="btn-delete text-rose-600 hover:text-rose-800 text-xs font-medium">Hapus</button>
                    </td>
                `;
                tableBody.appendChild(tr);
            });
        }
    }

    function openExpenseEditModal(id) {
        const item = expenses.find(exp => exp.id === id);
        if (!item) return;

        showModal("Ubah Catatan Pengeluaran", `
            <div class="space-y-3">
                <div><label class="text-xs font-medium text-slate-600">Judul</label><input type="text" id="m-title" class="w-full px-3 py-2 border rounded-lg text-sm"></div>
                <div><label class="text-xs font-medium text-slate-600">Jumlah</label><input type="number" id="m-amount" min="1" class="w-full px-3 py-2 border rounded-lg text-sm"></div>
                <div><label class="text-xs font-medium text-slate-600">Kategori</label><input type="text" id="m-category" class="w-full px-3 py-2 border rounded-lg text-sm"></div>
                <div><label class="text-xs font-medium text-slate-600">Tipe</label>
                    <select id="m-type" class="w-full px-3 py-2 border rounded-lg text-sm bg-white">
                        <option value="Pemasukan">Pemasukan</option>
                        <option value="Pengeluaran">Pengeluaran</option>
                    </select>
                </div>
                <div><label class="text-xs font-medium text-slate-600">Tanggal</label><input type="date" id="m-date" class="w-full px-3 py-2 border rounded-lg text-sm"></div>
            </div>
        `, () => {
            const amountVal = Number(document.getElementById("m-amount").value);
            if (!Number.isFinite(amountVal) || amountVal <= 0) {
                alert("Jumlah harus berupa angka positif.");
                return;
            }

            item.title = document.getElementById("m-title").value.trim();
            item.amount = amountVal;
            item.category = document.getElementById("m-category").value.trim();
            item.type = document.getElementById("m-type").value;
            item.date = document.getElementById("m-date").value;
            saveAndRender();
            hideModal();
        });

        document.getElementById("m-title").value = item.title;
        document.getElementById("m-amount").value = item.amount;
        document.getElementById("m-category").value = item.category;
        document.getElementById("m-type").value = item.type;
        document.getElementById("m-date").value = item.date;
    }

    function openExpenseDeleteModal(id) {
        showModal("Konfirmasi Hapus", `<p class="text-sm text-slate-600">Apakah anda yakin ingin menghapus catatan pengeluaran ini?</p>`, () => {
            expenses = expenses.filter(exp => exp.id !== id);
            saveAndRender();
            hideModal();
        });
    }

    renderExpenses();
}

function initBookmarkManager() {
    const STORAGE_KEY = "pabwe_bookmarks";
    let bookmarks = getStorageData(STORAGE_KEY, []);

    const form = document.getElementById("bookmark-form");
    const titleInput = document.getElementById("bm-title");
    const urlInput = document.getElementById("bm-url");
    const categoryInput = document.getElementById("bm-category");
    const noteInput = document.getElementById("bm-note");
    const searchInput = document.getElementById("bm-search");
    const sortSelect = document.getElementById("bm-sort");
    const listContainer = document.getElementById("bookmark-list");

    form.addEventListener("submit", (e) => {
        e.preventDefault();
        const urlVal = urlInput.value.trim();
        if (!urlVal.startsWith("http://") && !urlVal.startsWith("https://")) {
            alert("URL wajib diawali dengan http:// atau https://");
            return;
        }

        const newBookmark = {
            id: Date.now(),
            title: titleInput.value.trim(),
            url: urlVal,
            category: categoryInput.value.trim(),
            note: noteInput.value.trim()
        };

        bookmarks.push(newBookmark);
        saveAndRender();
        form.reset();
    });

    searchInput.addEventListener("input", renderBookmarks);
    sortSelect.addEventListener("change", renderBookmarks);

    listContainer.addEventListener("click", (e) => {
        const target = e.target;
        const id = Number(target.dataset.id);
        if (!id) return;

        if (target.classList.contains("bm-edit")) {
            openBookmarkEditModal(id);
        } else if (target.classList.contains("bm-delete")) {
            openBookmarkDeleteModal(id);
        }
    });

    function saveAndRender() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(bookmarks));
        renderBookmarks();
    }

    function renderBookmarks() {
        const keyword = searchInput.value.toLowerCase();
        const sortVal = sortSelect.value;
        const emptyState = document.getElementById("bookmark-empty");

        let filtered = bookmarks.filter(item => 
            item.title.toLowerCase().includes(keyword) || 
            item.category.toLowerCase().includes(keyword) ||
            item.url.toLowerCase().includes(keyword)
        );

        filtered.sort((a, b) => {
            if (sortVal === "az") return a.title.localeCompare(b.title);
            if (sortVal === "za") return b.title.localeCompare(a.title);
        });

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
                        <a href="${escapeHTML(item.url)}" target="_blank" rel="noopener noreferrer" class="text-xs text-indigo-600 hover:underline break-all block mt-0.5">${escapeHTML(item.url)}</a>
                        ${item.note ? `<p class="text-xs text-slate-600 mt-2">${escapeHTML(item.note)}</p>` : ''}
                    </div>
                    <div class="flex justify-end gap-3 pt-2 border-t border-slate-200 text-xs">
                        <button data-id="${item.id}" class="bm-edit text-indigo-600 font-medium hover:underline">Ubah</button>
                        <button data-id="${item.id}" class="bm-delete text-rose-600 font-medium hover:underline">Hapus</button>
                    </div>
                `;
                listContainer.appendChild(card);
            });
        }
    }

    function openBookmarkEditModal(id) {
        const item = bookmarks.find(bm => bm.id === id);
        if (!item) return;

        showModal("Ubah Bookmark", `
            <div class="space-y-3">
                <div><label class="text-xs font-medium text-slate-600">Judul Tautan</label><input type="text" id="m-bm-title" class="w-full px-3 py-2 border rounded-lg text-sm"></div>
                <div><label class="text-xs font-medium text-slate-600">URL</label><input type="url" id="m-bm-url" class="w-full px-3 py-2 border rounded-lg text-sm"></div>
                <div><label class="text-xs font-medium text-slate-600">Kategori</label><input type="text" id="m-bm-category" class="w-full px-3 py-2 border rounded-lg text-sm"></div>
                <div><label class="text-xs font-medium text-slate-600">Catatan</label><input type="text" id="m-bm-note" class="w-full px-3 py-2 border rounded-lg text-sm"></div>
            </div>
        `, () => {
            const urlVal = document.getElementById("m-bm-url").value.trim();
            if (!urlVal.startsWith("http://") && !urlVal.startsWith("https://")) {
                alert("URL wajib diawali dengan http:// atau https://");
                return;
            }
            item.title = document.getElementById("m-bm-title").value.trim();
            item.url = urlVal;
            item.category = document.getElementById("m-bm-category").value.trim();
            item.note = document.getElementById("m-bm-note").value.trim();
            saveAndRender();
            hideModal();
        });

        document.getElementById("m-bm-title").value = item.title;
        document.getElementById("m-bm-url").value = item.url;
        document.getElementById("m-bm-category").value = item.category;
        document.getElementById("m-bm-note").value = item.note;
    }

    function openBookmarkDeleteModal(id) {
        showModal("Konfirmasi Hapus", `<p class="text-sm text-slate-600">Apakah anda yakin ingin menghapus bookmark ini?</p>`, () => {
            bookmarks = bookmarks.filter(bm => bm.id !== id);
            saveAndRender();
            hideModal();
        });
    }

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
    const pointsPerQuestion = Math.round(100 / questions.length);

    document.getElementById("high-score").textContent = highScore;

    document.getElementById("quiz-start-btn").addEventListener("click", startQuiz);
    document.getElementById("quiz-restart-btn").addEventListener("click", startQuiz);
    document.getElementById("quiz-next-btn").addEventListener("click", nextQuestion);

    function startQuiz() {
        currentIdx = 0;
        score = 0;
        document.getElementById("quiz-start-screen").classList.add("hidden");
        document.getElementById("quiz-result-screen").classList.add("hidden");
        document.getElementById("quiz-question-screen").classList.remove("hidden");
        loadQuestion();
    }

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
            btn.addEventListener("click", () => selectAnswer(idx, btn));
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
            score += pointsPerQuestion;
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

    function nextQuestion() {
        currentIdx++;
        if (currentIdx < questions.length) {
            loadQuestion();
        } else {
            endQuiz();
        }
    }

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

function showModal(title, htmlContent, onConfirm) {
    const modal = document.getElementById("app-modal");
    document.getElementById("modal-title").textContent = title;
    document.getElementById("modal-body").innerHTML = htmlContent;
    modal.classList.remove("hidden");
    modal.classList.add("flex");

    const confirmBtn = document.getElementById("modal-confirm-btn");
    const cancelBtn = document.getElementById("modal-cancel-btn");

    const newConfirmBtn = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);

    const newCancelBtn = cancelBtn.cloneNode(true);
    cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);

    newConfirmBtn.addEventListener("click", onConfirm);
    newCancelBtn.addEventListener("click", hideModal);
}

function hideModal() {
    const modal = document.getElementById("app-modal");
    modal.classList.remove("flex");
    modal.classList.add("hidden");
}

function formatRupiah(number) {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(number);
}

function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, 
        tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
}