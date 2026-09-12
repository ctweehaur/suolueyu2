// ==========================================
// 1. 初始化变量与状态管理
// ==========================================
let currentPlan = [];       // 当前学习的生词队列
let currentIndex = 0;       // 当前学习的生词索引
let isFlipped = false;      // 卡片是否翻转
let isWeaknessMode = false; // 是否处于错题专项训练模式

// --- Quiz 测验专用变量 ---
let quizQuestions = [];     // 测验题目队列
let quizCurrentIndex = 0;   // 当前题号
let quizScore = 0;          // 答对题数
let quizHistory = [];       // 已考过的词汇记录（用于避免重复）
let quizRound = 0;          // 当前轮次

if (typeof allIdioms === 'undefined') {
    console.error("错误：未找到生词数据，请检查 data.js 是否正确引入！");
}

// 辅助工具：提取等号前后的题目与答案
function splitWordItem(rawWord) {
    if (!rawWord) return { question: "未知生词", answer: "" };
    if (rawWord.includes("=")) {
        const parts = rawWord.split("=");
        return {
            question: parts[0].trim(),
            answer: parts[1].trim()
        };
    }
    return { question: rawWord.trim(), answer: rawWord.trim() };
}

// ==========================================
// 2. 核心初始化函数 (学习卡片)
// ==========================================
function initApp() {
    try {
        let wrongList = JSON.parse(localStorage.getItem('vocabulary_wrong_list')) || [];
        updateWeaknessButton(wrongList.length);

        currentPlan = [...allIdioms].sort(() => 0.5 - Math.random());
        currentIndex = 0;
        isWeaknessMode = false;
        
        quizHistory = [];
        quizRound = 0;
        
        setupFlipEvent();
        renderCard();
        updateMasteryProgress();
        updateNavButtons();
    } catch (error) {
        console.error("初始化失败:", error);
    }
}

