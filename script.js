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

    // 提取题目与答案
    const { question, answer } = splitWordItem(currentWord.word);

    // ---------------- 正面渲染（词组精准对齐，解决拼音串位） ----------------
    const rubyContainer = document.getElementById('card-word-ruby');
    if (rubyContainer) {
        const rawPinyin = (currentWord.pinyin || "").split("=")[0].trim();
        // 提取纯拼音列表（过滤掉任何多余空格）
        const pinyinTokens = rawPinyin ? rawPinyin.split(/\s+/).filter(Boolean) : [];
        
        // 统计纯汉字字符数量（不计空格）
        const pureChineseChars = question.replace(/\s+/g, '');
        
        // 动态根据字数决定字号与拼音大小
        let charSize = "text-3xl sm:text-4xl";
        let pySize = "text-xs sm:text-sm";
        if (pureChineseChars.length > 14) {
            charSize = "text-lg sm:text-xl";
            pySize = "text-[10px] sm:text-xs";
        } else if (pureChineseChars.length > 8) {
            charSize = "text-xl sm:text-2xl";
            pySize = "text-xs";
        }

        // 将原句按空格拆分成各个词组（如：["汉族", "马来族", "印度族", "原住民族"]）
        const phraseList = question.trim().split(/\s+/).filter(Boolean);
        let tokenIndex = 0;
        let rubyHtml = `<div class="flex flex-wrap justify-center items-center gap-x-3 gap-y-4 max-w-full px-2">`;

        phraseList.forEach(phrase => {
            rubyHtml += `<div class="inline-flex items-end justify-center flex-nowrap mx-0.5">`;
            for (let i = 0; i < phrase.length; i++) {
                const char = phrase[i];
                // 获取当前汉字严格对应的拼音
                const py = pinyinTokens[tokenIndex] || "";
                tokenIndex++;

                rubyHtml += `
                    <ruby class="inline-flex flex-col items-center mx-0.5">
                        <rt class="${pySize} text-stone-400 font-sans font-medium mb-1 select-none leading-none">${py}</rt>
                        <span class="font-serif font-bold ${charSize} text-stone-800 leading-tight">${char}</span>
                    </ruby>
                `;
            }
            rubyHtml += `</div>`;
        });

        rubyHtml += `</div>`;
        rubyHtml += `
            <div class="w-full text-center mt-4 text-[11px] text-stone-400 font-sans tracking-normal">
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
        const cleanQuestion = question.replace(/\s+/g, '');
        const targetWord = answer || cleanQuestion;
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
