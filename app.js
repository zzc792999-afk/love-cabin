(function() {
    'use strict';

    // 🛡️ 安全本地存储代理：防止在 file:// 协议或隐私模式下，浏览器限制 localStorage 访问导致脚本崩溃卡死
    let isStorageAvailable = true;
    let memStorage = {};
    try {
        const testKey = '__test_storage__';
        window.localStorage.setItem(testKey, testKey);
        window.localStorage.removeItem(testKey);
    } catch(e) {
        isStorageAvailable = false;
        console.warn("[Antigravity] 检测到浏览器 localStorage 被禁用或受限，已自动开启内存备用存储。");
    }

    const localStorage = {
        getItem: function(key) {
            if (isStorageAvailable) {
                try { return window.localStorage.getItem(key); } catch(e) {}
            }
            return memStorage[key] || null;
        },
        setItem: function(key, val) {
            if (isStorageAvailable) {
                try { window.localStorage.setItem(key, val); return; } catch(e) {}
            }
            memStorage[key] = String(val);
        },
        removeItem: function(key) {
            if (isStorageAvailable) {
                try { window.localStorage.removeItem(key); return; } catch(e) {}
            }
            delete memStorage[key];
        }
    };

    // 🛡️ 安全本地存储与会话代理，解决双击本地打开 file:// 时报错阻断脚本执行的 Bug
    const safeGet = (key, defaultVal = '') => {
        return localStorage.getItem(key) || defaultVal;
    };
    const safeSet = (key, val) => {
        localStorage.setItem(key, val);
    };

    let isSessionStorageAvailable = true;
    let memSessionStorage = {};
    try {
        const testKey = '__test_session__';
        window.sessionStorage.setItem(testKey, testKey);
        window.sessionStorage.removeItem(testKey);
    } catch(e) {
        isSessionStorageAvailable = false;
    }

    const sessionStorageProxy = {
        getItem: function(key) {
            if (isSessionStorageAvailable) {
                try { return window.sessionStorage.getItem(key); } catch(e) {}
            }
            return memSessionStorage[key] || null;
        },
        setItem: function(key, val) {
            if (isSessionStorageAvailable) {
                try { window.sessionStorage.setItem(key, val); return; } catch(e) {}
            }
            memSessionStorage[key] = String(val);
        }
    };

    const safeGetSession = (key, defaultVal = '') => {
        return sessionStorageProxy.getItem(key) || defaultVal;
    };
    const safeSetSession = (key, val) => {
        sessionStorageProxy.setItem(key, val);
    };


    /* ================================================================
     *  常量与数据定义
     * ================================================================ */
    const PRESET_WISHES = [
        { id: 1, title: '一起去看一次海', category: 'travel' },
        { id: 2, title: '一起去坐一次摩天轮', category: 'special' },
        { id: 3, title: '一起吃一顿烛光晚餐', category: 'food' },
        { id: 4, title: '亲手给对方做一顿饭', category: 'food' },
        { id: 5, title: '一起看一场跨年烟花', category: 'special' },
        { id: 6, title: '一起去游乐园狂欢一天', category: 'travel' },
        { id: 7, title: '拍一组奇奇怪怪的情侣搞怪合照', category: 'daily' },
        { id: 8, title: '一起穿一整天情侣装出门', category: 'daily' },
        { id: 9, title: '安安静静陪对方过一次生日', category: 'special' },
        { id: 10, title: '带对方去看看自己长大的地方', category: 'travel' },
        { id: 11, title: '共同养育一只属于我们的小宠物', category: 'daily' },
        { id: 12, title: '手牵手看一次日出和日落', category: 'travel' },
        { id: 13, title: '制作一本我们俩的纸质回忆相册', category: 'special' },
        { id: 14, title: '一起去图书馆或自习室安静待一天', category: 'daily' },
        { id: 15, title: '在对方生病时温柔细致地照顾她/他', category: 'daily' },
        { id: 16, title: '一起为家里挑选布置一件软装家具', category: 'daily' },
        { id: 17, title: '做一次精美的手工陶艺或手工DIY', category: 'daily' },
        { id: 18, title: '给对方写一封长长的、贴着邮票的亲笔信', category: 'special' },
        { id: 19, title: '一起喝到微醺，靠在一起聊通宵的私密话', category: 'daily' },
        { id: 20, title: '携手通关一款好玩的合作游戏', category: 'daily' },
        { id: 21, title: '一起去现场看一次偶像的音乐节/演唱会', category: 'travel' },
        { id: 22, title: '手拉手散步聊天，直到深夜静悄悄的街道', category: 'daily' },
        { id: 23, title: '约定每一个立春都在彼此身边度过', category: 'special' },
        { id: 24, title: '把我们所有的甜蜜瞬间都用网页记录下来', category: 'special' }
    ];

    let PHOTO_LIST = [
        { src: 'images/1.jpg', caption: '我们的甜蜜约定 ❤️' },
        { src: 'images/2.jpg', caption: '两颗心贴得更近 💞' },
        { src: 'images/IMG_20260206_124425.png', caption: '美好的一天 🌸' },
        { src: 'images/IMG_20260206_124443.png', caption: '眼里全都是你 🌟' },
        { src: 'images/IMG_20260206_124500.png', caption: '温柔流淌的时光 ⏳' },
        { src: 'images/IMG_20260206_124528.png', caption: '爱意溢出屏幕 💝' },
        { src: 'images/IMG_20260206_124546.png', caption: '想陪你走过四季 🌱' },
        { src: 'images/mmexport1770353248593.jpg', caption: '定格在这一刻 📸' }
    ];

    // 甜蜜对话剧本库
    const CHAT_SCRIPTS = {
        miss: {
            user: "我想你啦，你在干嘛呢？❤️",
            reply: "我也超级想你！正抱着手机看着你的照片傻笑呢，心跳已经120啦，你在干嘛呀宝贝？🥰"
        },
        hug: {
            user: "伸出双手，想要祖哲抱抱我 🫂",
            reply: "（把你紧紧搂在怀里转圈圈）抱住了就不松开啦！珊珊宝贝最软最香了，亲一口，mua~ 😘"
        },
        coax: {
            user: "今天有点累，心情不太好... 🥺",
            reply: "摸摸珊珊小脑袋！不开心的事情都交给我来消灭。等下带你去吃超级好吃的大餐，你永远是我的第一顺位宝贝！👑"
        },
        secret: {
            user: "悄悄告诉你一个恋爱小秘密 🔒",
            reply: "珊珊，其实遇见你是我最幸运的事。虽然我们偶尔会斗嘴，但我知道我们都离不开对方。以后的路，我们要一起手牵手慢慢走下去哦。❤️"
        }
    };

    // ==========================================
    // 📢 祖哲的手机/微信推送通知配置 (部署后可在后台通知你)
    // ==========================================
    // 如果你想在珊珊给你留言时，手机立刻收到微信或弹窗推送，请在此填写你的 KEY
    // 支持类型：'serverchan' (Server酱微信推送) | 'bark' (iOS Bark 弹窗) | 'pushdeer' (全平台) | 'none'
    const PUSH_CONFIG = {
        type: 'none', // 改为 'serverchan' 或 'bark' 或 'pushdeer' 开启推送
        key: ''       // 填入你的推送 KEY / SendKey (如: SCTxxxxxx)
    };

    let apiEndpoint = null; // 检测到的后端留言 API 路径

    // 动态检测后端服务接口是否可用
    async function detectApiEndpoint() {
        // 尝试检测本地 Node 接口
        try {
            const resNode = await fetch('/api/messages', { method: 'GET' });
            if (resNode.ok) {
                apiEndpoint = '/api/messages';
                console.log('检测到本地 Node.js 后端留言 API!');
                return;
            }
        } catch(e) {}

        // 尝试检测 PHP 接口
        try {
            const resPhp = await fetch('other/api.php', { method: 'GET' });
            if (resPhp.ok) {
                apiEndpoint = 'other/api.php';
                console.log('检测到 PHP 后端留言 API!');
                return;
            }
        } catch(e) {}
    }

    // 微信与手机弹窗通知推送 Webhook
    async function triggerPushNotification(messageText, author) {
        if (!PUSH_CONFIG || PUSH_CONFIG.type === 'none' || !PUSH_CONFIG.key) return;

        const title = encodeURIComponent(`💌 小屋收到 ${author} 的留言啦！`);
        const body = encodeURIComponent(`${author} 留言说：\n“${messageText}”\n快打开时光小屋查看吧！`);
        let url = '';

        if (PUSH_CONFIG.type === 'serverchan') {
            url = `https://sctapi.ftqq.com/${PUSH_CONFIG.key}.send?title=${title}&desp=${body}`;
        } else if (PUSH_CONFIG.type === 'bark') {
            url = `https://api.day.app/${PUSH_CONFIG.key}/${title}/${body}?sound=love&icon=https://raw.githubusercontent.com/tanzhuo/heart/main/love.png`;
        } else if (PUSH_CONFIG.type === 'pushdeer') {
            url = `https://api2.pushdeer.com/message/push?pushkey=${PUSH_CONFIG.key}&text=${title}&desp=${body}`;
        }

        try {
            fetch(url, { mode: 'no-cors' });
            console.log("已异步发送留言推送通知。");
        } catch(e) {
            console.error("推送服务出错:", e);
        }
    }

    // 兼容 iOS/Safari 的安全日期转换方法，避免 Invalid Date 或 NaN 报错
    function parseSafeDate(str) {
        if (!str) return new Date();
        if (str instanceof Date) return str;
        if (typeof str !== 'string') return new Date(str);
        const cleaned = str.trim().replace(/-/g, '/').replace('T', ' ');
        return new Date(cleaned);
    }

    // 全局状态
    let state = {
        activeTab: 'home',
        meetDate: parseSafeDate(safeGet('config_meet_date', '2024-05-03') + 'T00:00:00'),
        reunionDate: parseSafeDate(safeGet('config_reunion_date', '2026-01-18') + 'T00:00:00'),
        anniversaryDate: parseSafeDate(safeGet('config_anniversary_date', '2026-05-03') + 'T00:00:00'),
        reunionAnniversaryDate: parseSafeDate(safeGet('config_reunion_anniversary_date', '2027-01-18') + 'T00:00:00'),
        missCount: 0,
        missLastDate: null,
        specialMessagesShown: [],
        treePoints: 0,
        wishlist: [],
        stickyNotes: [],
        musicPlaying: false,
        theme: 'light'
    };

    // 🔄 异步从云数据库拉取最新全局配置并动态渲染
    async function syncGlobalConfig() {
        try {
            const res = await fetch('/api/config');
            if (!res.ok) throw new Error('Fetch config failed');
            const cfg = await res.json();
            
            // 全局云配置键名，当成功获取到云响应时，未出现在云端的结果直接清理/初始化本地缓存，云端为绝对唯一数据源
            const CONFIG_KEYS = [
                'config_meet_date', 'config_reunion_date', 'config_countdown_target',
                'config_countdown_title', 'config_custom_announcement', 'gashapon_extra_spins',
                'gashapon_infinite_spins', 'gashapon_used_keys', 'gashapon_prizes',
                'gashapon_inventory', 'tree_points', 'treePoints', 'config_anniversary_password',
                'chat_reply_miss', 'chat_reply_hug', 'chat_reply_coax', 'config_bg_music_url',
                'config_love_letter', 'config_photo_list', 'config_he_doing_list',
                'quarrel_mode', 'quarrel_text'
            ];

            CONFIG_KEYS.forEach(key => {
                if (cfg[key] !== undefined) {
                    const val = typeof cfg[key] === 'object' ? JSON.stringify(cfg[key]) : String(cfg[key]);
                    safeSet(key, val);
                } else {
                    // 云端无数据，直接移除或重置，防止 localStorage 缓存过期残留不同步
                    try { localStorage.removeItem(key); } catch(e) {}
                }
            });

            // 实时同步爱意树数值到内存与本地
            if (cfg.tree_points !== undefined) {
                state.treePoints = parseInt(cfg.tree_points) || 15;
                safeSet('treePoints', String(state.treePoints));
                safeSet('tree_points', String(state.treePoints));
                updateTreeDashboard();
            }

            // 实时同步想念次数
            const todayStr = new Date().toDateString();
            if (cfg.miss_last_date === todayStr) {
                state.missCount = parseInt(cfg.miss_count) || 0;
                state.missLastDate = todayStr;
            } else if (cfg.miss_last_date) {
                // 如果云端是过去的日期，视为新的一天，自动静默重置
                state.missCount = 0;
                state.missLastDate = todayStr;
                fetch('/api/config', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        miss_count: '0',
                        miss_last_date: todayStr
                    })
                }).catch(e => console.error("Cloud miss reset failed:", e));
            } else {
                state.missCount = 0;
                state.missLastDate = todayStr;
            }
            localStorage.setItem('missCount', state.missCount);
            localStorage.setItem('missLastDate', state.missLastDate);
            const missCounterEl = document.getElementById('miss-counter');
            if (missCounterEl) {
                missCounterEl.textContent = state.missCount;
            }
            updateMissMessageTip();

            // 更新内存 state 里的日期值
            state.meetDate = parseSafeDate(safeGet('config_meet_date', '2024-05-03') + 'T00:00:00');
            state.reunionDate = parseSafeDate(safeGet('config_reunion_date', '2026-01-18') + 'T00:00:00');
            state.anniversaryDate = parseSafeDate(safeGet('config_anniversary_date', '2026-05-03') + 'T00:00:00');
            state.reunionAnniversaryDate = parseSafeDate(safeGet('config_reunion_anniversary_date', '2027-01-18') + 'T00:00:00');

            // 实时应用云端配置的聊天回复剧本
            if (cfg.chat_reply_miss) CHAT_SCRIPTS.miss.reply = cfg.chat_reply_miss;
            if (cfg.chat_reply_hug) CHAT_SCRIPTS.hug.reply = cfg.chat_reply_hug;
            if (cfg.chat_reply_coax) CHAT_SCRIPTS.coax.reply = cfg.chat_reply_coax;

            // 重新刷新计时器和主页文字统计
            if (typeof initTimers === 'function') {
                initTimers();
            }

            // 刷新展示置顶公告条
            const customAnn = safeGet('config_custom_announcement');
            const banner = document.getElementById('admin-custom-announcement');
            const text = document.getElementById('announcement-text');
            if (banner && text) {
                if (customAnn) {
                    text.textContent = customAnn;
                    banner.style.display = 'block';
                } else {
                    banner.style.display = 'none';
                }
            }

            // 实时同步相册照片列表
            if (cfg.config_photo_list !== undefined) {
                try {
                    const parsed = JSON.parse(cfg.config_photo_list);
                    if (parsed && Array.isArray(parsed)) {
                        PHOTO_LIST = parsed;
                        if (typeof init3DGallery === 'function') {
                            init3DGallery();
                        }
                    }
                } catch(err) {}
            }

            // 实时同步背景音乐源
            if (cfg.config_bg_music_url !== undefined) {
                const bgMusic = document.getElementById('bg-music');
                if (bgMusic) {
                    const sourceEl = bgMusic.querySelector('source');
                    const currentSrc = sourceEl ? sourceEl.getAttribute('src') : '';
                    const targetSrc = cfg.config_bg_music_url.trim() || 'other/1.mp3';
                    if (currentSrc !== targetSrc) {
                        bgMusic.innerHTML = `<source src="${targetSrc}" type="audio/mpeg">`;
                        bgMusic.load();
                        if (state.musicPlaying) {
                            bgMusic.play().catch(e => console.log("Music play blocked:", e));
                        }
                    }
                }
            }
        } catch (e) {
            console.warn("Failed to sync global config from server, using local cached values:", e);
        }
    }

    // 🔄 异步从云端获取最新心愿单列表
    async function loadWishlistFromServer() {
        try {
            const res = await fetch('/api/wishlist');
            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data) && data.length > 0) {
                    state.wishlist = data;
                    safeSet('loveWishlist', JSON.stringify(state.wishlist));
                    const activeFilter = document.querySelector('.filter-btn.active')?.getAttribute('data-filter') || 'all';
                    renderWishlist(activeFilter);
                }
            }
        } catch(e) {
            console.warn("Failed to load wishlist from server, using local cached values:", e);
        }
    }

    // 🔄 异步保存心愿单列表到云端数据库
    async function saveWishlistToServer() {
        try {
            safeSet('loveWishlist', JSON.stringify(state.wishlist));
            await fetch('/api/wishlist', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(state.wishlist)
            });
        } catch(e) {
            console.error("Failed to save wishlist to server:", e);
        }
    }

    /* ================================================================
     *  初始化入口
     * ================================================================ */
    // 立即同步完成所有本地 UI 交互事件绑定（如开幕信封幕布、导航栏、主题切换等）
    // 确保即便云端数据库正在唤醒中（耗时30秒），用户依然可以瞬间点开信封进入小屋
    (function() {
        initThemeSystem();
        initBackgroundCanvas();
        initWelcomeToast();
        initNavigation();
        initOpeningCurtain(); // 立即初始化信封拆信，防止点不动！
        initGlobalInteraction();
        initHeartTrail();
        initHeartbeatStatus();
        initReunionInteractive();
        initLocalStorageData();
        initTimers();
        init3DGallery();
        init3DTiltEffect();

        // 异步进行后端检测与云端数据同步，不阻塞 UI 线程
        detectApiEndpoint().then(async () => {
            initWishlist();
            initStickyNotes();
            initChatSimulator();
            initBgmPlayer();
            initLoveTree();

            // 📢 首先加载本地缓存展示公告栏，随后异步同步云端配置
            const customAnn = safeGet('config_custom_announcement');
            if (customAnn) {
                const banner = document.getElementById('admin-custom-announcement');
                const text = document.getElementById('announcement-text');
                if (banner && text) {
                    text.textContent = customAnn;
                    banner.style.display = 'block';
                }
            }

            // 异步同步云数据库全局配置并刷新界面
            await syncGlobalConfig();

            // 异步同步云端心愿单列表
            await loadWishlistFromServer();
        });
    })();

    /* ================================================================
     *  数据存储与加载 (Local Storage)
     * ================================================================ */
    function initLocalStorageData() {
        const todayStr = new Date().toDateString();

        state.theme = localStorage.getItem('theme') || 'light';

        const storedMissDate = localStorage.getItem('missLastDate');
        const storedMissCount = localStorage.getItem('missCount');
        const storedShownMessages = localStorage.getItem('specialMessagesShown');
        
        if (storedMissDate === todayStr) {
            state.missCount = parseInt(storedMissCount) || 0;
            state.missLastDate = storedMissDate;
            state.specialMessagesShown = storedShownMessages ? JSON.parse(storedShownMessages) : [];
        } else {
            state.missCount = 0;
            state.missLastDate = todayStr;
            state.specialMessagesShown = [];
            localStorage.setItem('missLastDate', todayStr);
            localStorage.setItem('missCount', 0);
            localStorage.setItem('specialMessagesShown', JSON.stringify([]));
        }

        const storedPoints = safeGet('tree_points') || safeGet('treePoints');
        state.treePoints = storedPoints ? parseInt(storedPoints) : 15;

        const storedWishlist = safeGet('loveWishlist');
        if (storedWishlist) {
            try { state.wishlist = JSON.parse(storedWishlist); } catch(e) { state.wishlist = []; }
        }
        if (!state.wishlist || state.wishlist.length === 0) {
            state.wishlist = PRESET_WISHES.map(w => ({ ...w, completed: false }));
        }

        const storedNotes = localStorage.getItem('stickyNotes');
        if (storedNotes) {
            state.stickyNotes = JSON.parse(storedNotes);
        } else {
            state.stickyNotes = [
                {
                    id: Date.now() - 10000,
                    text: "珊珊宝贝，我们和好啦！希望以后有矛盾我们要及时沟通，永远不分开好不好！mua~~",
                    color: "pink",
                    emoji: "💖",
                    x: 30,
                    y: 40,
                    date: "2026/01/18",
                    author: "陈祖哲"
                },
                {
                    id: Date.now() - 5000,
                    text: "替陈祖哲监督白珊珊宝贝：今天也要开开心心，好好吃饭，好好想他哦！",
                    color: "yellow",
                    emoji: "🐾",
                    x: 230,
                    y: 150,
                    date: "2026/02/06",
                    author: "恋爱守护精灵"
                }
            ];
            localStorage.setItem('stickyNotes', JSON.stringify(state.stickyNotes));
        }
    }

    /* ================================================================
     *  梦幻双主题系统
     * ================================================================ */
    function initThemeSystem() {
        const toggleBtn = document.getElementById('theme-toggle');
        if (!toggleBtn) return;

        applyTheme(state.theme);

        toggleBtn.addEventListener('click', function(e) {
            const circle = document.createElement('div');
            circle.style.position = 'fixed';
            circle.style.width = '100px';
            circle.style.height = '100px';
            circle.style.borderRadius = '50%';
            circle.style.background = state.theme === 'light' ? 'rgba(15, 12, 27, 0.95)' : 'rgba(255, 240, 245, 0.95)';
            circle.style.top = e.clientY - 50 + 'px';
            circle.style.left = e.clientX - 50 + 'px';
            circle.style.pointerEvents = 'none';
            circle.style.zIndex = '99999';
            document.body.appendChild(circle);

            const animation = circle.animate([
                { transform: 'scale(1)', opacity: 1 },
                { transform: `scale(${Math.max(window.innerWidth, window.innerHeight) / 30})`, opacity: 0.1 }
            ], {
                duration: 650,
                easing: 'ease-out'
            });

            animation.onfinish = () => circle.remove();

            setTimeout(() => {
                const nextTheme = state.theme === 'light' ? 'dark' : 'light';
                applyTheme(nextTheme);
            }, 100);
        });
    }

    function applyTheme(theme) {
        state.theme = theme;
        localStorage.setItem('theme', theme);
        document.body.setAttribute('data-theme', theme);

        const toggleBtn = document.getElementById('theme-toggle');
        if (toggleBtn) {
            if (theme === 'dark') {
                toggleBtn.innerHTML = '<i class="fas fa-sun"></i>';
                toggleBtn.setAttribute('title', '切换至 梦幻樱粉 主题');
            } else {
                toggleBtn.innerHTML = '<i class="fas fa-moon"></i>';
                toggleBtn.setAttribute('title', '切换至 极光暗夜 主题');
            }
        }

        if (state.activeTab === 'tree') {
            drawTree();
        }
    }

    /* ================================================================
     *  页面 Tab 切换系统
     * ================================================================ */
    function initNavigation() {
        const navItems = document.querySelectorAll('.nav-item');
        const tabContents = document.querySelectorAll('.tab-content');

        navItems.forEach(item => {
            item.addEventListener('click', function() {
                const targetTab = this.getAttribute('data-tab');
                if (targetTab === state.activeTab) return;

                navItems.forEach(n => n.classList.remove('active'));
                this.classList.add('active');

                tabContents.forEach(content => {
                    content.classList.remove('active');
                });
                const activeContent = document.getElementById(`tab-${targetTab}`);
                if (activeContent) {
                    activeContent.classList.add('active');
                }

                state.activeTab = targetTab;

                if (targetTab === 'tree') {
                    setTimeout(() => {
                        drawTree();
                        startFallingLeavesAnimation();
                    }, 100);
                } else {
                    stopFallingLeavesAnimation();
                }
                
                if (targetTab === 'notes') {
                    renderStickyNotes();
                }

                window.scrollTo({ top: 0, behavior: 'smooth' });
            });
        });
    }

    /* ================================================================
     *  欢迎气泡
     * ================================================================ */
    function initWelcomeToast() {
        setTimeout(() => {
            const toast = document.getElementById('welcome-toast');
            if (toast) {
                toast.classList.add('show');
                setTimeout(() => {
                    toast.classList.remove('show');
                }, 4000);
            }
        }, 800);
    }

    /* ================================================================
     *  背景Canvas星空绘制
     * ================================================================ */
    function initBackgroundCanvas() {
        const canvas = document.getElementById('bg-canvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        let width = canvas.width = window.innerWidth;
        let height = canvas.height = window.innerHeight;

        let stars = [];
        const maxStars = 40;

        for (let i = 0; i < maxStars; i++) {
            stars.push({
                x: Math.random() * width,
                y: Math.random() * height,
                size: Math.random() * 1.6 + 0.4,
                opacity: Math.random() * 0.5 + 0.2,
                flickerSpeed: Math.random() * 0.015 + 0.005,
                angle: Math.random() * Math.PI * 2
            });
        }

        window.addEventListener('resize', () => {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
        });

        function animate() {
            ctx.clearRect(0, 0, width, height);

            stars.forEach(star => {
                star.angle += star.flickerSpeed;
                const currentOpacity = star.opacity + Math.sin(star.angle) * 0.2;
                
                ctx.fillStyle = state.theme === 'light' 
                    ? `rgba(255, 117, 151, ${currentOpacity})`
                    : `rgba(161, 127, 224, ${currentOpacity})`;
                
                ctx.beginPath();
                ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
                ctx.fill();

                star.y += star.size * 0.06;
                if (star.y > height) {
                    star.y = -10;
                    star.x = Math.random() * width;
                }
            });

            requestAnimationFrame(animate);
        }

        animate();
        setInterval(spawnFallingHeartDecoration, 3000);
    }

    function spawnFallingHeartDecoration() {
        const hearts = ['❤️', '💕', '💖', '💗', '💝', '✨'];
        const div = document.createElement('div');
        div.className = 'falling-heart-decor';
        div.textContent = hearts[Math.floor(Math.random() * hearts.length)];
        div.style.left = Math.random() * 100 + 'vw';
        div.style.top = '-20px';
        div.style.fontSize = Math.random() * 10 + 10 + 'px';
        div.style.animationDuration = Math.random() * 5 + 6 + 's';
        
        const randomRotate = Math.random() * 360;
        div.style.transform = `rotate(${randomRotate}deg)`;
        
        document.body.appendChild(div);
        setTimeout(() => div.remove(), 11000);
    }

    /* ================================================================
     *  高级鼠标流星爱意拖尾
     * ================================================================ */
    let lastX = 0, lastY = 0;
    function initGlobalInteraction() {
        document.addEventListener('mousemove', function(e) {
            const dist = Math.hypot(e.clientX - lastX, e.clientY - lastY);
            if (dist < 25) return;

            lastX = e.clientX;
            lastY = e.clientY;

            createTrailSparkle(e.clientX, e.clientY);
        });

        // 手机触摸移动产生流星粒子
        document.addEventListener('touchmove', function(e) {
            if (e.touches.length === 1) {
                const tx = e.touches[0].clientX;
                const ty = e.touches[0].clientY;
                const dist = Math.hypot(tx - lastX, ty - lastY);
                if (dist < 30) return;
                lastX = tx;
                lastY = ty;
                createTrailSparkle(tx, ty);
            }
        }, { passive: true });

        document.addEventListener('click', function(e) {
            if (e.target.closest('button') || e.target.closest('a') || e.target.closest('.sticky-note')) {
                return;
            }

            const hearts = ['❤️', '💕', '💖', '💗', '💝', '✨', '🌸'];
            const count = 5;
            for (let i = 0; i < count; i++) {
                const h = document.createElement('div');
                h.className = 'click-heart';
                h.textContent = hearts[Math.floor(Math.random() * hearts.length)];
                h.style.left = e.clientX - 10 + 'px';
                h.style.top = e.clientY - 10 + 'px';
                h.style.fontSize = Math.random() * 8 + 12 + 'px';

                const angle = Math.random() * Math.PI * 2;
                const v = Math.random() * 50 + 25;
                const tx = Math.cos(angle) * v;
                const ty = Math.sin(angle) * v - 15;

                h.animate([
                    { transform: 'translate(0, 0) scale(0.3)', opacity: 1 },
                    { transform: `translate(${tx}px, ${ty}px) scale(1.1)`, opacity: 0.8 },
                    { transform: `translate(${tx * 1.1}px, ${ty - 15}px) scale(0.4)`, opacity: 0 }
                ], { duration: 700, easing: 'cubic-bezier(0.1, 0.8, 0.2, 1)', fill: 'forwards' });

                document.body.appendChild(h);
                setTimeout(() => h.remove(), 750);
            }
        });
    }

    function createTrailSparkle(x, y) {
        const particles = ['✨', '⭐', '❤️', '🌸'];
        const p = document.createElement('div');
        p.className = 'cursor-trail';
        p.textContent = particles[Math.floor(Math.random() * particles.length)];
        p.style.left = x + 'px';
        p.style.top = y + 'px';
        p.style.fontSize = Math.random() * 5 + 9 + 'px';
        p.style.color = state.theme === 'light' ? '#ff7597' : '#a17fe0';

        document.body.appendChild(p);
        setTimeout(() => p.remove(), 600);
    }

    /* ================================================================
     *  3D Parallax 物理倾斜卡片效果 + 手机陀螺仪重力感应支持
     * ================================================================ */
    function init3DTiltEffect() {
        const panels = document.querySelectorAll('.glass-panel');
        
        panels.forEach(panel => {
            const glare = document.createElement('div');
            glare.className = 'card-glare';
            panel.appendChild(glare);

            // 桌面端鼠标偏转
            panel.addEventListener('mousemove', function(e) {
                // 如果是移动端触屏触发的 mousemove，则忽略
                if (window.matchMedia("(max-width: 768px)").matches) return;

                const rect = this.getBoundingClientRect();
                const x = e.clientX - rect.left - rect.width / 2;
                const y = e.clientY - rect.top - rect.height / 2;

                const tiltX = (y / (rect.height / 2)) * -6;
                const tiltY = (x / (rect.width / 2)) * 6;

                this.style.transform = `rotateX(${tiltX}deg) rotateY(${tiltY}deg) translateY(-5px)`;
                this.style.transition = 'transform 0.05s ease-out';

                const px = e.clientX - rect.left;
                const py = e.clientY - rect.top;
                this.style.setProperty('--mouse-x', `${px}px`);
                this.style.setProperty('--mouse-y', `${py}px`);

                const glareX = ((e.clientX - rect.left) / rect.width) * 100;
                const glareY = ((e.clientY - rect.top) / rect.height) * 100;
                glare.style.background = `radial-gradient(circle at ${glareX}% ${glareY}%, rgba(255, 255, 255, ${state.theme === 'light' ? '0.2' : '0.12'}) 0%, transparent 60%)`;
            });

            panel.addEventListener('mouseleave', function() {
                if (window.matchMedia("(max-width: 768px)").matches) return;
                this.style.transform = 'rotateX(0) rotateY(0) translateY(0)';
                this.style.transition = 'transform 0.5s ease';
            });
        });

        // 手机端陀螺仪重力倾斜
        if (window.DeviceOrientationEvent) {
            window.addEventListener('deviceorientation', handleMobileOrientation);
        }
    }

    // 陀螺仪运动数据偏转计算
    function handleMobileOrientation(e) {
        // 仅在移动端执行
        if (!window.matchMedia("(max-width: 768px)").matches) return;
        if (!e.beta || !e.gamma) return;

        // 过滤重力姿态数据：手机常规倾斜角约 40-50 度，我们以 45 度为中心
        const beta = Math.max(Math.min(e.beta, 70), 20) - 45; // -25 到 +25
        const gamma = Math.max(Math.min(e.gamma, 25), -25); // -25 到 +25

        const tiltX = (beta / 25) * 6; // 限制偏转 6 度
        const tiltY = (gamma / 25) * -6;

        document.querySelectorAll('.glass-panel').forEach(panel => {
            panel.style.transform = `rotateX(${tiltX}deg) rotateY(${tiltY}deg) translateY(-3px)`;
            panel.style.transition = 'transform 0.1s ease';

            const glare = panel.querySelector('.card-glare');
            if (glare) {
                const glareX = 50 + (gamma / 25) * 50;
                const glareY = 50 + (beta / 25) * 50;
                glare.style.background = `radial-gradient(circle at ${glareX}% ${glareY}%, rgba(255, 255, 255, ${state.theme === 'light' ? '0.12' : '0.06'}) 0%, transparent 60%)`;
            }
        });
    }

    /* ================================================================
     *  计时器逻辑
     * ================================================================ */

    function initTimers() {
        const anniversaryCount = document.getElementById('meet-days-card');
        const togetherCount = document.getElementById('together-days-card');

        function updateCardCounters() {
            const today = new Date();
            today.setHours(0,0,0,0);

            const meetStart = parseSafeDate(state.meetDate);
            meetStart.setHours(0,0,0,0);
            const meetDays = Math.floor((today - meetStart) / (1000 * 3600 * 24)) + 1;
            if (anniversaryCount) anniversaryCount.textContent = meetDays;

            const reunionStart = parseSafeDate(state.reunionDate);
            reunionStart.setHours(0,0,0,0);
            const togetherDays = Math.floor((today - reunionStart) / (1000 * 3600 * 24)) + 1;
            if (togetherCount) togetherCount.textContent = togetherDays;

            // 动态同步卡片底部的副标题日期文字
            const meetDateLabel = document.getElementById('meet-date-sublabel');
            if (meetDateLabel) {
                const meetD = parseSafeDate(state.meetDate);
                meetDateLabel.textContent = `初次相遇：${meetD.getFullYear()}年${meetD.getMonth() + 1}月${meetD.getDate()}日`;
            }
            
            const reunionDateLabel = document.getElementById('reunion-date-sublabel');
            if (reunionDateLabel) {
                const reunionD = parseSafeDate(state.reunionDate);
                reunionDateLabel.textContent = `复合纪念日：${reunionD.getFullYear()}年${reunionD.getMonth() + 1}月${reunionD.getDate()}日`;
            }
        }

        updateCardCounters();
        setInterval(updateCardCounters, 60000);

        function calculateCountdown(targetDateStr, daysElId, hoursElId, minsElId, secsElId) {
            const daysEl = document.getElementById(daysElId);
            const hoursEl = document.getElementById(hoursElId);
            const minsEl = document.getElementById(minsElId);
            const secsEl = document.getElementById(secsElId);

            if (!daysEl) return;

            function refresh() {
                const now = new Date();
                let target = parseSafeDate(targetDateStr);
                
                if (target - now < 0) {
                    target.setFullYear(now.getFullYear() + 1);
                }

                const diff = target - now;
                if (diff <= 0) {
                    daysEl.textContent = '00';
                    hoursEl.textContent = '00';
                    minsEl.textContent = '00';
                    secsEl.textContent = '00';
                    return;
                }

                const d = Math.floor(diff / (1000 * 60 * 60 * 24));
                const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                const s = Math.floor((diff % (1000 * 60)) / 1000);

                daysEl.textContent = d.toString().padStart(2, '0');
                hoursEl.textContent = h.toString().padStart(2, '0');
                minsEl.textContent = m.toString().padStart(2, '0');
                secsEl.textContent = s.toString().padStart(2, '0');
            }

            refresh();
            setInterval(refresh, 1000);
        }

        const currentYear = new Date().getFullYear();
        let targetAnniversary = `${currentYear}-05-03T00:00:00`;
        if (new Date(targetAnniversary) - new Date() < 0) {
            targetAnniversary = `${currentYear + 1}-05-03T00:00:00`;
        }
        calculateCountdown(targetAnniversary, 'days', 'hours', 'minutes', 'seconds');

        let targetReunion = `${currentYear}-01-18T00:00:00`;
        if (new Date(targetReunion) - new Date() < 0) {
            targetReunion = `${currentYear + 1}-01-18T00:00:00`;
        }
        calculateCountdown(targetReunion, 'ra-days', 'ra-hours', 'ra-minutes', 'ra-seconds');

        // 200天/自定义纪念日倒计时 (可从管理员控制台动态覆盖目标日期和名称)
        const configTargetDate = safeGet('config_countdown_target', '2026-08-05');
        const configTargetTitle = safeGet('config_countdown_title', '在一起第 200 天');
        const target200Day = `${configTargetDate}T00:00:00`;
        const d200Container = document.getElementById('200day-countdown');
        if (d200Container) {
            const h4El = d200Container.previousElementSibling;
            const now200 = new Date();
            const t200 = new Date(target200Day);
            
            // 计算目标日期的月日显示，例如 (8月5日)
            const dateObj = new Date(target200Day);
            const dateStr = isNaN(dateObj.getTime()) ? '' : ` (${dateObj.getMonth() + 1}月${dateObj.getDate()}日)`;
            
            if (now200 >= t200) {
                // 已过目标日期 - 显示庆祝模式
                d200Container.innerHTML = `<div style="font-size: 2rem; color: var(--primary-dark); font-weight: 800; animation: pulse 1.5s infinite;">🎉 ${configTargetTitle}已到！🎉</div>`;
                if (h4El && h4El.tagName === 'H4') {
                    h4El.innerHTML = `🎊 我们在一起已经超过${configTargetTitle}了！🎊`;
                }
            } else {
                if (h4El && h4El.tagName === 'H4') {
                    h4El.innerHTML = `🎉 ${configTargetTitle}倒计时${dateStr}`;
                }
                calculateCountdown(target200Day, 'd200-days', 'd200-hours', 'd200-minutes', 'd200-seconds');
            }
        }
    }

    /* ================================================================
     *  爱意树 (Canvas 物理落花系统)
     * ================================================================ */
    let canvasTree, ctxTree;
    let leaves = [];
    let sparks = [];
    let animTreeFrame = null;
    let leafPoints = [];

    function initLoveTree() {
        canvasTree = document.getElementById('tree-canvas');
        if (!canvasTree) return;
        ctxTree = canvasTree.getContext('2d');

        updateTreeDashboard();

        const fertilizeBtn = document.getElementById('fertilize-tree-btn');
        if (fertilizeBtn) {
            fertilizeBtn.addEventListener('click', function() {
                state.treePoints += 5;
                safeSet('treePoints', String(state.treePoints));
                safeSet('tree_points', String(state.treePoints));
                updateTreeDashboard();

                // 同步施肥数值至云端配置
                fetch('/api/config', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ tree_points: String(state.treePoints) })
                }).catch(e => console.error("Cloud tree points sync failed:", e));

                heartExplosionFromTree();
                triggerLeafFall(20);

                drawTree();
                showToastMessage('🌱 施肥成功！爱意树吸饱了养料，开出漫天花瓣！ 🌸');
            });
        }
    }

    function updateTreeDashboard() {
        const pointsEl = document.getElementById('tree-points');
        const levelEl = document.getElementById('tree-level');
        const nextLevelEl = document.getElementById('tree-next-level');

        if (!pointsEl) return;
        pointsEl.textContent = state.treePoints;

        let level = "小萌芽";
        let status = "需要浇灌";

        if (state.treePoints >= 100) {
            level = "爱心盛开之树 🌳✨";
            status = "已臻完美盛开！";
        } else if (state.treePoints >= 60) {
            level = "茂盛桃树 🌳";
            status = "距离开花还差 " + (100 - state.treePoints) + " 养分";
        } else if (state.treePoints >= 30) {
            level = "成长小树 🌱";
            status = "距离繁茂还差 " + (60 - state.treePoints) + " 养分";
        } else {
            level = "小萌芽 🌱";
            status = "距离抽枝还差 " + (30 - state.treePoints) + " 养分";
        }

        levelEl.textContent = level;
        nextLevelEl.textContent = status;
    }

    function drawTree() {
        if (!canvasTree || state.activeTab !== 'tree') return;

        const rect = canvasTree.getBoundingClientRect();
        canvasTree.width = rect.width * 2;
        canvasTree.height = 360 * 2;
        ctxTree.scale(2, 2);

        const w = rect.width;
        const h = 360;

        ctxTree.clearRect(0, 0, w, h);
        leafPoints = [];

        const points = state.treePoints;
        const maxLen = Math.min(60 + points * 0.15, 95); 
        const startWidth = Math.min(8 + points * 0.08, 16);
        const branchAngle = Math.min(20 + points * 0.05, 27) * Math.PI / 180;

        const startX = w / 2;
        const startY = h - 25;

        ctxTree.beginPath();
        ctxTree.moveTo(startX - 140, startY + 5);
        ctxTree.quadraticCurveTo(startX, startY - 6, startX + 140, startY + 5);
        ctxTree.strokeStyle = state.theme === 'light' ? '#bce4a7' : '#57764f';
        ctxTree.lineWidth = 4;
        ctxTree.stroke();

        function drawBranch(x, y, len, angle, branchWidth, depth) {
            ctxTree.beginPath();
            ctxTree.moveTo(x, y);

            const endX = x + Math.cos(angle) * len;
            const endY = y + Math.sin(angle) * len;

            ctxTree.lineTo(endX, endY);
            ctxTree.strokeStyle = state.theme === 'light' ? '#84675b' : '#5b453d';
            ctxTree.lineWidth = branchWidth;
            ctxTree.lineCap = 'round';
            ctxTree.stroke();

            if (depth >= 6) {
                drawLeaves(endX, endY);
                leafPoints.push({ x: endX, y: endY });
                return;
            }

            const nextLen = len * 0.73;
            const nextWidth = branchWidth * 0.7;

            drawBranch(endX, endY, nextLen, angle - branchAngle, nextWidth, depth + 1);
            drawBranch(endX, endY, nextLen, angle + branchAngle, nextWidth, depth + 1);
        }

        function drawLeaves(x, y) {
            const numLeaves = Math.min(2 + Math.floor(state.treePoints / 12), 7);
            ctxTree.fillStyle = state.theme === 'light' 
                ? 'rgba(255, 117, 151, 0.85)'
                : 'rgba(213, 184, 255, 0.85)';

            for (let i = 0; i < numLeaves; i++) {
                const ox = x + (Math.random() - 0.5) * 16;
                const oy = y + (Math.random() - 0.5) * 16;
                const size = Math.random() * 4 + 3.5;

                ctxTree.beginPath();
                ctxTree.moveTo(ox, oy);
                ctxTree.bezierCurveTo(ox - size/2, oy - size/2, ox - size, oy + size/3, ox, oy + size);
                ctxTree.bezierCurveTo(ox + size, oy + size/3, ox + size/2, oy - size/2, ox, oy);
                ctxTree.fill();
            }
        }

        drawBranch(startX, startY, maxLen, -Math.PI / 2, startWidth, 1);
    }

    function startFallingLeavesAnimation() {
        if (animTreeFrame) return;

        let time = 0;

        function updateLeaves() {
            if (!canvasTree || state.activeTab !== 'tree') return;

            const rect = canvasTree.getBoundingClientRect();
            const w = rect.width;
            const h = 360;
            const groundY = h - 23;

            if (Math.random() < 0.05 && leafPoints.length > 0 && leaves.length < 50) {
                const source = leafPoints[Math.floor(Math.random() * leafPoints.length)];
                leaves.push(createLeafParticle(source.x, source.y));
            }

            drawTree();

            time += 0.015;
            const wind = Math.sin(time) * 0.15;

            leaves = leaves.filter(l => {
                if (l.y < groundY - 2) {
                    l.vy += 0.04;
                    l.vx += wind * 0.05;
                    
                    l.vx *= 0.98;
                    l.vy *= 0.96;

                    l.x += l.vx;
                    l.y += l.vy;
                    l.rotation += l.rSpeed;
                } else {
                    if (l.bounceCount > 0) {
                        l.vy = -l.vy * 0.28;
                        l.vx *= 0.5;
                        l.bounceCount--;
                        l.y = groundY - 2;
                    } else {
                        l.vx = wind * 0.1;
                        l.vy = 0;
                        l.x += l.vx;
                        l.y = groundY;
                        
                        l.life -= 0.003;
                        if (l.life <= 0) {
                            return false;
                        }
                    }
                }

                ctxTree.save();
                ctxTree.translate(l.x, l.y);
                ctxTree.rotate(l.rotation);
                ctxTree.fillStyle = `rgba(${l.color}, ${l.life})`;

                ctxTree.beginPath();
                ctxTree.moveTo(0, -l.size/2);
                ctxTree.bezierCurveTo(-l.size/2, -l.size/2, -l.size, l.size/3, 0, l.size);
                ctxTree.bezierCurveTo(l.size, l.size/3, l.size/2, -l.size/2, 0, -l.size/2);
                ctxTree.fill();
                ctxTree.restore();

                return true;
            });

            // 产生微弱的浪漫萤火虫/发光金粉粒子 (向上漂移)
            if (Math.random() < 0.28 && leafPoints.length > 0 && sparks.length < 50) {
                const source = leafPoints[Math.floor(Math.random() * leafPoints.length)];
                sparks.push({
                    x: source.x + (Math.random() - 0.5) * 30,
                    y: source.y + (Math.random() - 0.5) * 20,
                    vx: (Math.random() - 0.5) * 0.7,
                    vy: -Math.random() * 0.7 - 0.3,
                    size: Math.random() * 2.2 + 0.8,
                    life: 1.0,
                    decay: Math.random() * 0.015 + 0.008,
                    flicker: Math.random() * 0.3
                });
            }

            // 更新并绘制发光微粒
            for (let i = sparks.length - 1; i >= 0; i--) {
                const s = sparks[i];
                s.x += s.vx + Math.sin(time * 2 + s.flicker) * 0.25;
                s.y += s.vy;
                s.life -= s.decay;

                if (s.life <= 0) {
                    sparks.splice(i, 1);
                    continue;
                }

                ctxTree.save();
                ctxTree.beginPath();
                ctxTree.arc(s.x, s.y, s.size, 0, Math.PI * 2);
                ctxTree.shadowBlur = 8;
                ctxTree.shadowColor = state.theme === 'light' ? 'rgba(255, 117, 151, 0.75)' : 'rgba(161, 127, 224, 0.75)';
                ctxTree.fillStyle = state.theme === 'light' 
                    ? `rgba(255, 185, 205, ${s.life * 0.95})` 
                    : `rgba(215, 195, 255, ${s.life * 0.95})`;
                ctxTree.fill();
                ctxTree.restore();
            }

            animTreeFrame = requestAnimationFrame(updateLeaves);
        }

        updateLeaves();
    }

    function stopFallingLeavesAnimation() {
        if (animTreeFrame) {
            cancelAnimationFrame(animTreeFrame);
            animTreeFrame = null;
        }
        leaves = [];
        sparks = [];
    }

    function createLeafParticle(x, y) {
        const pinkRGB = state.theme === 'light' ? '255, 117, 151' : '213, 184, 255';
        return {
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 1.5,
            vy: Math.random() * 0.5,
            size: Math.random() * 3 + 3.5,
            rotation: Math.random() * Math.PI,
            rSpeed: (Math.random() - 0.5) * 0.05,
            color: pinkRGB,
            life: 0.9,
            bounceCount: 2
        };
    }

    function triggerLeafFall(count) {
        if (leafPoints.length === 0) return;
        for (let i = 0; i < count; i++) {
            const pt = leafPoints[Math.floor(Math.random() * leafPoints.length)];
            const leaf = createLeafParticle(pt.x, pt.y);
            leaf.vx = (Math.random() - 0.5) * 4;
            leaf.vy = (Math.random() - 0.5) * 3 - 1;
            leaves.push(leaf);
        }
    }

    function heartExplosionFromTree() {
        if (!canvasTree) return;
        const rect = canvasTree.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 3;

        for (let i = 0; i < 15; i++) {
            const h = document.createElement('div');
            h.className = 'click-heart';
            h.textContent = ['🌸', '❤️', '💕', '💖', '✨'][Math.floor(Math.random() * 5)];
            h.style.left = centerX + 'px';
            h.style.top = centerY + 'px';
            h.style.fontSize = Math.random() * 12 + 16 + 'px';

            const angle = Math.random() * Math.PI * 2;
            const velocity = Math.random() * 120 + 60;
            const targetX = Math.cos(angle) * velocity;
            const targetY = Math.sin(angle) * velocity - 100;

            h.animate([
                { transform: 'translate(0, 0) scale(0.2)', opacity: 1 },
                { transform: `translate(${targetX}px, ${targetY}px) scale(1.2)`, opacity: 0.8 },
                { transform: `translate(${targetX * 1.2}px, ${targetY - 50}px) scale(0.5)`, opacity: 0 }
            ], {
                duration: 1100 + Math.random() * 400,
                easing: 'cubic-bezier(0.25, 0.8, 0.25, 1)',
                fill: 'forwards'
            });

            document.body.appendChild(h);
            setTimeout(() => h.remove(), 1600);
        }
    }

    /* ================================================================
     *  恋爱100件小事插件逻辑
     * ================================================================ */
    function initWishlist() {
        const grid = document.getElementById('wishlist-grid');
        if (!grid) return;

        renderWishlist('all');

        const filterBtns = document.querySelectorAll('.filter-btn');
        filterBtns.forEach(btn => {
            btn.addEventListener('click', function() {
                filterBtns.forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                const category = this.getAttribute('data-filter');
                renderWishlist(category);
            });
        });

        const addBtn = document.getElementById('custom-wish-add-btn');
        const input = document.getElementById('custom-wish-input');
        if (addBtn && input) {
            addBtn.addEventListener('click', function() {
                const text = input.value.trim();
                if (text === '') {
                    showToastMessage('⚠️ 请输入你想和珊珊一起做的小事哦！');
                    return;
                }
                
                const newId = state.wishlist.length > 0 ? Math.max(...state.wishlist.map(w => w.id)) + 1 : 1;
                const newWish = {
                    id: newId,
                    title: text,
                    category: 'custom',
                    completed: false
                };

                state.wishlist.push(newWish);
                saveWishlistToServer();
                input.value = '';

                const activeFilter = document.querySelector('.filter-btn.active').getAttribute('data-filter');
                renderWishlist(activeFilter);
                showToastMessage('🎉 新增自定义心愿成功！');
            });
        }
    }

    function renderWishlist(filter) {
        const grid = document.getElementById('wishlist-grid');
        if (!grid) return;

        grid.innerHTML = '';
        
        let filteredList = state.wishlist;
        if (filter !== 'all') {
            filteredList = state.wishlist.filter(w => w.category === filter);
        }

        filteredList.forEach((item) => {
            const card = document.createElement('div');
            card.className = `wishlist-item ${item.completed ? 'completed' : ''}`;
            
            let tagLabel = '小事';
            let tagClass = 'tag-daily';

            switch (item.category) {
                case 'daily': tagLabel = '温馨日常'; tagClass = 'tag-daily'; break;
                case 'food': tagLabel = '吃货日常'; tagClass = 'tag-food'; break;
                case 'travel': tagLabel = '旅行足迹'; tagClass = 'tag-travel'; break;
                case 'special': tagLabel = '浪漫仪式'; tagClass = 'tag-special'; break;
                case 'custom': tagLabel = '定制心愿'; tagClass = 'tag-custom'; break;
            }

            card.innerHTML = `
                <div class="wishlist-checkbox">
                    <i class="fas fa-check"></i>
                </div>
                <div class="wishlist-item-content">
                    <div class="item-index">#${item.id}</div>
                    <div class="item-title">${item.title}</div>
                    <span class="item-tag ${tagClass}">${tagLabel}</span>
                </div>
            `;

            card.addEventListener('click', () => {
                toggleWishlistState(item.id);
            });

            grid.appendChild(card);
        });

        updateWishlistProgress();
    }

    function toggleWishlistState(id) {
        const idx = state.wishlist.findIndex(w => w.id === id);
        if (idx !== -1) {
            const prevStatus = state.wishlist[idx].completed;
            state.wishlist[idx].completed = !prevStatus;
            saveWishlistToServer();

            if (!prevStatus === true) {
                state.treePoints += 3;
                safeSet('treePoints', String(state.treePoints));
                safeSet('tree_points', String(state.treePoints));
                updateTreeDashboard();
                showToastMessage('💖 恭喜完成一件恋爱小事！爱意树养分 +3 🌳');
            } else {
                state.treePoints = Math.max(state.treePoints - 3, 0);
                safeSet('treePoints', String(state.treePoints));
                safeSet('tree_points', String(state.treePoints));
                updateTreeDashboard();
            }

            // 同步爱意树数值至云端配置
            fetch('/api/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tree_points: String(state.treePoints) })
            }).catch(e => console.error("Cloud tree points sync failed:", e));

            const activeFilter = document.querySelector('.filter-btn.active').getAttribute('data-filter');
            renderWishlist(activeFilter);
        }
    }

    function updateWishlistProgress() {
        const completedCount = state.wishlist.filter(w => w.completed).length;
        const totalCount = state.wishlist.length;
        const percentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

        const progressBar = document.getElementById('wishlist-progress-bar');
        const progressText = document.getElementById('wishlist-progress-text');

        if (progressBar) progressBar.style.width = `${percentage}%`;
        if (progressText) progressText.textContent = `已解锁 ${completedCount} / ${totalCount} 件事 (${percentage}%)`;
    }

    /* ================================================================
     *  多彩便签墙 (手机锁屏滑动优化)
     * ================================================================ */
    let wallBoard;

    // 从服务器拉取留言数据
    async function loadStickyNotesFromServer() {
        if (!apiEndpoint) return;
        try {
            const res = await fetch(apiEndpoint);
            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data) && data.length > 0) {
                    state.stickyNotes = data;
                    renderStickyNotes();
                }
            }
        } catch(e) {
            console.error("从后端拉取留言失败，将使用本地暂存:", e);
        }
    }

    function initStickyNotes() {
        wallBoard = document.getElementById('wall-board');
        if (!wallBoard) return;

        const colorOptions = document.querySelectorAll('.color-option');
        colorOptions.forEach(opt => {
            opt.addEventListener('click', function() {
                colorOptions.forEach(o => o.classList.remove('selected'));
                this.classList.add('selected');
            });
        });

        const emojiOptions = document.querySelectorAll('.emoji-option');
        const textarea = document.getElementById('wall-textarea');
        emojiOptions.forEach(opt => {
            opt.addEventListener('click', function() {
                if (textarea) {
                    textarea.value += this.textContent;
                    textarea.focus();
                }
            });
        });

        const publishBtn = document.getElementById('publish-note-btn');
        if (publishBtn) {
            publishBtn.addEventListener('click', function() {
                const text = textarea.value.trim();
                if (text === '') {
                    showToastMessage('⚠️ 写点想对珊珊说的悄悄话再发布吧！');
                    return;
                }

                const selectedColorOpt = document.querySelector('.color-option.selected');
                const color = selectedColorOpt ? selectedColorOpt.getAttribute('data-color') : 'pink';

                const randomEmojis = ['❤️', '💕', '✨', '👑', '🐾', '🎀', '🎈'];
                const emoji = randomEmojis[Math.floor(Math.random() * randomEmojis.length)];

                const x = Math.random() * (wallBoard.clientWidth - 240);
                const y = Math.random() * (wallBoard.clientHeight - 180);

                const now = new Date();
                const dateStr = now.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' });

                // 获取作者签名
                const authorInput = document.getElementById('wall-author-input');
                const author = (authorInput && authorInput.value.trim() !== '') ? authorInput.value.trim() : '白珊珊';

                const newNote = {
                    id: Date.now(),
                    text: text,
                    color: color,
                    emoji: emoji,
                    x: x < 0 ? 20 : x,
                    y: y < 0 ? 20 : y,
                    date: dateStr,
                    author: author
                };

                state.stickyNotes.push(newNote);
                localStorage.setItem('stickyNotes', JSON.stringify(state.stickyNotes));
                
                // 同步保存至云端/服务器
                if (apiEndpoint) {
                    fetch(apiEndpoint, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(newNote)
                    }).then(res => {
                        if (res.ok) console.log("云端留言保存成功！");
                    }).catch(err => console.error("同步留言至云端出错:", err));
                }

                // 触发手机推送通知给祖哲
                triggerPushNotification(text, author);

                textarea.value = '';
                renderStickyNotes();
                showToastMessage('💌 悄悄话已挂到便签墙上，并同步至云端！');

                state.treePoints += 2;
                safeSet('treePoints', String(state.treePoints));
                safeSet('tree_points', String(state.treePoints));
                updateTreeDashboard();

                // 同步爱意树数值至云端配置
                fetch('/api/config', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ tree_points: String(state.treePoints) })
                }).catch(e => console.error("Cloud tree points sync failed:", e));
            });
        }

        // 先渲染本地，然后尝试从服务器拉取最新数据覆盖并重新渲染
        renderStickyNotes();
        loadStickyNotesFromServer();
    }

    function renderStickyNotes() {
        if (!wallBoard) return;
        wallBoard.innerHTML = '';

        const boardWidth = wallBoard.clientWidth;
        const boardHeight = wallBoard.clientHeight;

        state.stickyNotes.forEach((note) => {
            const div = document.createElement('div');
            let actualX = note.x;
            let actualY = note.y;

            if (actualX > boardWidth - 230) actualX = Math.max(boardWidth - 240, 10);
            if (actualY > boardHeight - 170) actualY = Math.max(boardHeight - 180, 10);

            div.className = `sticky-note note-bg-${note.color}`;
            div.style.left = `${actualX}px`;
            div.style.top = `${actualY}px`;
            
            const rotateDeg = (note.id % 10) - 5;
            div.style.transform = `rotate(${rotateDeg}deg)`;

            div.innerHTML = `
                <div class="sticky-note-header">
                    <span>${note.emoji} 便签</span>
                    <i class="fas fa-trash-alt note-delete" title="撕掉它"></i>
                </div>
                <div class="sticky-note-content">${note.text}</div>
                <div class="sticky-note-footer">
                    —— ${note.author} (${note.date})
                </div>
            `;

            const delBtn = div.querySelector('.note-delete');
            delBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                if (confirm('确定要撕掉这条珍贵的悄悄话便签吗？')) {
                    const noteId = note.id;
                    state.stickyNotes = state.stickyNotes.filter(n => n.id !== noteId);
                    localStorage.setItem('stickyNotes', JSON.stringify(state.stickyNotes));
                    renderStickyNotes();

                    // 同步在服务器端删除
                    if (apiEndpoint) {
                        fetch(`${apiEndpoint}?id=${noteId}`, { method: 'DELETE' })
                        .then(res => {
                            if (res.ok) console.log("已同步在云端删除该留言！");
                        }).catch(err => console.error("云端删除留言失败:", err));
                    }
                }
            });

            makeElementDraggable(div, note.id);
            wallBoard.appendChild(div);
        });
    }

    function makeElementDraggable(el, noteId) {
        let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;

        el.addEventListener('mousedown', dragMouseDown);
        el.addEventListener('touchstart', dragTouchStart, { passive: false }); // 手机端拖拽关键：非 passive 监听

        function dragMouseDown(e) {
            e.preventDefault();
            pos3 = e.clientX;
            pos4 = e.clientY;
            document.addEventListener('mouseup', closeDragElement);
            document.addEventListener('mousemove', elementDrag);
        }

        function dragTouchStart(e) {
            // 阻止背景拖动
            e.preventDefault();
            if (e.touches.length === 1) {
                pos3 = e.touches[0].clientX;
                pos4 = e.touches[0].clientY;
                document.addEventListener('touchend', closeDragElement);
                document.addEventListener('touchmove', elementTouchDrag, { passive: false }); // 非 passive 监听以允许 preventDefault
            }
        }

        function elementDrag(e) {
            e.preventDefault();
            pos1 = pos3 - e.clientX;
            pos2 = pos4 - e.clientY;
            pos3 = e.clientX;
            pos4 = e.clientY;
            updateElementPosition();
        }

        function elementTouchDrag(e) {
            e.preventDefault(); // 阻止背景滚动
            pos1 = pos3 - e.touches[0].clientX;
            pos2 = pos4 - e.touches[0].clientY;
            pos3 = e.touches[0].clientX;
            pos4 = e.touches[0].clientY;
            updateElementPosition();
        }

        function updateElementPosition() {
            const boardWidth = wallBoard.clientWidth;
            const boardHeight = wallBoard.clientHeight;

            let newTop = el.offsetTop - pos2;
            let newLeft = el.offsetLeft - pos1;

            if (newLeft < 5) newLeft = 5;
            if (newTop < 5) newTop = 5;
            if (newLeft > boardWidth - 230) newLeft = boardWidth - 230;
            if (newTop > boardHeight - 170) newTop = boardHeight - 170;

            el.style.top = newTop + "px";
            el.style.left = newLeft + "px";
        }

        function closeDragElement() {
            document.removeEventListener('mouseup', closeDragElement);
            document.removeEventListener('mousemove', elementDrag);
            document.removeEventListener('touchend', closeDragElement);
            document.removeEventListener('touchmove', elementTouchDrag);

            const idx = state.stickyNotes.findIndex(n => n.id === noteId);
            if (idx !== -1) {
                const newX = parseFloat(el.style.left);
                const newY = parseFloat(el.style.top);
                state.stickyNotes[idx].x = newX;
                state.stickyNotes[idx].y = newY;
                safeSet('stickyNotes', JSON.stringify(state.stickyNotes));

                // 实时推送更新位置坐标至服务器云端
                if (apiEndpoint) {
                    fetch(apiEndpoint, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ id: noteId, x: newX, y: newY })
                    }).catch(e => console.error("Cloud coordinates update failed:", e));
                }
            }
        }
    }

    /* ================================================================
     *  3D 相册卡片堆叠
     * ================================================================ */
    function init3DGallery() {
        const carousel = document.getElementById('carousel-3d');
        if (!carousel) return;

        carousel.innerHTML = '';
        
        PHOTO_LIST.forEach((photo, idx) => {
            const card = document.createElement('div');
            card.className = 'carousel-card';
            card.innerHTML = `
                <img src="${photo.src}" alt="${photo.caption}" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'250\\' height=\\'260\\'><rect width=\\'250\\' height=\\'260\\' fill=\\'%23f3f0f3\\'/><text x=\\'125\\' y=\\'130\\' text-anchor=\\'middle\\' fill=\\'%23b1a1b1\\'>图片加载中...</text></svg>'">
                <div class="caption">${photo.caption}</div>
            `;

            card.addEventListener('click', function() {
                const currentIdx = parseInt(this.getAttribute('data-index'));
                if (currentIdx !== centerIndex) {
                    centerIndex = currentIdx;
                    layoutCarousel();
                } else {
                    openLightbox(photo.src, photo.caption);
                }
            });

            carousel.appendChild(card);
        });

        const cards = document.querySelectorAll('.carousel-card');
        let centerIndex = 0;

        function layoutCarousel() {
            cards.forEach((card, idx) => {
                card.setAttribute('data-index', idx);
                let offset = idx - centerIndex;
                if (offset < -cards.length / 2) offset += cards.length;
                if (offset > cards.length / 2) offset -= cards.length;

                const absOffset = Math.abs(offset);
                
                if (absOffset > 2) {
                    card.style.display = 'none';
                    return;
                } else {
                    card.style.display = 'block';
                }

                // 移动端宽度自适应调整偏移量
                const isMobile = window.matchMedia("(max-width: 768px)").matches;
                const gap = isMobile ? 120 : 180;

                const translateVal = offset * gap;
                const scaleVal = 1 - absOffset * 0.16;
                const rotateVal = offset * -18;
                const zIndexVal = 100 - absOffset;
                const opacityVal = 1 - absOffset * 0.35;

                card.style.transform = `translateX(${translateVal}px) scale(${scaleVal}) rotateY(${rotateVal}deg)`;
                card.style.zIndex = zIndexVal;
                card.style.opacity = opacityVal;
            });
        }

        let startX = 0;
        carousel.addEventListener('mousedown', e => startX = e.clientX);
        carousel.addEventListener('mouseup', e => {
            const endX = e.clientX;
            if (startX - endX > 50) {
                centerIndex = (centerIndex + 1) % cards.length;
                layoutCarousel();
            } else if (endX - startX > 50) {
                centerIndex = (centerIndex - 1 + cards.length) % cards.length;
                layoutCarousel();
            }
        });

        carousel.addEventListener('touchstart', e => startX = e.touches[0].clientX, { passive: true });
        carousel.addEventListener('touchend', e => {
            const endX = e.changedTouches[0].clientX;
            if (startX - endX > 40) {
                centerIndex = (centerIndex + 1) % cards.length;
                layoutCarousel();
            } else if (endX - startX > 40) {
                centerIndex = (centerIndex - 1 + cards.length) % cards.length;
                layoutCarousel();
            }
        });

        layoutCarousel();

        setInterval(() => {
            const lightbox = document.getElementById('lightbox');
            if (state.activeTab === 'album' && (!lightbox || !lightbox.classList.contains('active'))) {
                centerIndex = (centerIndex + 1) % cards.length;
                layoutCarousel();
            }
        }, 5000);

        window.addEventListener('resize', layoutCarousel);
    }

    function openLightbox(src, caption) {
        const lb = document.getElementById('lightbox');
        const img = document.getElementById('lightbox-img');
        const cap = document.getElementById('lightbox-caption');
        if (!lb) return;
        img.src = src;
        cap.textContent = caption;
        lb.classList.add('active');
    }

    document.addEventListener('DOMContentLoaded', () => {
        const lb = document.getElementById('lightbox');
        if (lb) {
            const close = lb.querySelector('.lightbox-close');
            close.addEventListener('click', () => lb.classList.remove('active'));
            lb.addEventListener('click', (e) => {
                if (e.target === lb) lb.classList.remove('active');
            });
        }
    });

    /* ================================================================
     *  拟真情侣气泡对话模拟器逻辑
     * ================================================================ */
    let chatMessagesContainer;

    function initChatSimulator() {
        chatMessagesContainer = document.getElementById('chat-messages');
        if (!chatMessagesContainer) return;

        appendChatMessage("left", "👨‍💻", "珊珊宝贝，我已经上线连线了，今天过得开心吗？想我了就点点下面的气泡悄悄话通知我噢~ ✨");

        const chatButtons = document.querySelectorAll('.chat-btn');
        chatButtons.forEach(btn => {
            btn.addEventListener('click', function() {
                const action = this.getAttribute('data-action');
                triggerChatAction(action);
            });
        });
    }

    function triggerChatAction(action) {
        const script = CHAT_SCRIPTS[action];
        if (!script || !chatMessagesContainer) return;

        appendChatMessage("right", "👧", script.user);
        scrollToBottom();

        toggleChatButtons(false);

        setTimeout(() => {
            const typingBubble = appendTypingIndicator();
            scrollToBottom();

            setTimeout(() => {
                typingBubble.remove();
                appendChatMessage("left", "👨‍💻", script.reply);
                scrollToBottom();

                toggleChatButtons(true);
            }, 1200);
        }, 600);
    }

    function appendChatMessage(direction, avatarText, text) {
        if (!chatMessagesContainer) return null;

        const msgDiv = document.createElement('div');
        msgDiv.className = `chat-msg ${direction}`;
        
        msgDiv.innerHTML = `
            <div class="chat-avatar">${avatarText}</div>
            <div class="chat-bubble">${text}</div>
        `;
        
        chatMessagesContainer.appendChild(msgDiv);
        return msgDiv;
    }

    function appendTypingIndicator() {
        if (!chatMessagesContainer) return null;

        const msgDiv = document.createElement('div');
        msgDiv.className = 'chat-msg left';
        
        msgDiv.innerHTML = `
            <div class="chat-avatar">👨‍💻</div>
            <div class="chat-bubble">
                <div class="typing-indicator">
                    <span></span><span></span><span></span>
                </div>
            </div>
        `;
        
        chatMessagesContainer.appendChild(msgDiv);
        return msgDiv;
    }

    function toggleChatButtons(enabled) {
        const btns = document.querySelectorAll('.chat-btn');
        btns.forEach(b => {
            b.disabled = !enabled;
            b.style.opacity = enabled ? '1' : '0.5';
            b.style.pointerEvents = enabled ? 'auto' : 'none';
        });
    }

    function scrollToBottom() {
        if (chatMessagesContainer) {
            chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
        }
    }

    /* ================================================================
     *  黑胶唱机播放器控制与声波律动仪
     * ================================================================ */
    function initBgmPlayer() {
        const player = document.getElementById('vinyl-player');
        const audio = document.getElementById('bg-music');
        const eq = document.getElementById('audio-equalizer');

        if (!player || !audio) return;

        audio.volume = 0.55;

        player.addEventListener('click', function() {
            if (audio.paused) {
                audio.play().then(() => {
                    player.classList.add('playing');
                    if (eq) eq.classList.add('active');
                    state.musicPlaying = true;
                    showToastMessage('💿 转动爱意唱片盘，声波同频跳动中... 🎶');
                }).catch(() => {
                    showToastMessage('⚠️ 浏览器拒绝了自动播歌，再次点击下唱片即可！');
                });
            } else {
                audio.pause();
                player.classList.remove('playing');
                if (eq) eq.classList.remove('active');
                state.musicPlaying = false;
                showToastMessage('💤 留声机暂停，但想念依然不停转');
            }
        });
    }

    /* ================================================================
     *  想念计数器特殊反应系统
     * ================================================================ */
    function initReunionInteractive() {
        const missCounter = document.getElementById('miss-counter');
        const missButton = document.getElementById('miss-button');
        const missReset = document.getElementById('miss-reset');
        const missToday = document.getElementById('miss-today');
        
        if (!missCounter) return;

        if (missToday) {
            const now = new Date();
            missToday.textContent = `今天是 ${now.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })}`;
        }

        missCounter.textContent = state.missCount;

        missButton.addEventListener('click', function() {
            state.missCount++;
            localStorage.setItem('missCount', state.missCount);
            missCounter.textContent = state.missCount;

            missCounter.style.transform = 'scale(1.3)';
            setTimeout(() => missCounter.style.transform = 'scale(1)', 150);

            updateMissMessageTip();
            checkSpecialMissReaction(state.missCount);
            
            state.treePoints += 1;
            safeSet('treePoints', String(state.treePoints));
            safeSet('tree_points', String(state.treePoints));
            updateTreeDashboard();

            // 实时上传想念次数与爱意树到云端
            fetch('/api/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    miss_count: String(state.missCount),
                    miss_last_date: state.missLastDate,
                    tree_points: String(state.treePoints)
                })
            }).catch(e => console.error("Cloud miss count sync failed:", e));
        });

        missReset.addEventListener('click', function() {
            if (confirm('确定要重置今天的想念次数吗？')) {
                state.missCount = 0;
                localStorage.setItem('missCount', 0);
                missCounter.textContent = 0;
                document.getElementById('miss-message').textContent = '点击下面的按钮，记录每次想我的瞬间';
                showToastMessage('💦 重置成功，让我们今天重新开始想念！');

                fetch('/api/config', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        miss_count: '0',
                        miss_last_date: state.missLastDate
                    })
                }).catch(e => console.error("Cloud miss count reset failed:", e));
            }
        });
    }

    function updateMissMessageTip() {
        const msg = document.getElementById('miss-message');
        const count = state.missCount;
        if (!msg) return;

        let message = '';
        if (count === 0) {
            message = '点击下面的按钮，记录每次想我的瞬间';
        } else if (count <= 3) {
            message = `才想了 ${count} 次？我猜你其实一直在想我！`;
        } else if (count <= 10) {
            message = `哇！已经想了 ${count} 次！你是不是满脑子都在转我的笑容？`;
        } else if (count <= 20) {
            message = `天啊！${count} 次了！你一定是超级想我啦！`;
        } else {
            message = `${count} 次！！！爱意溢出屏幕，我收到你的信号啦！`;
        }
        msg.textContent = message;
    }

    function checkSpecialMissReaction(count) {
        if (count % 30 === 0 && count > 0) {
            triggerSpecialCelebration(`🎉 第 ${count} 次想我！每一步都是爱你的小台阶！`);
        } else if (count === 520) {
            triggerSpecialCelebration('💖 520次！这是爱的专属密码，我也超级想你！');
        } else if (count === 1314) {
            triggerSpecialCelebration('💕 1314次！一生一世，拉钩约定永不变心！');
        }
    }

    function triggerSpecialCelebration(text) {
        showToastMessage(text);
        
        for (let i = 0; i < 30; i++) {
            setTimeout(() => {
                const h = document.createElement('div');
                h.className = 'click-heart';
                h.textContent = ['❤️', '💕', '💖', '💗', '💝', '✨'][Math.floor(Math.random() * 6)];
                h.style.left = Math.random() * 80 + 10 + 'vw';
                h.style.top = Math.random() * 80 + 10 + 'vh';
                h.style.fontSize = Math.random() * 15 + 16 + 'px';
                
                h.animate([
                    { transform: 'scale(0.2)', opacity: 0 },
                    { transform: 'scale(1.2) translateY(-30px)', opacity: 1 },
                    { transform: 'scale(0.5) translateY(-60px)', opacity: 0 }
                ], { duration: 1000, fill: 'forwards' });

                document.body.appendChild(h);
                setTimeout(() => h.remove(), 1200);
            }, i * 60);
        }
    }

    function showToastMessage(text) {
        const toast = document.getElementById('welcome-toast');
        if (toast) {
            toast.textContent = text;
            toast.classList.add('show');
            if (window.toastTimer) clearTimeout(window.toastTimer);
            window.toastTimer = setTimeout(() => {
                toast.classList.remove('show');
            }, 3500);
        }
    }

    /* ==========================================
       🌸 首页惊喜升级交互逻辑
       ========================================== */

    // 1. 浪漫信封开幕仪式
    function initOpeningCurtain() {
        const curtain = document.getElementById('opening-curtain');
        const envelope = document.querySelector('.opening-envelope-box');
        const openBtn = document.getElementById('open-envelope-btn');
        const bgMusic = document.getElementById('bg-music');
        const vinylPlayer = document.getElementById('vinyl-player');
        const equalizer = document.getElementById('audio-equalizer');

        if (!curtain || !envelope) return;



        function openEnvelope() {
            if (envelope.classList.contains('open')) return;
            envelope.classList.add('open');

            // 询问用户是否播放心动背景音乐
            setTimeout(() => {
                if (confirm("是否要开启小屋的心动背景音乐？🎵")) {
                    if (bgMusic) {
                        bgMusic.play().then(() => {
                            state.musicPlaying = true;
                            if (vinylPlayer) vinylPlayer.classList.add('playing');
                            if (equalizer) equalizer.classList.add('active');
                        }).catch(err => {
                            console.log("音频播放受阻:", err);
                        });
                    }
                }
            }, 800);

            // 1.8 秒后收起幕布并淡出
            setTimeout(() => {
                curtain.classList.add('opened');
                safeSetSession('小屋开幕已播放', 'true');
                
                // 延迟 1.2 秒后彻底从 DOM 树隐藏，释放性能
                setTimeout(() => {
                    curtain.style.display = 'none';
                    showToastMessage('珊珊宝贝，欢迎来到我们的时光小屋！mua~ ❤️');
                }, 1200);
            }, 1800);
        }

        if (openBtn) {
            openBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                openEnvelope();
            });
        }

        envelope.addEventListener('click', openEnvelope);
    }

    // 2. 鼠标/触屏粉心流光粒子
    function initHeartTrail() {
        const canvas = document.getElementById('heart-trail-canvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        let particles = [];

        function resizeCanvas() {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        }
        window.addEventListener('resize', resizeCanvas);
        resizeCanvas();

        class TrailHeart {
            constructor(x, y) {
                this.x = x;
                this.y = y;
                this.size = Math.random() * 8 + 6;
                this.opacity = 1;
                // 使用 HSL 给个高贵浪漫色彩渐变
                this.color = `hsla(${340 + Math.random() * 30}, 100%, 75%, 0.85)`;
                this.vx = (Math.random() - 0.5) * 1.5;
                this.vy = -(Math.random() * 1.2 + 0.6); // 缓慢升空
                this.rotation = Math.random() * Math.PI * 2;
                this.rotationSpeed = (Math.random() - 0.5) * 0.05;
                this.decay = Math.random() * 0.015 + 0.015;
            }

            update() {
                this.x += this.vx;
                this.y += this.vy;
                this.rotation += this.rotationSpeed;
                this.opacity -= this.decay;
                this.size -= 0.08;
            }

            draw() {
                if (this.opacity <= 0 || this.size <= 0) return;
                ctx.save();
                ctx.translate(this.x, this.y);
                ctx.rotate(this.rotation);
                ctx.globalAlpha = this.opacity;
                ctx.fillStyle = this.color;
                
                // 绘制精致的心形路径
                ctx.beginPath();
                const d = this.size;
                ctx.moveTo(0, d / 4);
                ctx.bezierCurveTo(d / 2, -d / 2, d * 1.2, d / 3, 0, d * 1.2);
                ctx.bezierCurveTo(-d * 1.2, d / 3, -d / 2, -d / 2, 0, d / 4);
                ctx.closePath();
                ctx.fill();
                ctx.restore();
            }
        }

        function addParticles(e) {
            let x, y;
            if (e.touches && e.touches.length > 0) {
                x = e.touches[0].clientX;
                y = e.touches[0].clientY;
            } else {
                x = e.clientX;
                y = e.clientY;
            }
            // 降低生成频次，避免粒子过多导致卡顿
            if (Math.random() < 0.35) {
                particles.push(new TrailHeart(x, y));
            }
        }

        window.addEventListener('mousemove', addParticles);
        window.addEventListener('touchmove', addParticles, { passive: true });

        function animate() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            for (let i = particles.length - 1; i >= 0; i--) {
                const p = particles[i];
                p.update();
                p.draw();
                if (p.opacity <= 0 || p.size <= 0) {
                    particles.splice(i, 1);
                }
            }
            requestAnimationFrame(animate);
        }
        animate();
    }

    // 3. 实时心跳状态卡片数据模拟与波动
    function initHeartbeatStatus() {
        const pulseRateEl = document.getElementById('pulse-rate');
        const quoteEl = document.getElementById('heartbeat-quote');
        const indicatorEl = document.querySelector('.pulse-indicator');
        const heartEl = document.querySelector('.heart-3d');
        if (!pulseRateEl) return;

        const quotes = [
            "“其实我每分每秒，都在以这个频率想念你。”",
            "“心率之所以在波动，是因为你在脑海里跳舞。”",
            "“每一声心跳，都是白珊珊名字的声波回响。”",
            "“想念白珊珊的时候，心跳就会稍微漏了一拍。”",
            "“兜兜转转，我的世界里依然全都是你。”",
            "“拉钩约定：我们这辈子都要一直走下去。”"
        ];

        // 动态心率跳动和数值刷新
        setInterval(() => {
            // 在 72 至 88 之间自然波动
            const baseRate = 72;
            const fluctuation = Math.floor(Math.random() * 16);
            const rate = baseRate + fluctuation;
            pulseRateEl.textContent = rate;

            // 波动频率越高，CSS心跳动画速度做相应变化
            const duration = (60 / rate).toFixed(2);
            if (heartEl) {
                heartEl.style.animationDuration = `${duration}s`;
            }

            // 偶尔更新甜言蜜语
            if (Math.random() < 0.2 && quoteEl) {
                const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
                quoteEl.style.opacity = 0;
                setTimeout(() => {
                    quoteEl.textContent = randomQuote;
                    quoteEl.style.opacity = 1;
                }, 300);
            }
        }, 3000);

        // 悬浮或点击心跳卡片，触发“心动加速”
        const statusCard = document.querySelector('.heartbeat-status-card');
        if (statusCard) {
            statusCard.addEventListener('mouseenter', () => {
                pulseRateEl.textContent = "125";
                if (heartEl) heartEl.style.animationDuration = '0.45s';
                if (indicatorEl) {
                    indicatorEl.textContent = "● 心动严重超速！";
                    indicatorEl.style.background = "rgba(255, 0, 0, 0.25)";
                    indicatorEl.style.color = "#ff2a55";
                }
            });

            statusCard.addEventListener('mouseleave', () => {
                if (indicatorEl) {
                    indicatorEl.textContent = "● 疯狂思念中";
                    indicatorEl.style.background = "rgba(255, 61, 104, 0.15)";
                    indicatorEl.style.color = "#ff3d68";
                }
            });
        }
    }

})();
