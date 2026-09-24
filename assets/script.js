const $ = (selector) => {
    const el = document.querySelector(selector);
    if (!el) throw new Error(`Elemen tidak ditemukan: ${selector}`);
    return el;
};

const $all = (selector) => document.querySelectorAll(selector);

document.addEventListener("DOMContentLoaded", () => {
    const tabButtons = $all(".tab-btn");
    const tabPanels = $all(".tab-panel");

    const switchTab = (tabName) => {
        tabPanels.forEach(panel => {
            if (panel.id === `panel-${tabName}`) {
                panel.classList.remove("hidden");
            } else {
                panel.classList.add("hidden");
            }
        });

        tabButtons.forEach(btn => {
            if (btn.dataset.tab === tabName) {
                btn.className = "tab-btn px-4 py-2 text-sm font-medium rounded-lg transition bg-white text-indigo-600 shadow-sm";
            } else {
                btn.className = "tab-btn px-4 py-2 text-sm font-medium rounded-lg transition text-slate-600 hover:text-indigo-600";
            }
        });

        localStorage.setItem("active-tab", tabName);
    };

    tabButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            switchTab(btn.dataset.tab);
        });
    });

    const savedTab = localStorage.getItem("active-tab") || "expense";
    switchTab(savedTab);

    let expenses = JSON.parse(localStorage.getItem("expenses")) || [];
    
    const formatRupiah = (number) => {
        return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(number);
    };

    const renderExpenses = () => {
        const listEl = $("#expense-list");
        const emptyEl = $("#expense-empty");
        const searchVal = $("#exp-search").value.toLowerCase();
        const filterType = $("#exp-filter-type").value;

        const filtered = expenses.filter(item => {
            const matchSearch = item.title.toLowerCase().includes(searchVal) || item.category.toLowerCase().includes(searchVal);
            const matchType = filterType === "all" || item.type === filterType;
            return matchSearch && matchType;
        });

        listEl.innerHTML = "";
        if (filtered.length === 0) {
            emptyEl.classList.remove("hidden");
        } else {
            emptyEl.classList.add("hidden");
            filtered.forEach(item => {
                const tr = document.createElement("tr");
                tr.className = "border-b border-slate-100 hover:bg-slate-50 transition";
                tr.innerHTML = `
                    <td class="py-3 px-2 text-slate-500 text-xs">${item.date}</td>
                    <td class="py-3 px-2 font-medium text-slate-800">${item.title}</td>
                    <td class="py-3 px-2"><span class="px-2 py-1 bg-slate-100 text-slate-600 rounded-md text-xs">${item.category}</span></td>
                    <td class="py-3 px-2"><span class="px-2 py-1 ${item.type === 'Pemasukan' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'} rounded-md text-xs font-medium">${item.type}</span></td>
                    <td class="py-3 px-2 font-semibold ${item.type === 'Pemasukan' ? 'text-emerald-600' : 'text-rose-600'}">${formatRupiah(item.amount)}</td>
                    <td class="py-3 px-2 text-center space-x-1">
                        <button onclick="editExpense('${item.id}')" class="px-2 py-1 text-xs bg-amber-50 text-amber-600 rounded hover:bg-amber-100 transition">Ubah</button>
                        <button onclick="deleteExpense('${item.id}')" class="px-2 py-1 text-xs bg-rose-50 text-rose-600 rounded hover:bg-rose-100 transition">Hapus</button>
                    </td>
                `;
                listEl.appendChild(tr);
            });
        }

        let totalInc = 0;
        let totalExp = 0;
        expenses.forEach(i => {
            if (i.type === "Pemasukan") totalInc += Number(i.amount);
            else totalExp += Number(i.amount);
        });

        $("#total-income").textContent = formatRupiah(totalInc);
        $("#total-expense").textContent = formatRupiah(totalExp);
        $("#total-balance").textContent = formatRupiah(totalInc - totalExp);

        localStorage.setItem("expenses", JSON.stringify(expenses));
    };

    $("#expense-form").addEventListener("submit", (e) => {
        e.preventDefault();
        const title = $("#exp-title").value.trim();
        const amount = Number($("#exp-amount").value);
        const type = $("#exp-type").value;
        const category = $("#exp-category").value.trim();
        const date = $("#exp-date").value;

        if (!title || amount <= 0 || !category || !date) return;

        const newItem = {
            id: Date.now().toString(),
            title,
            amount,
            type,
            category,
            date
        };

        expenses.push(newItem);
        renderExpenses();
        e.target.reset();
    });

    $("#exp-search").addEventListener("input", renderExpenses);
    $("#exp-filter-type").addEventListener("change", renderExpenses);

    window.deleteExpense = (id) => {
        expenses = expenses.filter(i => i.id !== id);
        renderExpenses();
    };

    window.editExpense = (id) => {
        const item = expenses.find(i => i.id === id);
        if (!item) return;

        $("#modal-title").textContent = "Ubah Catatan Pengeluaran";
        $("#modal-body").innerHTML = `
            <input type="text" id="edit-exp-title" value="${item.title}" class="w-full px-3 py-2 border rounded-lg text-sm">
            <input type="number" id="edit-exp-amount" value="${item.amount}" class="w-full px-3 py-2 border rounded-lg text-sm">
            <select id="edit-exp-type" class="w-full px-3 py-2 border rounded-lg text-sm">
                <option value="Pemasukan" ${item.type === 'Pemasukan' ? 'selected' : ''}>Pemasukan</option>
                <option value="Pengeluaran" ${item.type === 'Pengeluaran' ? 'selected' : ''}>Pengeluaran</option>
            </select>
            <input type="text" id="edit-exp-category" value="${item.category}" class="w-full px-3 py-2 border rounded-lg text-sm">
            <input type="date" id="edit-exp-date" value="${item.date}" class="w-full px-3 py-2 border rounded-lg text-sm">
        `;

        const modal = $("#edit-modal");
        modal.classList.remove("hidden");

        const saveHandler = () => {
            item.title = $("#edit-exp-title").value.trim();
            item.amount = Number($("#edit-exp-amount").value);
            item.type = $("#edit-exp-type").value;
            item.category = $("#edit-exp-category").value.trim();
            item.date = $("#edit-exp-date").value;

            modal.classList.add("hidden");
            renderExpenses();
            $("#modal-save").removeEventListener("click", saveHandler);
        };

        const cancelHandler = () => {
            modal.classList.add("hidden");
            $("#modal-cancel").removeEventListener("click", cancelHandler);
        };

        $("#modal-save").onclick = saveHandler;
        $("#modal-cancel").onclick = cancelHandler;
    };

    let bookmarks = JSON.parse(localStorage.getItem("bookmarks")) || [];

    const renderBookmarks = () => {
        const gridEl = $("#bookmark-grid");
        const emptyEl = $("#bookmark-empty");
        const searchVal = $("#bm-search").value.toLowerCase();

        const filtered = bookmarks.filter(b => 
            b.title.toLowerCase().includes(searchVal) || 
            b.url.toLowerCase().includes(searchVal) || 
            b.category.toLowerCase().includes(searchVal)
        );

        gridEl.innerHTML = "";
        if (filtered.length === 0) {
            emptyEl.classList.remove("hidden");
        } else {
            emptyEl.classList.add("hidden");
            filtered.forEach(b => {
                const card = document.createElement("div");
                card.className = "bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-3";
                card.innerHTML = `
                    <div>
                        <div class="flex justify-between items-start gap-2">
                            <h3 class="font-semibold text-slate-800 text-sm">${b.title}</h3>
                            <span class="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded text-xs">${b.category}</span>
                        </div>
                        <a href="${b.url}" target="_blank" rel="noopener noreferrer" class="text-xs text-indigo-600 hover:underline break-all mt-1 block">${b.url}</a>
                        ${b.note ? `<p class="text-xs text-slate-500 mt-2">${b.note}</p>` : ''}
                    </div>
                    <div class="flex justify-end space-x-1 pt-2 border-t border-slate-100">
                        <button onclick="editBookmark('${b.id}')" class="px-2.5 py-1 text-xs bg-amber-50 text-amber-600 rounded hover:bg-amber-100 transition">Ubah</button>
                        <button onclick="deleteBookmark('${b.id}')" class="px-2.5 py-1 text-xs bg-rose-50 text-rose-600 rounded hover:bg-rose-100 transition">Hapus</button>
                    </div>
                `;
                gridEl.appendChild(card);
            });
        }

        localStorage.setItem("bookmarks", JSON.stringify(bookmarks));
    };

    $("#bookmark-form").addEventListener("submit", (e) => {
        e.preventDefault();
        const title = $("#bm-title").value.trim();
        const url = $("#bm-url").value.trim();
        const category = $("#bm-category").value.trim();
        const note = $("#bm-note").value.trim();

        if (!url.startsWith("http://") && !url.startsWith("https://")) {
            alert("URL harus diawali dengan http:// atau https://");
            return;
        }

        const newBookmark = {
            id: Date.now().toString(),
            title,
            url,
            category,
            note
        };

        bookmarks.push(newBookmark);
        renderBookmarks();
        e.target.reset();
    });

    $("#bm-search").addEventListener("input", renderBookmarks);

    window.deleteBookmark = (id) => {
        bookmarks = bookmarks.filter(b => b.id !== id);
        renderBookmarks();
    };

    window.editBookmark = (id) => {
        const item = bookmarks.find(b => b.id === id);
        if (!item) return;

        $("#modal-title").textContent = "Ubah Bookmark";
        $("#modal-body").innerHTML = `
            <input type="text" id="edit-bm-title" value="${item.title}" class="w-full px-3 py-2 border rounded-lg text-sm">
            <input type="url" id="edit-bm-url" value="${item.url}" class="w-full px-3 py-2 border rounded-lg text-sm">
            <input type="text" id="edit-bm-category" value="${item.category}" class="w-full px-3 py-2 border rounded-lg text-sm">
            <input type="text" id="edit-bm-note" value="${item.note || ''}" class="w-full px-3 py-2 border rounded-lg text-sm">
        `;

        const modal = $("#edit-modal");
        modal.classList.remove("hidden");

        const saveHandler = () => {
            const newUrl = $("#edit-bm-url").value.trim();
            if (!newUrl.startsWith("http://") && !newUrl.startsWith("https://")) {
                alert("URL harus diawali dengan http:// atau https://");
                return;
            }

            item.title = $("#edit-bm-title").value.trim();
            item.url = newUrl;
            item.category = $("#edit-bm-category").value.trim();
            item.note = $("#edit-bm-note").value.trim();

            modal.classList.add("hidden");
            renderBookmarks();
            $("#modal-save").removeEventListener("click", saveHandler);
        };

        const cancelHandler = () => {
            modal.classList.add("hidden");
            $("#modal-cancel").removeEventListener("click", cancelHandler);
        };

        $("#modal-save").onclick = saveHandler;
        $("#modal-cancel").onclick = cancelHandler;
    };

    const quizData = [
        {
            question: "Atribut HTML apa yang digunakan untuk menentukan URL tautan pada tag <a>?",
            options: ["src", "href", "link", "url"],
            answer: 1
        },
        {
            question: "Properti CSS apa yang digunakan untuk mengubah warna teks?",
            options: ["font-color", "text-color", "color", "background-color"],
            answer: 2
        },
        {
            question: "Metode JavaScript apa yang digunakan untuk memilih elemen berdasarkan ID?",
            options: ["querySelectorAll", "getElementById", "getElementsByClassName", "selectElement"],
            answer: 1
        },
        {
            question: "Tag HTML mana yang paling tepat untuk membungkus konten utama halaman?",
            options: ["<section>", "<main>", "<div>", "<article>"],
            answer: 1
        },
        {
            question: "Objek web storage apa di JavaScript yang menyimpan data secara permanen tanpa batas waktu?",
            options: ["localStorage", "sessionStorage", "cookieStorage", "browserStorage"],
            answer: 0
        }
    ];

    let currentQuizIndex = 0;
    let score = 0;
    let highscore = Number(localStorage.getItem("quiz-highscore")) || 0;

    $("#quiz-highscore").textContent = highscore;

    $("#btn-start-quiz").addEventListener("click", () => {
        currentQuizIndex = 0;
        score = 0;
        $("#quiz-start-screen").classList.add("hidden");
        $("#quiz-result-screen").classList.add("hidden");
        $("#quiz-play-screen").classList.remove("hidden");
        loadQuizQuestion();
    });

    const loadQuizQuestion = () => {
        const currentQ = quizData[currentQuizIndex];
        $("#quiz-progress").textContent = `Soal ${currentQuizIndex + 1} dari ${quizData.length}`;
        $("#quiz-current-score").textContent = score;
        $("#quiz-question").textContent = currentQ.question;

        const optionsEl = $("#quiz-options");
        optionsEl.innerHTML = "";

        currentQ.options.forEach((opt, idx) => {
            const btn = document.createElement("button");
            btn.className = "w-full text-left px-4 py-2.5 border rounded-lg text-sm hover:bg-indigo-50 hover:border-indigo-300 transition";
            btn.textContent = `${String.fromCharCode(65 + idx)}. ${opt}`;
            btn.addEventListener("click", () => selectQuizAnswer(idx));
            optionsEl.appendChild(btn);
        });
    };

    const selectQuizAnswer = (selectedIndex) => {
        const currentQ = quizData[currentQuizIndex];
        if (selectedIndex === currentQ.answer) {
            score += 1;
        }

        currentQuizIndex++;
        if (currentQuizIndex < quizData.length) {
            loadQuizQuestion();
        } else {
            finishQuiz();
        }
    };

    const finishQuiz = () => {
        $("#quiz-play-screen").classList.add("hidden");
        $("#quiz-result-screen").classList.remove("hidden");
        $("#quiz-final-score").textContent = `${score} / ${quizData.length}`;

        if (score > highscore) {
            highscore = score;
            localStorage.setItem("quiz-highscore", highscore);
            $("#quiz-highscore").textContent = highscore;
        }
    };

    $("#btn-restart-quiz").addEventListener("click", () => {
        currentQuizIndex = 0;
        score = 0;
        $("#quiz-result-screen").classList.add("hidden");
        $("#quiz-play-screen").classList.remove("hidden");
        loadQuizQuestion();
    });

    renderExpenses();
    renderBookmarks();
});