function renderCard() {
    if (currentPlan.length === 0) {
        showEmptyState();
        return;
    }
    if (currentIndex >= currentPlan.length) { currentIndex = 0; }
    if (currentIndex < 0) { currentIndex = 0; }

    const currentWord = currentPlan[currentIndex];
    const flipCardEl = document.getElementById('flip-card');
    if (flipCardEl) flipCardEl.classList.remove('rotate-y-180');
    isFlipped = false;

    // 分离问题与缩略答案
    const { question, answer } = splitWordItem(currentWord.word);

    // ---------------- 正面渲染（拼音 + 汉字 精美流式排版） ----------------
    const rubyContainer = document.getElementById('card-word-ruby');
    if (rubyContainer) {
        const pinyinText = currentWord.pinyin || "";
        const questionPinyin = pinyinText.split("=")[0].trim();
        const pinyinArray = questionPinyin ? questionPinyin.split(/\s+/) : [];

        // 根据字数长短智能缩放字号与拼音大小
        let charSizeClass = "text-3xl sm:text-4xl";
        let pySizeClass = "text-xs sm:text-sm";
        let groupSize = 4; // 多少个字切分为一组词块

        if (question.length > 14) {
            charSizeClass = "text-base sm:text-lg";
            pySizeClass = "text-[10px] sm:text-xs";
            groupSize = 4;
        } else if (question.length > 8) {
            charSizeClass = "text-xl sm:text-2xl";
            pySizeClass = "text-xs";
            groupSize = 2;
        } else if (question.length > 4) {
            charSizeClass = "text-2xl sm:text-3xl";
            pySizeClass = "text-xs sm:text-sm";
            groupSize = 2;
        }

        // 把汉字和拼音按词块拆分，词块之间带明显间距，方便清晰朗读
        let rubyHtml = `<div class="flex flex-wrap justify-center items-center gap-y-3 gap-x-2 max-w-full">`;
        
        for (let i = 0; i < question.length; i += groupSize) {
            const chunkChars = question.slice(i, i + groupSize);
            rubyHtml += `<div class="ruby-phrase-block bg-stone-50/60 sm:bg-transparent px-1 py-0.5 rounded-lg">`;
            for (let j = 0; j < chunkChars.length; j++) {
                const charIndex = i + j;
                const char = chunkChars[j];
                const py = pinyinArray[charIndex] || "";
                rubyHtml += `
                    <ruby class="ruby-char-unit">
                        <rt class="${pySizeClass} text-stone-400 font-sans font-medium mb-0.5">${py}</rt>
                        <span class="font-serif font-bold ${charSizeClass} text-stone-800">${char}</span>
                    </ruby>
                `;
            }
            rubyHtml += `</div>`;
        }

        rubyHtml += `</div>`;
        rubyHtml += `
            <div class="w-full text-center mt-3 text-[11px] text-stone-400 font-sans tracking-normal">
                👆 概述原句 · 点击卡片翻看【提炼缩略词】
            </div>
        `;

        rubyContainer.innerHTML = rubyHtml;
    }

    // ---------------- 反面渲染 ----------------
    const defZhEl = document.getElementById('card-def-zh');
    if (defZhEl) {
        if (answer) {
            defZhEl.innerHTML = `
                <div class="mb-2 pb-2 border-b border-stone-200">
                    <span class="text-[10px] font-sans font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">概述提炼答案</span>
                    <div class="text-2xl sm:text-3xl font-serif font-bold text-emerald-600 mt-1">${answer}</div>
                </div>
                <div class="text-stone-700 text-xs sm:text-sm leading-relaxed">${currentWord.defZh || '暂无释义'}</div>
            `;
        } else {
            defZhEl.innerText = currentWord.defZh || '暂无释义';
        }
    }

    const defEnEl = document.getElementById('card-def-en');
    if (defEnEl) defEnEl.innerText = currentWord.defEn || 'No English translation available.';

    const defBmEl = document.getElementById('card-def-bm');
    if (defBmEl) defBmEl.innerText = currentWord.defBm || 'Tiada terjemahan.';

    const exampleEl = document.getElementById('card-example');
    if (exampleEl) {
        let exampleText = currentWord.example || '暂无例句。';
        const targetWord = answer || question;
        if (targetWord && exampleText.includes(targetWord)) {
            exampleText = exampleText.replace(targetWord, `______`);
        }
        exampleEl.innerText = exampleText;
    }

    const progressEl = document.getElementById('progress-indicator');
    if (progressEl) {
        progressEl.innerText = `进度：${currentIndex + 1} / ${currentPlan.length} ${isWeaknessMode ? '（错题训练中）' : ''}`;
    }

    updateNavButtons();
}

function setupFlipEvent() {
    const container = document.getElementById('card-container');
    const flipCardEl = document.getElementById('flip-card');
    if (container && flipCardEl) {
        container.onclick = null;
        container.onclick = function() {
            isFlipped = !isFlipped;
            flipCardEl.classList.toggle('rotate-y-180', isFlipped);
        };
    }
}

// ==========================================
// 3. 导航功能：上一个 / 下一个
// ==========================================
function prevCard() {
    if (currentPlan.length === 0) return;
    
    if (currentIndex === 0) {
        currentIndex = currentPlan.length - 1;
    } else {
        currentIndex--;
    }
    
    const flipCardEl = document.getElementById('flip-card');
    if (flipCardEl && isFlipped) {
        flipCardEl.classList.remove('rotate-y-180');
        isFlipped = false;
    }
    
    renderCard();
}

function nextCard() {
    if (currentPlan.length === 0) return;
    
    if (currentIndex === currentPlan.length - 1) {
        currentIndex = 0;
    } else {
        currentIndex++;
    }
    
    const flipCardEl = document.getElementById('flip-card');
    if (flipCardEl && isFlipped) {
        flipCardEl.classList.remove('rotate-y-180');
        isFlipped = false;
    }
    
    renderCard();
}

