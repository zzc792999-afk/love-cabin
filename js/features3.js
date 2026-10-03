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

    // 初始化所有 3.0 简约功能
    function initFeatures() {
        createDynamicIsland();
        createVaultModal();
        createDigestModal();
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

    // 3. 远程心跳戳一戳动效
    function initHeartbeatPoke() {
        const hbBtn = document.getElementById('island-heartbeat-btn');
        if (!hbBtn) return;

        hbBtn.addEventListener('click', () => {
            // 触发全屏心跳涟漪与震动
            if (navigator.vibrate) {
                navigator.vibrate([100, 80, 150]);
            }

            // 创建屏幕中心大爱心跳动脉搏
            const overlay = document.createElement('div');
            overlay.className = 'heartbeat-fullscreen-overlay';
            overlay.innerHTML = `
                <div class="heartbeat-pulse-box">
                    <div class="pulse-ring ring-1"></div>
                    <div class="pulse-ring ring-2"></div>
                    <div class="pulse-heart">💖</div>
                    <div class="pulse-msg">正在将心跳与想念传送给对方...<br><span style="font-size:0.8rem; color:#ff758f;">咚！咚！咚！</span></div>
                </div>
            `;
            document.body.appendChild(overlay);

            setTimeout(() => {
                overlay.style.opacity = '0';
                setTimeout(() => overlay.remove(), 400);
            }, 1800);
        });
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

    // 页面启动执行
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initFeatures);
    } else {
        initFeatures();
    }
})();
