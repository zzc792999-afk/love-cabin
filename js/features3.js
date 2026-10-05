/**
 * 💖 Love Cabin 3.0 - 灵动岛状态栏 · 远程心跳戳一戳 · 爱意小金库 · 恋爱月度画报
 */

(function () {
    // 默认数据
    const VAULT_KEY = 'love_cabin_vault_coins';
    const WISH_EXCHANGE_KEY = 'love_cabin_wish_orders';

    let coins = parseInt(localStorage.getItem(VAULT_KEY) || '880', 10);
    let currentMode = localStorage.getItem('love_cabin_view_mode') || '3d'; // '3d' or 'classic'

    // 心愿商店特权列表
    const WISH_LIST = [
        { id: 'dish', title: '🍽️ 臭臭全包洗碗券', cost: 150, desc: '今晚无论碗碟多少，臭臭一个人洗得干干净净！' },
        { id: 'boba', title: '🧋 全糖波波奶茶兑换卡', cost: 180, desc: '指名任何品牌奶茶，臭臭必须 30 分钟内送到面前！' },
        { id: 'massage', title: '💆 无条件捶肩揉腿 30 分钟', cost: 260, desc: '专属技师臭臭上线，手法专业，直到珊珊满意！' },
        { id: 'hotpot', title: '🥩 豪华海底捞/火锅大餐券', cost: 480, desc: '想吃哪家吃哪家，臭臭全包买单并全程贴心涮肉！' },
        { id: 'obey', title: '👑 女王无条件顺从 1 小时', cost: 660, desc: '在此时间内臭臭绝不顶嘴，指东绝不往西，无条件服从！' }
    ];

    // 初始化所有 3.0+ 升级功能
    function initFeatures() {
        createDynamicIsland();
        createVaultModal();
        createDigestModal();
        createLovePostcardModal();
        initHeartbeatPoke();

        if (window.Cabin3D) {
            setTimeout(() => window.Cabin3D.init(), 100);
        }
    }

    // 1. 创建顶部灵动岛胶囊状态栏 (极简、轻盈)
    function createDynamicIsland() {
        const slot = document.getElementById('dynamic-island-slot');
        const header = document.querySelector('header');
        if (!slot && !header) return;

        const island = document.createElement('div');
        island.className = 'dynamic-island';
        island.id = 'dynamic-island';
        island.innerHTML = `
            <div class="island-capsule">
                <!-- 在线状态 -->
                <div class="island-section status-sec">
                    <span class="online-dot"></span>
                    <span class="status-text"><span class="name-prefix">珊珊&臭臭 · </span>恋爱同频中</span>
                </div>

                <!-- 远程心跳戳一戳 -->
                <button class="island-section heartbeat-btn" id="island-heartbeat-btn" title="点击向对方传递心跳与想念">
                    <span class="heart-icon">💓</span>
                    <span class="hb-text">心跳触碰</span>
                </button>

                <!-- 爱意小金库 -->
                <button class="island-section vault-btn" id="island-vault-btn" title="查看珊珊的小金库与心愿特权商城">
                    <span>🪙</span>
                    <span id="island-coin-count">${coins}</span>
                </button>
            </div>
        `;

        if (slot) {
            slot.appendChild(island);
        } else {
            header.insertBefore(island, header.firstChild);
        }
    }

    // 2. Web Audio API 合成温暖舒缓心跳声
    function playHeartbeatSound() {
        try {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (!AudioCtx) return;
            if (!window.__catAudioCtx) window.__catAudioCtx = new AudioCtx();
            const ctx = window.__catAudioCtx;
            if (ctx.state === 'suspended') ctx.resume();

            const now = ctx.currentTime;
            [0, 0.22, 0.7, 0.92].forEach((offset, idx) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(idx % 2 === 0 ? 65 : 48, now + offset);
                osc.frequency.exponentialRampToValueAtTime(28, now + offset + 0.14);

                gain.gain.setValueAtTime(0.12, now + offset);
                gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.16);

                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(now + offset);
                osc.stop(now + offset + 0.17);
            });
        } catch (e) {
            console.warn("Heartbeat sound synthesis failed:", e);
        }
    }

    // 3. 远程心跳戳一戳动效与同频共振
    function triggerHeartbeatSync() {
        if (navigator.vibrate) {
            navigator.vibrate([100, 100, 200, 400, 100, 100, 200]);
        }
        playHeartbeatSound();

        const overlay = document.createElement('div');
        overlay.className = 'heartbeat-fullscreen-overlay';
        overlay.innerHTML = `
            <div class="heartbeat-pulse-box">
                <div class="pulse-ring ring-1"></div>
                <div class="pulse-ring ring-2"></div>
                <div class="pulse-heart">💓</div>
                <div class="pulse-msg" style="text-align:center; color:#fff; font-weight:800; text-shadow:0 2px 10px rgba(0,0,0,0.3); margin-top:16px;">
                    哲哲与珊珊的心跳已同频共振<br>
                    <span style="font-size:1.05rem; font-weight:900; color:#ffccd5; display:inline-block; margin:4px 0;">72 bpm · 满格爱意</span><br>
                    <span style="font-size:0.78rem; font-weight:normal; opacity:0.9;">「无论相隔多远，每一次心跳都在想念你」</span>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        if (typeof window.confetti === 'function') {
            window.confetti({ particleCount: 40, spread: 70, origin: { y: 0.55 }, colors: ['#ff477e', '#ff758c', '#ffccd5'] });
        }

        setTimeout(() => {
            overlay.style.opacity = '0';
            setTimeout(() => overlay.remove(), 400);
        }, 2200);
    }
    window.triggerHeartbeatSync = triggerHeartbeatSync;

    function initHeartbeatPoke() {
        const hbBtn = document.getElementById('island-heartbeat-btn');
        if (!hbBtn) return;
        hbBtn.addEventListener('click', triggerHeartbeatSync);
    }

    // 4. 爱意小金库与心愿兑换商店 Modal
    function createVaultModal() {
        const modal = document.createElement('div');
        modal.className = 'vault-modal-overlay';
        modal.id = 'vault-modal';
        modal.innerHTML = `
            <div class="vault-modal-card">
                <button class="vault-close-btn" id="vault-close-btn"><i class="fas fa-times"></i></button>
                <div class="vault-header">
                    <span class="vault-badge">珊珊专属小金库</span>
                    <h2 class="vault-title"><i class="fas fa-coins" style="color:#ffb703;"></i> 爱意小金库 & 心愿特权商城</h2>
                    <div class="vault-balance-box">
                        <span class="vault-label">当前可用爱意币：</span>
                        <span class="vault-amount" id="vault-modal-amount">${coins}</span>
                        <span class="vault-coin-icon">🪙</span>
                    </div>
                </div>

                <div class="wish-store-list">
                    <h4 style="margin: 12px 0 8px; color: var(--text-color); font-size: 0.95rem;">🎁 兑换专属男友特权卡：</h4>
                    ${WISH_LIST.map(item => `
                        <div class="wish-item-card">
                            <div class="wish-item-info">
                                <div class="wish-item-title">${item.title}</div>
                                <div class="wish-item-desc">${item.desc}</div>
                            </div>
                            <div class="wish-item-action">
                                <div class="wish-item-price">${item.cost} 币</div>
                                <button class="wish-buy-btn" data-id="${item.id}" data-cost="${item.cost}" data-title="${item.title}">
                                    立即兑换
                                </button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        // 绑定金库按钮点击
        const vaultBtn = document.getElementById('island-vault-btn');
        if (vaultBtn) {
            vaultBtn.addEventListener('click', () => {
                modal.classList.add('active');
            });
        }

        // 关闭
        document.getElementById('vault-close-btn').addEventListener('click', () => {
            modal.classList.remove('active');
        });
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.classList.remove('active');
        });

        // 兑换事件
        modal.querySelectorAll('.wish-buy-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const cost = parseInt(btn.dataset.cost, 10);
                const title = btn.dataset.title;

                if (coins < cost) {
                    alert(`⚠️ 爱意金币不足哦！当前拥有 ${coins} 币，需要 ${cost} 币。\n\n提示：去【暴揍出气筒】打臭臭、或者让臭臭送外卖都能赚取金币哦！`);
                    return;
                }

                coins -= cost;
                localStorage.setItem(VAULT_KEY, coins.toString());
                document.getElementById('vault-modal-amount').innerText = coins;
                document.getElementById('island-coin-count').innerText = coins;

                alert(`🎉 恭喜珊珊兑换成功！\n\n【${title}】已生成专属电子凭证！\n臭臭已收到指令，必须无条件履行！❤️`);
            });
        });
    }

    // 5. 智能恋爱月报 Modal
    function createDigestModal() {
        const modal = document.createElement('div');
        modal.className = 'digest-modal-overlay';
        modal.id = 'digest-modal';

        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1;

        modal.innerHTML = `
            <div class="digest-card">
                <button class="digest-close-btn" id="digest-close-btn"><i class="fas fa-times"></i></button>
                <div class="digest-badge">${year}年${month}月 · 甜蜜月报</div>
                <h3 class="digest-title">白珊珊 & 陈祖哲</h3>
                <p style="font-size:0.8rem; color:#8d99ae; margin-bottom:15px;">时光小屋专属大数据恋爱足迹统计</p>

                <div class="digest-grid">
                    <div class="digest-stat-box">
                        <div class="d-num">215 <span style="font-size:0.8rem;">天</span></div>
                        <div class="d-label">累计相恋天数</div>
                    </div>
                    <div class="digest-stat-box">
                        <div class="d-num">48 <span style="font-size:0.8rem;">次</span></div>
                        <div class="d-label">暴揍臭臭出气</div>
                    </div>
                    <div class="digest-stat-box">
                        <div class="d-num">16 <span style="font-size:0.8rem;">单</span></div>
                        <div class="d-label">外卖店专属点餐</div>
                    </div>
                    <div class="digest-stat-box">
                        <div class="d-num">100%</div>
                        <div class="d-label">恩爱默契指数</div>
                    </div>
                </div>

                <div class="digest-summary-box">
                    <strong>💌 月度评语：</strong><br>
                    “本月珊珊的仙女美貌值依旧满格！虽然臭臭偶尔惹宝贝生气被狠狠暴揍了 48 次，但跪地认错态度极其良好。下个月也要继续甜甜蜜蜜、岁岁年年！”
                </div>

                <button class="digest-save-btn" onclick="alert('📸 已生成高清月报图片，长按可保存分享给臭臭或发朋友圈秀恩爱！')">
                    <i class="fas fa-share-alt"></i> 保存恋爱月报画报
                </button>
            </div>
        `;
        document.body.appendChild(modal);

        document.getElementById('digest-close-btn').addEventListener('click', () => {
            modal.classList.remove('active');
        });
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.classList.remove('active');
        });

        // 暴露全局触发
        window.openLoveDigest = () => {
            const daysEl = document.getElementById('together-days-card') || document.getElementById('meet-days-card');
            const daysVal = daysEl ? daysEl.innerText.trim() : '260';
            const statDaysEl = modal.querySelector('.digest-stat-box .d-num');
            if (statDaysEl) {
                statDaysEl.innerHTML = `${daysVal} <span style="font-size:0.8rem;">天</span>`;
            }
            modal.classList.add('active');
        };
    }

    // 6. 💌 每日专属恋爱明信片 (平阳专属)
    const ROMANTIC_QUOTES = [
        "山河远阔，人间烟火，无一是你，无一不是你。最幸运的事，莫过于与珊珊重逢在每一个平凡的日子里。",
        "只要珊珊在身边，无论平阳是晴是雨，我的整个宇宙都是草莓味的晴空与浪漫。",
        "你是我初识时的心动，也是我历经风雨后最坚定的偏爱。这次牵起珊珊的手，就再也不会松开。",
        "想牵着珊珊的手，从平阳的晨光熹微，一直走到暮雪白头。一辈子都很长，但爱你总觉得不够。",
        "这世上有一万种浪漫，但哲哲的浪漫，全部都叫白珊珊。今天也超级超级爱你！",
        "春风吹十里，不如珊珊笑意盈盈。有你作伴的小窝，每一秒都是闪闪发光的奇迹。"
    ];

    function createLovePostcardModal() {
        const modal = document.createElement('div');
        modal.className = 'postcard-modal-overlay';
        modal.id = 'postcard-modal';

        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1;
        const day = now.getDate();
        const weekDays = ['日', '一', '二', '三', '四', '五', '六'];
        const weekDay = weekDays[now.getDay()];

        const meetDate = new Date('2024-05-03');
        const reunionDate = new Date('2026-01-18');
        const meetDays = Math.max(1, Math.floor((now - meetDate) / (1000 * 60 * 60 * 24)));
        const reunionDays = Math.max(1, Math.floor((now - reunionDate) / (1000 * 60 * 60 * 24)));

        let quoteIndex = Math.floor(Math.random() * ROMANTIC_QUOTES.length);

        modal.innerHTML = `
            <div class="postcard-card">
                <button class="postcard-close-btn" id="postcard-close-btn"><i class="fas fa-times"></i></button>
                <div class="postcard-top">
                    <div>
                        <div class="postcard-meta-title">
                            💌 今日恋爱明信片
                        </div>
                        <div class="postcard-date">${year}年${month}月${day}日 · 星期${weekDay}</div>
                    </div>
                    <div class="postcard-stamp" id="postcard-stamp" title="点击盖上专属心动纪念邮戳">
                        <span class="stamp-icon">💮</span>
                        <span class="stamp-text">520 平阳</span>
                    </div>
                </div>

                <div class="postcard-weather-pill" id="postcard-weather-tip">
                    <i class="fas fa-location-dot"></i> 平阳气候温和舒适 · 臭臭随时在珊珊身边保暖
                </div>

                <div style="display:flex; justify-content:space-between; margin-bottom:12px; font-size:0.8rem; color:var(--text-muted); background:rgba(255,117,151,0.06); padding:8px 12px; border-radius:12px;">
                    <span>🌱 初遇相爱：<strong style="color:#ff477e;">${meetDays}</strong> 天</span>
                    <span>💞 重新相伴：<strong style="color:#ff477e;">${reunionDays}</strong> 天</span>
                </div>

                <div class="postcard-quote-box" id="postcard-quote-text">
                    “${ROMANTIC_QUOTES[quoteIndex]}”
                </div>

                <div class="postcard-actions">
                    <button class="postcard-btn-sub" id="postcard-shuffle-btn">
                        <i class="fas fa-shuffle"></i> 换句情话
                    </button>
                    <button class="postcard-btn-main" id="postcard-heartbeat-btn">
                        <i class="fas fa-heart-pulse"></i> 发送心跳同频
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        // 关闭
        document.getElementById('postcard-close-btn').addEventListener('click', () => {
            modal.classList.remove('active');
        });
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.classList.remove('active');
        });

        // 换句情话
        document.getElementById('postcard-shuffle-btn').addEventListener('click', () => {
            quoteIndex = (quoteIndex + 1) % ROMANTIC_QUOTES.length;
            const quoteEl = document.getElementById('postcard-quote-text');
            if (quoteEl) {
                quoteEl.style.opacity = '0';
                setTimeout(() => {
                    quoteEl.innerText = `“${ROMANTIC_QUOTES[quoteIndex]}”`;
                    quoteEl.style.opacity = '1';
                }, 200);
            }
        });

        // 盖纪念邮戳
        const stampBtn = document.getElementById('postcard-stamp');
        if (stampBtn) {
            stampBtn.addEventListener('click', () => {
                if (typeof window.confetti === 'function') {
                    window.confetti({ particleCount: 40, spread: 60, origin: { y: 0.5 } });
                }
                stampBtn.style.transform = 'scale(1.2) rotate(-8deg)';
                stampBtn.style.borderColor = '#d90429';
                stampBtn.style.background = '#ffe5ec';
                stampBtn.querySelector('.stamp-text').innerText = '已认证❤️';
                setTimeout(() => {
                    stampBtn.style.transform = 'scale(1) rotate(0deg)';
                }, 300);
            });
        }

        // 发送同频心跳
        document.getElementById('postcard-heartbeat-btn').addEventListener('click', () => {
            modal.classList.remove('active');
            setTimeout(() => {
                if (window.triggerHeartbeatSync) window.triggerHeartbeatSync();
            }, 300);
        });

        // 全局打开函数
        window.openLovePostcard = () => {
            const tempEl = document.getElementById('cabin-weather-temp');
            const descEl = document.getElementById('cabin-weather-text');
            const tipEl = document.getElementById('postcard-weather-tip');
            if (tipEl && tempEl && descEl && tempEl.innerText !== '--°C') {
                tipEl.innerHTML = `<i class="fas fa-location-dot"></i> 平阳今日 ${tempEl.innerText} ${descEl.innerText} · 臭臭叮嘱珊珊穿暖暖的哦~ mua❤️`;
            }
            modal.classList.add('active');
        };
    }

    // 页面启动执行
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initFeatures);
    } else {
        initFeatures();
    }
})();