function updateNavButtons() {
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const counter = document.getElementById('card-counter');
    
    if (prevBtn) {
        prevBtn.disabled = currentPlan.length === 0;
        prevBtn.style.opacity = currentPlan.length === 0 ? '0.3' : '1';
    }
    if (nextBtn) {
        nextBtn.disabled = currentPlan.length === 0;
        nextBtn.style.opacity = currentPlan.length === 0 ? '0.3' : '1';
    }
    if (counter) {
        counter.innerText = currentPlan.length > 0 ? `${currentIndex + 1} / ${currentPlan.length}` : '0 / 0';
    }
}

// ==========================================
// 4. 标记掌握状态
// ==========================================
function markMastery(isMastered) {
    if (currentPlan.length === 0) return;
    
    const currentWord = currentPlan[currentIndex];
    let wrongList = JSON.parse(localStorage.getItem('vocabulary_wrong_list')) || [];
    const currentWordText = currentWord.word || '';

    if (!isMastered) {
        if (!wrongList.some(item => item.word === currentWordText)) { 
            wrongList.push(currentWord); 
        }
        showToast("📌 已加入待加强训练库");
    } else {
        wrongList = wrongList.filter(item => item.word !== currentWordText);
        showToast("🎉 太棒了，这个词已经熟练掌握！");
    }

    localStorage.setItem('vocabulary_wrong_list', JSON.stringify(wrongList));
    updateWeaknessButton(wrongList.length);
    updateMasteryProgress();
    
    nextCard();
}

function startWeaknessTraining() {
    const wrongList = JSON.parse(localStorage.getItem('vocabulary_wrong_list')) || [];
    if (wrongList.length === 0) {
        showToast("✨ 赞！当前没有待加强的生词！");
        return;
    }
    isWeaknessMode = true;
    currentPlan = [...wrongList].sort(() => 0.5 - Math.random()); 
    currentIndex = 0;
    renderCard();
}

function updateWeaknessButton(count) {
    const btn = document.querySelector('button[onclick="startWeaknessTraining()"]');
    if (btn) btn.innerHTML = `🎯 开启错题专项训练 (<span class="text-amber-600 font-bold">${count}</span>)`;
    
    const countEl = document.getElementById('wrong-count');
    if (countEl) countEl.innerText = count;
}

function showEmptyState() {
    const rubyContainer = document.getElementById('card-word-ruby');
    if (rubyContainer) rubyContainer.innerHTML = `<span class="text-base text-stone-400">暂无生词数据</span>`;
}

// ==========================================
// 5. Toast 通知系统
// ==========================================
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    const bgClass = type === 'success' 
        ? 'bg-stone-800 text-white' 
        : 'bg-red-50 border border-red-200 text-red-800';
    toast.className = `${bgClass} px-4 py-2.5 rounded-xl shadow-lg text-xs font-semibold tracking-wide flex items-center gap-1.5 animate-bounce pointer-events-auto transition-all duration-300 z-50`;
    toast.innerHTML = message;
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('opacity-0', '-translate-y-2');
        setTimeout(() => { toast.remove(); }, 300);
    }, 2500);
}

// ==========================================
// 6. 进度追踪
// ==========================================
function updateMasteryProgress() {
    if (typeof allIdioms === 'undefined' || allIdioms.length === 0) return;
    
    let wrongList = JSON.parse(localStorage.getItem('vocabulary_wrong_list')) || [];
    const totalWords = allIdioms.length;
    const wrongCount = wrongList.length;
    const masteredCount = Math.max(0, totalWords - wrongCount);
    
    const percent = totalWords > 0 ? Math.round((masteredCount / totalWords) * 100) : 0;
    
    const bar = document.getElementById('mastery-progress-bar');
    if (bar) bar.style.width = `${percent}%`;
    
    const txt = document.getElementById('mastery-status');
    if (txt) txt.innerText = `已掌握 ${masteredCount} / ${totalWords} 词 (${percent}%)`;
}

