/**
 * 🔐 时光小屋 · 每日恋爱通关门禁 (Daily Romance Gatekeeper)
 * 规则：
 * 1. 每天首次进入网站必须答对一道专属默契题；
 * 2. 答错当天全天无法进入（直到次日 00:00 自动刷新重置）；
 * 3. 拥有特权密码 "admin" 可以随时解锁并放行进入。
 */

(function() {
    'use strict';

    // 专属特权通关密码（不区分大小写，自动去前后空格）
    const ADMIN_PASSWORD = 'admin';

    // 甜蜜情侣专属高难度深度默契题库 (涵盖真实生日、精确日期、手写回忆、发圈细节与约定)
    const GATE_QUESTIONS = [
        {
            q: "处女座笨笨牛 · 哲哲的准确公历出生日期是哪一天？",
            options: ["2009年 9月20日", "2009年 9月21日", "2009年 9月22日", "2009年 9月23日"],
            ans: 2,
            tip: "秋分时节，细致而坚定的处女座小牛诞生啦～"
        },
        {
            q: "白羊座小兔 · 珊珊宝贝的准确公历出生日期是哪一天？",
            options: ["2011年 4月15日", "2011年 4月16日", "2011年 4月17日", "2011年 4月18日"],
            ans: 2,
            tip: "人间最美四月天，热烈可爱的白羊座小兔降临～"
        },
        {
            q: "哲哲与珊珊正式相识相爱、定格浪漫的恋爱纪念日是哪一天？",
            options: ["2024年 5月1日", "2024年 5月2日", "2024年 5月3日", "2024年 5月20日"],
            ans: 2,
            tip: "立夏之初，心动定格的永恒纪念日～"
        },
        {
            q: "时光回忆录中，记录‘装屁屁帮臭臭手写暑假作业’的感人故事具体是在哪一天？",
            options: ["8月14日", "8月15日", "8月16日", "8月17日"],
            ans: 2,
            tip: "那一本本密密麻麻的手写字迹，是最无价的偏爱！"
        },
        {
            q: "哲哲手腕上常戴着的、属于珊珊专属标记的发圈是什么颜色？",
            options: ["浅樱花粉色", "浅天蓝色", "梦幻淡紫色", "浅鹅黄色"],
            ans: 1,
            tip: "手腕上的那一抹浅蓝，是全天下最安心的归属感！"
        },
        {
            q: "我们约定的重逢、重新深情牵手纪念日是几月几日？",
            options: ["1月16日", "1月17日", "1月18日", "1月19日"],
            ans: 2,
            tip: "无论绕了多远，依然坚定奔向对方的心～"
        },
        {
            q: "在哲哲与珊珊的高甜私密世界里，哲哲是默默守护的‘笨笨牛’，而珊珊宝贝专属的代号是？",
            options: ["调皮金丝雀 🐤", "白羊座小兔 🐰", "傲娇波斯猫 🐱", "温柔小海獭 🦦"],
            ans: 1,
            tip: "处女座笨笨牛 🐂 ✕ 白羊座小兔 🐰，是全宇宙最宠溺的绝配组合～"
        },
        {
            q: "哲哲与珊珊在纪念宇宙里的属相与星座配对是？",
            options: ["狮子座小牛 🐂 ✕ 金牛座小兔 🐰", "天秤座小牛 🐂 ✕ 双鱼座小兔 🐰", "处女座小兔 🐰 ✕ 白羊座小牛 🐂", "处女座小牛 🐂 ✕ 白羊座小兔 🐰"],
            ans: 3,
            tip: "属牛的坚韧与属兔的灵动，注定一生的绝配！"
        },
        {
            q: "回忆录长廊胶卷 06‘专属默契’中，两人搞怪心有灵犀的面部特征是？",
            options: ["猫咪胡须与发卡", "兔兔牙与黑框眼镜", "大胡子与飞行墨镜", "小鹿角与红鼻头"],
            ans: 1,
            tip: "露出小兔牙的可爱自拍，只属于彼此的默契～"
        },
        {
            q: "回忆录长廊胶卷 08‘合拍搭档’里，两人用了什么同款搞怪滤镜？",
            options: ["胡子墨镜搞怪滤镜", "大嘴搞怪滤镜", "流泪委屈滤镜", "猪猪鼻子滤镜"],
            ans: 0,
            tip: "风雨同舟，最默契的无敌搭档！"
        },
        {
            q: "时光回忆录 3D 胶卷长廊的第 01 张胶片，右下角金色徽章上的字是？",
            options: ["01 · 初次相遇", "01 · 怦然心动", "01 · 掌心温度", "01 · 专属标记"],
            ans: 3,
            tip: "手腕上的浅蓝色发圈，是第一号专属标记！"
        },
        {
            q: "时光回忆录长廊中，记录十指紧扣拍立得的第 02 张胶卷徽章名称是？",
            options: ["02 · 专属标记", "02 · 掌心温度", "02 · 漫步四季", "02 · 屏幕温度"],
            ans: 1,
            tip: "相机的显影纸慢慢清晰，掌心的温度永不消散～"
        },
        {
            q: "回忆录长廊第 10 篇章压轴定格的深情画面是什么？",
            options: ["密密麻麻的通话记录 · 舍不得挂断", "走廊微风中手牵手的背影", "十指紧扣的彩色拍立得", "深夜视频看着对方打哈欠"],
            ans: 0,
            tip: "一通又一通连绵不断的通话，跳动着舍不得挂断的牵挂～"
        },
        {
            q: "在手写作业的独家高甜回忆里，珊珊对外的‘秘密可爱代号’是？",
            options: ["大白兔", "装屁屁", "小香猪", "皮皮虾"],
            ans: 1,
            tip: "装屁屁给臭臭最无价、最温暖的独家偏爱！"
        },
        {
            q: "恋爱心愿清单中，排在 No.01 顺位的最渴望实现的愿望是？",
            options: ["亲手给对方做一顿饭", "一起去坐一次摩天轮", "一起去看一次海", "拍一组奇奇怪怪的合照"],
            ans: 2,
            tip: "牵着你的手，吹海风、听浪花的声音～"
        },
        {
            q: "恋爱心愿清单中，紧随其后排在 No.02 顺位的浪漫心愿是？",
            options: ["一起看一场跨年烟花", "一起穿情侣装出门", "一起去游乐园狂欢", "一起去坐一次摩天轮"],
            ans: 3,
            tip: "在摩天轮升到最高点的时候偷偷亲一口～"
        },
        {
            q: "我们时光小窝顶部实时联动的气象城市是浙江省哪座县城？",
            options: ["苍南县", "平阳县", "乐清市", "瑞安市"],
            ans: 1,
            tip: "承载着彼此思念与挂牵的温州平阳～"
        },
        {
            q: "在时光小屋 3D 小窝里，点击小猫咪时的快捷交互按钮文案是？",
            options: ["逗逗小猫咪 (伸懒腰/呼噜)", "抱抱小猫咪 (喂小鱼干)", "摸摸小猫咪 (梳毛毛)", "看看小猫咪 (抓蝴蝶)"],
            ans: 0,
            tip: "橘色小猫咪发出呼噜呼噜的惬意声～"
        },
        {
            q: "在 3D 小窝‘牵手去哪’的 4 个位置切换中，不包含以下哪一项？",
            options: ["钻进被窝", "坐沙发看大片", "地毯逗猫", "屋顶数星星"],
            ans: 3,
            tip: "小窝只有钻被窝、沙发、地毯逗猫和飘窗看风景哦～"
        },
        {
            q: "3D 小窝快捷药丸中，哲哲与珊珊长按可触发的同频特效功能叫？",
            options: ["双人浪漫共鸣", "心跳同频共振", "心动感应光波", "灵魂伴侣连线"],
            ans: 1,
            tip: "让两个人的心跳节拍在此刻完全同步！"
        },
        {
            q: "在小窝的留言便签墙上，哲哲在 2026 年 1 月 18 日重新牵手时写下的第一句话是？",
            options: [
                "珊珊宝贝，我们和好啦！希望以后有矛盾我们要及时沟通，永远不分开好不好！mua~~",
                "遇见你是所有故事的开始，今天也是超级想你的一天！",
                "白珊珊小仙女，祝你今天开开心心，好好吃饭！",
                "牵着你的手，走过四季，一直走到白头偕老！"
            ],
            ans: 0,
            tip: "“珊珊宝贝，我们和好啦！希望以后有矛盾我们要及时沟通，永远不分开好不好！mua~~” 永远不分开的约定～"
        },
        {
            q: "在两人的恋爱心愿单里，排在【看海】与【摩天轮】之后的 No.03 心动心愿是？",
            options: ["一起去自驾旅行", "一起吃一顿烛光晚餐", "一起养一只可爱的小狗", "一起去看跨年演唱会"],
            ans: 1,
            tip: "安静柔和的烛光里，深情看着心爱的宝贝～"
        },
        {
            q: "在 3D 小窝的草莓圣代与冰淇淋互动中，哲哲每次给珊珊投喂甜点时最常宠溺说的话是？",
            options: [
                "吃饱了才有力气想我哦！",
                "吃完记得要漱口，小懒虫～",
                "第一口给珊珊，因为珊珊比草莓还要甜！",
                "喜欢吃就全吃光，臭臭管够！"
            ],
            ans: 2,
            tip: "“第一口给珊珊，因为珊珊比草莓还要甜！”——甜到心坎里！"
        },
        {
            q: "每次打开时光小屋，顶部最先飘出来的欢迎气泡完整原文是？",
            options: [
                "白珊珊小仙女，欢迎回到属于我们的浪漫小窝！❤️",
                "亲爱的珊珊，哲哲超级想你，欢迎回家！mua~",
                "珊珊宝贝，欢迎来到属于我们的时光小屋！mua~ ❤️",
                "欢迎来到白珊珊与陈祖哲的专属时光小屋！"
            ],
            ans: 2,
            tip: "熟悉的开场白，每一个字都写着满满的宠溺～"
        },
        {
            q: "3D 小窝快捷交互中，用来投喂美味甜点的家具是？",
            options: ["微波炉 ♨️ (热牛奶)", "小冰箱 🧊 (投喂甜点)", "烤箱 🍞 (烤面包)", "糖果盒 🍬 (拿巧克力)"],
            ans: 1,
            tip: "拉开冰冰凉凉的小冰箱，给宝贝投喂最爱吃的甜点～"
        }
    ];

    // 本地存储安全读写
    function safeStorageGet(key) {
        try {
            return window.localStorage.getItem(key) || null;
        } catch(e) {
            return null;
        }
    }

    function safeStorageSet(key, val) {
        try {
            window.localStorage.setItem(key, String(val));
        } catch(e) {}
    }

    function safeStorageRemove(key) {
        try {
            window.localStorage.removeItem(key);
        } catch(e) {}
    }

    // 获取格式化今日日期字符串 YYYY-MM-DD
    function getTodayDateStr() {
        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, '0');
        const d = String(now.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }

    // 计算今日题目（按公历年天数自然轮巡，25天一个周期每日全新，全天固定同一题）
    function getTodayQuestion(dateStr) {
        const parts = dateStr.split('-');
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        const d = parseInt(parts[2], 10);
        const startOfYear = new Date(y, 0, 1);
        const currentDate = new Date(y, m, d);
        const diffDays = Math.floor((currentDate - startOfYear) / (24 * 3600 * 1000));
        const index = Math.abs(diffDays) % GATE_QUESTIONS.length;
        return {
            index: index + 1,
            item: GATE_QUESTIONS[index]
        };
    }

    // 验证特权密码
    function checkAdminPassword(input) {
        if (!input) return false;
        return input.trim().toLowerCase() === ADMIN_PASSWORD;
    }

    // 庆祝通关小心心飘落粒子
    function triggerGateHeartConfetti() {
        try {
            const count = 30;
            for (let i = 0; i < count; i++) {
                const heart = document.createElement('div');
                heart.className = 'gate-flying-heart';
                heart.innerHTML = ['❤️', '💖', '✨', '🌸', '🥰', '💕'][Math.floor(Math.random() * 6)];
                heart.style.left = (Math.random() * 100) + 'vw';
                heart.style.top = '-20px';
                heart.style.fontSize = (Math.random() * 20 + 16) + 'px';
                heart.style.animationDuration = (Math.random() * 1.5 + 1.2) + 's';
                heart.style.animationDelay = (Math.random() * 0.3) + 's';
                document.body.appendChild(heart);
                setTimeout(() => heart.remove(), 2500);
            }
        } catch(e) {}
    }

    // 门禁核心逻辑初始化
    function initDailyGatekeeper() {
        const overlay = document.getElementById('daily-gatekeeper-overlay');
        if (!overlay) return;

        const today = getTodayDateStr();
        const passDate = safeStorageGet('love_gate_pass_date');
        const failDate = safeStorageGet('love_gate_fail_date');

        // 视图节点
        const quizView = document.getElementById('gate-quiz-view');
        const lockedView = document.getElementById('gate-locked-view');
        const successView = document.getElementById('gate-success-view');
        const pwdDrawer = document.getElementById('gate-pwd-drawer');

        // 按钮及输入框
        const qDateEl = document.getElementById('gate-q-date');
        const qTitleEl = document.getElementById('gate-q-title');
        const optionsListEl = document.getElementById('gate-options-list');
        const submitBtn = document.getElementById('gate-submit-btn');

        const showPwdBtn = document.getElementById('gate-show-pwd-btn');
        const drawerPwdInput = document.getElementById('gate-drawer-pwd-input');
        const drawerPwdBtn = document.getElementById('gate-drawer-pwd-btn');
        const drawerCancelBtn = document.getElementById('gate-drawer-cancel-btn');
        const drawerErrorMsg = document.getElementById('gate-drawer-error-msg');

        const unlockPwdInput = document.getElementById('gate-unlock-pwd-input');
        const unlockPwdBtn = document.getElementById('gate-unlock-pwd-btn');
        const unlockErrorMsg = document.getElementById('gate-pwd-error-msg');

        // 放行解锁通用方法
        function grantAccess(isPasswordUnlock = false, customTitle = null, customDesc = null) {
            safeStorageSet('love_gate_pass_date', today);
            safeStorageRemove('love_gate_fail_date');

            if (quizView) quizView.style.display = 'none';
            if (lockedView) lockedView.style.display = 'none';
            if (pwdDrawer) pwdDrawer.style.display = 'none';
            if (successView) {
                successView.style.display = 'block';
                const successTitle = successView.querySelector('.gate-success-title');
                const successDesc = successView.querySelector('.gate-success-desc');
                if (customTitle && successTitle) {
                    successTitle.textContent = customTitle;
                    if (customDesc && successDesc) successDesc.textContent = customDesc;
                } else if (isPasswordUnlock) {
                    if (successTitle) successTitle.textContent = '✨ 专属密令正确！特权通行';
                    if (successDesc) successDesc.textContent = '欢迎回家～正在为你开启时光小屋！';
                } else {
                    if (successTitle) successTitle.textContent = '🎉 默契满分！恭喜答对啦～';
                    if (successDesc) successDesc.textContent = '欢迎回家，珊珊宝贝！mua~ ❤️';
                }
            }

            triggerGateHeartConfetti();
            document.documentElement.classList.remove('gate-locked');
            document.body.classList.remove('modal-open');

            setTimeout(() => {
                overlay.classList.add('gate-fade-out');
                setTimeout(() => {
                    overlay.style.display = 'none';
                    overlay.remove();
                }, 600);
            }, 1200);
        }

        // 1. 如果今天已经通关过，直接退出，不打扰正常浏览
        if (passDate === today) {
            document.documentElement.classList.remove('gate-locked');
            overlay.style.display = 'none';
            overlay.remove();
            return;
        }

        // 异步检查云端：哲哲是否已在后台一键为珊珊放行
        fetch('/api/config')
            .then(res => res.json())
            .then(cfg => {
                if (cfg && cfg.daily_gate_release_date === today) {
                    grantAccess(true, '✨ 哲哲已在后台为你放行！', '欢迎回家，珊珊宝贝！正在为你开启时光小屋～❤️');
                }
            })
            .catch(() => {});

        // 页面加锁
        document.documentElement.classList.add('gate-locked');
        document.body.classList.add('modal-open');
        overlay.style.display = 'flex';

        // 2. 如果今天已经答错过并且被锁定整天
        if (failDate === today) {
            if (quizView) quizView.style.display = 'none';
            if (lockedView) lockedView.style.display = 'block';
            if (pwdDrawer) pwdDrawer.style.display = 'none';
            if (successView) successView.style.display = 'none';
            setupLockedViewEvents();
            return;
        }

        // 3. 今日尚未答题，进入答题流程
        if (quizView) quizView.style.display = 'block';
        if (lockedView) lockedView.style.display = 'none';
        if (pwdDrawer) pwdDrawer.style.display = 'none';
        if (successView) successView.style.display = 'none';

        const { item } = getTodayQuestion(today);
        if (qDateEl) {
            const parts = today.split('-');
            qDateEl.innerHTML = `<i class="fas fa-calendar-heart"></i> ${parts[0]}年${parts[1]}月${parts[2]}日 · 今日专属恋爱考验`;
        }
        if (qTitleEl) {
            qTitleEl.textContent = item.q;
        }

        let selectedOptionIdx = -1;

        if (optionsListEl) {
            optionsListEl.innerHTML = '';
            item.options.forEach((optText, idx) => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'gate-option-btn';
                btn.innerHTML = `<span class="opt-prefix">${['A', 'B', 'C', 'D'][idx]}</span><span class="opt-text">${optText}</span>`;
                btn.addEventListener('click', () => {
                    optionsListEl.querySelectorAll('.gate-option-btn').forEach(b => b.classList.remove('selected'));
                    btn.classList.add('selected');
                    selectedOptionIdx = idx;
                    if (submitBtn) {
                        submitBtn.disabled = false;
                        submitBtn.classList.add('active');
                    }
                });
                optionsListEl.appendChild(btn);
            });
        }

        // 确认提交答案按钮
        if (submitBtn) {
            submitBtn.addEventListener('click', () => {
                if (selectedOptionIdx === -1) return;

                if (selectedOptionIdx === item.ans) {
                    // 答对！
                    grantAccess(false);
                } else {
                    // 答错！锁定全天
                    safeStorageSet('love_gate_fail_date', today);
                    if (quizView) {
                        quizView.classList.add('shake-anim');
                        setTimeout(() => {
                            quizView.style.display = 'none';
                            if (lockedView) lockedView.style.display = 'block';
                            setupLockedViewEvents();
                        }, 500);
                    }
                }
            });
        }

        // "拥有专属密令？直接通关"
        if (showPwdBtn && pwdDrawer) {
            showPwdBtn.addEventListener('click', () => {
                pwdDrawer.style.display = 'block';
                if (drawerPwdInput) {
                    drawerPwdInput.value = '';
                    drawerPwdInput.focus();
                }
                if (drawerErrorMsg) drawerErrorMsg.textContent = '';
            });
        }

        if (drawerCancelBtn && pwdDrawer) {
            drawerCancelBtn.addEventListener('click', () => {
                pwdDrawer.style.display = 'none';
                if (drawerErrorMsg) drawerErrorMsg.textContent = '';
            });
        }

        if (drawerPwdBtn && drawerPwdInput) {
            const handleDrawerVerify = () => {
                if (checkAdminPassword(drawerPwdInput.value)) {
                    grantAccess(true);
                } else {
                    if (drawerErrorMsg) {
                        drawerErrorMsg.textContent = '❌ 密令不正确哦，请核对后再试～';
                    }
                    drawerPwdInput.classList.add('shake-anim');
                    setTimeout(() => drawerPwdInput.classList.remove('shake-anim'), 500);
                }
            };
            drawerPwdBtn.addEventListener('click', handleDrawerVerify);
            drawerPwdInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') handleDrawerVerify();
            });
        }

        // 设置被锁定界面的事件监听
        function setupLockedViewEvents() {
            if (unlockPwdBtn && unlockPwdInput) {
                const handleUnlock = () => {
                    if (checkAdminPassword(unlockPwdInput.value)) {
                        grantAccess(true);
                    } else {
                        if (unlockErrorMsg) {
                            unlockErrorMsg.textContent = '❌ 解锁密令错误，请向哲哲索取哦～';
                        }
                        unlockPwdInput.classList.add('shake-anim');
                        setTimeout(() => unlockPwdInput.classList.remove('shake-anim'), 500);
                    }
                };
                unlockPwdBtn.addEventListener('click', handleUnlock);
                unlockPwdInput.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') handleUnlock();
                });
            }

            // 检查哲哲是否已从后台放行
            const checkReleaseBtn = document.getElementById('gate-check-release-btn');
            if (checkReleaseBtn) {
                checkReleaseBtn.addEventListener('click', () => {
                    const originalHtml = checkReleaseBtn.innerHTML;
                    checkReleaseBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 正在连线哲哲的小屋后台...';
                    checkReleaseBtn.disabled = true;

                    fetch('/api/config')
                        .then(res => res.json())
                        .then(cfg => {
                            checkReleaseBtn.disabled = false;
                            checkReleaseBtn.innerHTML = originalHtml;
                            if (cfg && cfg.daily_gate_release_date === today) {
                                grantAccess(true, '✨ 哲哲已在后台为你放行！', '欢迎回家，珊珊宝贝！正在为你开启时光小屋～❤️');
                            } else {
                                if (unlockErrorMsg) {
                                    unlockErrorMsg.textContent = '🥺 哲哲还没在后台放行哦，快发微信找臭臭放行吧～❤️';
                                }
                            }
                        })
                        .catch(() => {
                            checkReleaseBtn.disabled = false;
                            checkReleaseBtn.innerHTML = originalHtml;
                            if (unlockErrorMsg) {
                                unlockErrorMsg.textContent = '网络连接稍有波动，请稍后再试或输入密令进入～';
                            }
                        });
                });
            }
        }
    }

    // 立即执行初始化，避免等待外部大型 CDN 脚本延迟阻断
    if (document.getElementById('daily-gatekeeper-overlay')) {
        initDailyGatekeeper();
    } else if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initDailyGatekeeper);
    } else {
        initDailyGatekeeper();
    }
})();