// ==========================================
// 7. 核心 Quiz (小测验) 控制逻辑
// ==========================================
function startQuiz() {
    if (!allIdioms || allIdioms.length < 4) {
        showToast("⚠️ 生词数量不足 4 个，无法生成选择题！", "error");
        return;
    }

    const availableWords = allIdioms.filter(item => !quizHistory.includes(item.word));
    
    if (availableWords.length === 0) {
        quizHistory = [];
        quizRound++;
        showToast(`🔄 第 ${quizRound} 轮完成！开始新一轮测试`, "success");
        const newAvailable = allIdioms.filter(item => !quizHistory.includes(item.word));
        if (newAvailable.length === 0) {
            showToast("⚠️ 没有可用的生词了！", "error");
            return;
        }
        const shuffled = [...newAvailable].sort(() => 0.5 - Math.random());
        quizQuestions = shuffled.slice(0, Math.min(5, shuffled.length));
    } else {
        const shuffled = [...availableWords].sort(() => 0.5 - Math.random());
        quizQuestions = shuffled.slice(0, Math.min(5, shuffled.length));
    }

    quizQuestions.forEach(q => {
        if (!quizHistory.includes(q.word)) {
            quizHistory.push(q.word);
        }
    });

    quizQuestions = quizQuestions.map(q => ({
        ...q,
        qType: Math.floor(Math.random() * 3)
    }));

    quizCurrentIndex = 0;
    quizScore = 0;

    document.getElementById('quiz-question-container').classList.remove('hidden');
    document.getElementById('quiz-result-container').classList.add('hidden');
    document.getElementById('quiz-title-text').innerText = `🎯 缩略语测验 - 第 ${quizRound + 1} 轮`;
    document.getElementById('quiz-modal').classList.remove('hidden');
    renderQuizQuestion();
}

function closeQuiz() {
    document.getElementById('quiz-modal').classList.add('hidden');
}

function renderQuizQuestion() {
    const currentQ = quizQuestions[quizCurrentIndex];
    const { question: currentQuestionText, answer: currentAnswerText } = splitWordItem(currentQ.word);
    
    document.getElementById('quiz-q-num').innerText = `题目 ${quizCurrentIndex + 1} / ${quizQuestions.length}`;
    const percent = (quizCurrentIndex / quizQuestions.length) * 100;
    document.getElementById('quiz-progress-bar').style.width = `${percent}%`;

    const questionWordEl = document.getElementById('quiz-question-word');
    const distractors = allIdioms
        .filter(item => item.word !== currentQ.word)
        .sort(() => 0.5 - Math.random())
        .slice(0, 3);

    const options = [currentQ, ...distractors].sort(() => 0.5 - Math.random());
    const optionsContainer = document.getElementById('quiz-options');

    if (currentQ.qType === 0) {
        questionWordEl.innerHTML = `
            <span class="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-sans font-medium">看原词选对应缩略语</span>
            <div class="text-base sm:text-lg font-bold font-serif text-stone-800 mt-2 px-2 leading-relaxed">${currentQuestionText}</div>
        `;
        
        optionsContainer.innerHTML = options.map(opt => {
            const isCorrect = (opt.word === currentQ.word);
            const { answer: optAnswer } = splitWordItem(opt.word);
            return `
                <button onclick="handleQuizAnswer(this, ${isCorrect})" class="w-full text-left p-3.5 rounded-xl border-2 border-stone-100 hover:border-amber-400 hover:bg-amber-50/50 transition-all font-sans text-stone-700 text-sm leading-relaxed">
                    <span class="font-bold font-serif text-base text-stone-900 mr-1">${optAnswer ? '【' + optAnswer + '】' : ''}</span>${opt.defZh}
                </button>
            `;
        }).join('');

    } else if (currentQ.qType === 1) {
        questionWordEl.innerHTML = `
            <span class="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-sans font-medium block w-max mx-auto mb-2">根据释义选对应词语</span>
            <p class="text-xs sm:text-sm font-medium font-sans px-4 text-stone-700 leading-relaxed text-left">${currentQ.defZh}</p>
        `;
        
        optionsContainer.innerHTML = options.map(opt => {
            const isCorrect = (opt.word === currentQ.word);
            const { question: optQ, answer: optA } = splitWordItem(opt.word);
            return `
                <button onclick="handleQuizAnswer(this, ${isCorrect})" class="w-full text-center p-3 rounded-xl border-2 border-stone-100 hover:border-amber-400 hover:bg-amber-50/50 transition-all font-serif font-bold text-stone-800 text-xs sm:text-sm">
                    ${optA ? optA + '（' + optQ + '）' : optQ}
                </button>
            `;
        }).join('');

    } else if (currentQ.qType === 2) {
        let exampleText = currentQ.example || '暂无例句。';
        const targetWord = currentAnswerText || currentQuestionText;
        if (targetWord && exampleText.includes(targetWord)) {
            exampleText = exampleText.replace(targetWord, ` ______ `);
        }
        
        questionWordEl.innerHTML = `
            <span class="text-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-sans font-medium block w-max mx-auto mb-2">概述填空</span>
            <p class="text-xs sm:text-sm font-normal font-sans px-4 text-stone-700 leading-relaxed text-left">${exampleText}</p>
        `;
        
        optionsContainer.innerHTML = options.map(opt => {
            const isCorrect = (opt.word === currentQ.word);
            const { answer: optA, question: optQ } = splitWordItem(opt.word);
            return `
                <button onclick="handleQuizAnswer(this, ${isCorrect})" class="w-full text-center p-3 rounded-xl border-2 border-stone-100 hover:border-amber-400 hover:bg-amber-50/50 transition-all font-serif font-bold text-stone-800 text-sm sm:text-base">
                    ${optA || optQ}
                </button>
            `;
        }).join('');
    }
}

function handleQuizAnswer(buttonEl, isCorrect) {
    const allButtons = document.getElementById('quiz-options').querySelectorAll('button');
    allButtons.forEach(btn => btn.disabled = true);

    if (isCorrect) {
        quizScore++;
        buttonEl.classList.remove('border-stone-100', 'hover:border-amber-400');
        buttonEl.classList.add('border-green-500', 'bg-green-50/60', 'text-green-800');
    } else {
        buttonEl.classList.remove('border-stone-100', 'hover:border-amber-400');
        buttonEl.classList.add('border-red-500', 'bg-red-50/60', 'text-red-800');
        
        allButtons.forEach(btn => {
            if (btn.getAttribute('onclick').includes('true')) {
                btn.classList.add('border-green-500', 'bg-green-50/40');
            }
        });

        let wrongList = JSON.parse(localStorage.getItem('vocabulary_wrong_list')) || [];
        const currentQ = quizQuestions[quizCurrentIndex];
        if (!wrongList.some(item => item.word === currentQ.word)) {
            wrongList.push(currentQ);
            localStorage.setItem('vocabulary_wrong_list', JSON.stringify(wrongList));
            updateWeaknessButton(wrongList.length);
            updateMasteryProgress();
        }
    }

    setTimeout(() => {
        quizCurrentIndex++;
        if (quizCurrentIndex < quizQuestions.length) {
            renderQuizQuestion();
        } else {
            showQuizResults();
        }
    }, 1200);
}

function showQuizResults() {
    document.getElementById('quiz-progress-bar').style.width = `100%`;
    document.getElementById('quiz-question-container').classList.add('hidden');
    document.getElementById('quiz-result-container').classList.remove('hidden');

    document.getElementById('quiz-score').innerText = `${quizScore} / ${quizQuestions.length}`;
    
    let evaluation = "再接再厉，多刷刷闪卡吧！";
    if (quizScore === quizQuestions.length) {
        evaluation = "👑 太厉害了！满分通关！";
    } else if (quizScore >= 4) {
        evaluation = "🌟 优秀！底子非常扎实！";
    } else if (quizScore >= 3) {
        evaluation = "👍 及格啦，答错的词已经自动帮你放入错题库啰！";
    }
    
    const remaining = allIdioms.filter(item => !quizHistory.includes(item.word)).length;
    evaluation += `<br><span class="text-[10px] text-stone-400">剩余 ${remaining} 个生词待测试</span>`;
    
    document.getElementById('quiz-eval').innerHTML = evaluation;
}

window.onload = function() {
    initApp();
};
