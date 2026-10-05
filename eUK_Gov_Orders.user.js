// ==UserScript==
// @name         eUK Gov Orders (Mobile Version)
// @version      1.7.0
// @description  Gov orders widget (Auto-hide ended battles & notify Sheet)
// @author       ZaraL assisted by Gemini
// @match        https://www.erepublik.com/*
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @grant        GM_setValue
// @grant        GM_getValue
// @connect      script.googleusercontent.com
// @connect      script.google.com
// @connect      www.erepublik.com
// ==/UserScript==

(function() {
    'use strict';

    const GOV_ORDERS_URL = "https://script.google.com/macros/s/AKfycbyCCcZALnzVeFDHvzi0KUsMpELkSOGW--gT3BEcHKrCEo5wSHfTJmAfNo8nqyFMBFE/exec";
    
    const UPDATE_INTERVAL_MS = 60 * 1000; 
    const EREP_CACHE_TIME_MS = 60 * 1000; 

    let lastERepFetchTime = 0;
    let cachedERepData = null;

    GM_addStyle(`
        #gov-orders-inline, #general-orders-inline { background: #242b27; color: #fff; font-family: Arial, sans-serif; border-radius: 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.4); overflow: hidden; font-size: 11px; margin: 10px 0; width: 100%; box-sizing: border-box; }
        #general-orders-inline { margin: 10px 0; border-left: 3px solid #fb7e3d; }
        .gow-header { background: #294b6a; padding: 6px 8px; font-weight: bold; display: flex; justify-content: space-between; align-items: center; font-size: 12px; text-transform: uppercase; border-bottom: 1px solid #1a3249; }
        .gow-header.clickable { cursor: pointer; }
        .gow-header.clickable:hover { background: #325b80; }
        .gow-toggle-btn { font-size: 10px; background: rgba(0,0,0,0.3); padding: 2px 6px; border-radius: 3px; color: #ccc; }
        .gow-container { max-height: none; overflow-y: visible; }
        .gow-container.minimized { display: none; }
        .gow-loading { padding: 12px; text-align: center; color: #aaa; font-style: italic; font-size: 11px; }
        .gow-order-card { padding: 8px; border-bottom: 1px solid #333; border-left: 3px solid transparent; }
        .gow-order-card:last-child { border-bottom: none; }
        .gow-prio-1 { border-left-color: #ff3b30; background: linear-gradient(90deg, rgba(255,59,48,0.2) 0%, rgba(36,43,39,0) 100%); }
        .gow-prio-2 { border-left-color: #ff9500; background: linear-gradient(90deg, rgba(255,149,0,0.2) 0%, rgba(36,43,39,0) 100%); }
        .gow-prio-3 { border-left-color: #ffcc00; background: linear-gradient(90deg, rgba(255,204,0,0.2) 0%, rgba(36,43,39,0) 100%); }
        .gow-badge { font-size: 8px; font-weight: bold; padding: 1px 3px; border-radius: 2px; margin-left: 4px; }
        .gow-badge-1 { background: #ff3b30; color: #fff; }
        .gow-badge-2 { background: #ff9500; color: #fff; }
        .gow-badge-3 { background: #ffcc00; color: #000; }
        .gow-main-layout { display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap; }
        .gow-col-left { display: flex; flex-direction: column; gap: 4px; flex: 1; min-width: 140px; }
        .gow-battle-line { display: flex; align-items: center; gap: 4px; flex-wrap: wrap; }
        .gow-battle { text-decoration: none; color: #83b70b; font-weight: bold; font-size: 12px; }
        .gow-battle:hover { color: #a4e015; }
        .gow-tiny-flags { display: flex; align-items: center; gap: 2px; }
        .gow-tiny-flags img { height: 10px; width: 14px; border: 1px solid #555; border-radius: 1px; object-fit: cover; }
        .gow-fight-for { display: flex; align-items: center; gap: 4px; font-weight: bold; color: #ccc; font-size: 10px; }
        .gow-flag-main { height: 14px; width: 20px; border: 1px solid #fb7e3d; border-radius: 1px; object-fit: cover; }
        .gow-col-center { flex: 1.5; min-width: 150px; background: #1a1a1a; padding: 5px 8px; border-left: 2px solid #83b70b; position: relative; font-size: 11px; border-radius: 2px; }
        .gow-close-inst { position: absolute; top: 1px; right: 3px; cursor: pointer; color: #888; font-weight: bold; font-size: 12px; padding: 2px; }
        .gow-close-inst:hover { color: #fff; }
        .gow-col-right { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; flex: 1; min-width: 130px; }
        .gow-divs { display: flex; gap: 4px; flex-wrap: wrap; justify-content: flex-end; }
        .gow-div { background: #444; padding: 1px 5px; border: 2px solid transparent; border-radius: 4px; color: #bbb; font-weight: bold; text-decoration: none; font-size: 11px; box-sizing: border-box; }
        .gow-div:hover { background: #666; color: #fff; }
        .gow-div.priority { background: #fb7e3d; color: #fff; }
        .gow-div-win { border-color: #5cbf0a; color: #fff; box-shadow: 0 0 3px #5cbf0a; }
        .gow-div-lose { border-color: #e2403d; color: #fff; box-shadow: 0 0 3px #e2403d; }
        .gow-killcash { background: #ff0055; color: white; padding: 2px 5px; border-radius: 3px; font-weight: bold; font-size: 9px; text-transform: uppercase; border: 1px solid #ffcc00; animation: superFlash 0.8s infinite alternate; box-shadow: 0 0 6px #ff0055; white-space: nowrap; }
        @keyframes superFlash { 0% { transform: scale(1); background: #ff0055; box-shadow: 0 0 3px #ff0055; } 100% { transform: scale(1.06); background: #ffcc00; color: #000; box-shadow: 0 0 10px #ffcc00; } }
    `);

    function isLoggedIn() {
        if (document.getElementById('login_form') || document.querySelector('input[name="commit_login"]')) return false;
        const citizenId = extractCitizenId();
        return citizenId !== "0" && citizenId !== 0 && citizenId !== null;
    }

    function isHomepage() {
        return window.location.pathname === '/en' || window.location.pathname === '/' || window.location.pathname === '/en/index';
    }

    function getFlagUrl(id) {
        return `https://static.erepublik.tools/assets/img/erepublik/country/${id}.gif`;
    }

    function extractCitizenId() {
        try {
            if (window.SERVER_DATA && window.SERVER_DATA.citizenId) return window.SERVER_DATA.citizenId;
            const profileLink = document.querySelector('a.user_avatar') || document.querySelector('a[href*="/citizen/profile/"]');
            if (profileLink && profileLink.href) {
                const match = profileLink.href.match(/\/profile\/(\d+)/);
                if (match) return match[1];
            }
        } catch(e) {}
        return "0";
    }

    function extractCitizenName() {
        try {
            if (window.SERVER_DATA && window.SERVER_DATA.name) return window.SERVER_DATA.name;
            const linkName = document.querySelector('.user_info a[href*="/citizen/profile/"]') || document.querySelector('.citizen_info a[href*="/citizen/profile/"]');
            if (linkName && linkName.textContent.trim() !== "") return linkName.textContent.trim();
            const avatar = document.querySelector('.user_avatar img') || document.querySelector('img.avatar');
            if (avatar && avatar.alt) return avatar.alt.trim();
        } catch(e) {}
        return "Unknown";
    }

    function extractCitizenCountry() {
        try {
            const hoverElement = document.querySelector('[title^="Citizen of "]');
            if (hoverElement) {
                const titleText = hoverElement.getAttribute('title');
                if (titleText) return titleText.replace('Citizen of ', '').trim();
            }
            const societyLink = document.querySelector('.user_info a[href*="/country/society/"], .user_section a[href*="/country/society/"]');
            if (societyLink && societyLink.href) {
                const urlParts = societyLink.href.split('/');
                const countrySlug = urlParts[urlParts.length - 1]; 
                return countrySlug.replace(/-/g, ' ').replace(/\?.*$/, '').trim();
            }
            if (window.SERVER_DATA && window.SERVER_DATA.citizenshipCountryId) return window.SERVER_DATA.citizenshipCountryId;
        } catch(e) {}
        return "";
    }

    function getOrCreateWidget() {
        let widget = document.getElementById('gov-orders-inline');
        if (widget) return widget;

        widget = document.createElement('div');
        widget.id = 'gov-orders-inline';

        if (window.location.href.includes('/military/battlefield')) {
            const pvp = document.getElementById('pvp') || document.querySelector('.paged_header');
            if (pvp && pvp.parentNode) {
                pvp.parentNode.insertBefore(widget, pvp);
                return widget;
            }
        }

        const challengeBanner = document.querySelector('#weekly_challenge, .weekly_challenge, #epic_challenge, .epic_challenge, div[id*="challenge"]');
        if (challengeBanner && challengeBanner.parentNode) {
            challengeBanner.parentNode.insertBefore(widget, challengeBanner.nextSibling);
            return widget;
        }

        const newsFeed = document.querySelector('.top_rated_articles') || document.querySelector('.news_feed') || document.getElementById('news');
        if (newsFeed && newsFeed.parentNode) {
            newsFeed.parentNode.insertBefore(widget, newsFeed);
            return widget;
        }

        const content = document.querySelector('.column.content') || document.getElementById('content') || document.querySelector('#main');
        if (content) {
            content.insertBefore(widget, content.firstChild);
            return widget;
        }

        document.body.insertBefore(widget, document.body.firstChild);
        return widget;
    }

    function setupGeneralOrders() {
        if (!isHomepage()) return;
        if (document.getElementById('general-orders-inline')) return;

        const generalWidgetHtml = `
            <div id="general-orders-inline">
                <div class="gow-header clickable" id="toggle-general-btn">
                    <span style="display: flex; align-items: center;">
                        📢 Gov Notices
                        <span id="notice-bell-badge" style="display:none; background: #e2403d; color: #fff; border-radius: 10px; padding: 1px 6px; font-size: 10px; margin-left: 8px; font-weight: bold; box-shadow: 0 0 4px #e2403d; animation: superFlash 0.8s infinite alternate;">
                            🔔 <span id="notice-count">0</span>
                        </span>
                    </span>
                    <span id="general-toggle-icon" class="gow-toggle-btn">[-] Hide</span>
                </div>
                <div class="gow-container" id="general-content-box" style="padding: 10px; background-color: #1a1a1a; color: #fff; font-size: 11px;">
                    <div id="general-notices-list">Loading notices...</div>
                </div>
            </div>
        `;

        function placeNoticeBox() {
            const existingWidget = document.getElementById('general-orders-inline');
            const dailyOrderBox = document.querySelector('.dailyOrderWrapper') || document.querySelector('.mu.dailyOrderWrapper');
            const citizenFeed = document.getElementById('citizenFeed') || document.querySelector('.column.feed');

            if (dailyOrderBox) {
                if (existingWidget) {
                    dailyOrderBox.parentNode.insertBefore(existingWidget, dailyOrderBox.nextSibling);
                } else {
                    dailyOrderBox.insertAdjacentHTML('afterend', generalWidgetHtml);
                }
                return true;
            } else if (citizenFeed) {
                if (!existingWidget) {
                    citizenFeed.insertAdjacentHTML('afterbegin', generalWidgetHtml);
                }
                return true;
            }
            return false;
        }

        const placed = placeNoticeBox();
        if (!placed || !document.querySelector('.dailyOrderWrapper')) {
            const citizenFeed = document.getElementById('citizenFeed') || document.body;
            const observer = new MutationObserver((mutations, obs) => {
                const muBox = document.querySelector('.dailyOrderWrapper');
                if (muBox) {
                    placeNoticeBox();
                    obs.disconnect();
                }
            });
            observer.observe(citizenFeed, { childList: true, subtree: true });
        }

        const now = Date.now();
        const noticeMinTime = GM_getValue('gow_notices_minimized_time', 0);
        let isNoticeMinimized = false;

        if (now - noticeMinTime < 5 * 60 * 1000) { 
            isNoticeMinimized = GM_getValue('gow_notices_minimized', false);
        } else {
            isNoticeMinimized = false;
            GM_setValue('gow_notices_minimized', false);
        }

        const contentBox = document.getElementById('general-content-box');
        const toggleIcon = document.getElementById('general-toggle-icon');
        if (isNoticeMinimized) {
            contentBox.classList.add('minimized');
            toggleIcon.textContent = '[+] Show';
        }

        const renderNotices = (data) => {
            const container = document.getElementById('general-notices-list');
            const badge = document.getElementById('notice-bell-badge');
            const countSpan = document.getElementById('notice-count');
            const box = document.getElementById('general-content-box');

            if (data && data.error) {
                container.innerHTML = `<span style="color:#e2403d;">🔒 ${data.error}</span>`;
                if (countSpan) countSpan.innerText = "0";
                if (badge) badge.style.display = 'none';
                return;
            }

            if (data && Array.isArray(data) && data.length > 0) {
                container.innerHTML = data.map(notice => {
                    let formattedNotice = notice
                        .replace(/\[b\](.*?)\[\/b\]/gi, '<b>$1</b>')
                        .replace(/\[i\](.*?)\[\/i\]/gi, '<i>$1</i>')
                        .replace(/\[u\](.*?)\[\/u\]/gi, '<u>$1</u>')
                        .replace(/\[color=(.*?)\](.*?)\[\/color\]/gi, '<span style="color:$1">$2</span>');
                    
                    return `<div style="margin-bottom: 6px; border-bottom: 1px dashed #333; padding-bottom: 4px;">• ${formattedNotice}</div>`;
                }).join('');

                if (countSpan) countSpan.innerText = data.length;
                if (badge && box && box.classList.contains('minimized')) {
                    badge.style.display = 'inline-block';
                }
            } else {
                container.innerHTML = "No active government notices at this moment.";
                if (countSpan) countSpan.innerText = "0";
                if (badge) badge.style.display = 'none';
            }
        };

        const cachedNotices = GM_getValue('gow_notices_data', null);
        const cachedTime = GM_getValue('gow_notices_time', 0);

        if (cachedNotices && (now - cachedTime < 10 * 60 * 1000)) {
            try {
                renderNotices(JSON.parse(cachedNotices));
            } catch(e) {}
        } else {
            const citizenId = extractCitizenId();
            const userCountry = extractCitizenCountry();
            const userName = extractCitizenName();
            const requestUrl = GOV_ORDERS_URL + "?action=get_general_notices&citizenId=" + citizenId + "&country=" + encodeURIComponent(userCountry) + "&name=" + encodeURIComponent(userName) + "&t=" + now;

            GM_xmlhttpRequest({
                method: "GET",
                url: requestUrl,
                onload: function(res) {
                    try {
                        const parsedData = JSON.parse(res.responseText);
                        if (!parsedData.error) {
                            GM_setValue('gow_notices_data', res.responseText);
                            GM_setValue('gow_notices_time', now);
                        }
                        renderNotices(parsedData);
                    } catch(e) {
                        document.getElementById('general-notices-list').innerHTML = "No active government notices.";
                    }
                },
                onerror: function() {
                    if (cachedNotices) renderNotices(JSON.parse(cachedNotices));
                    else document.getElementById('general-notices-list').innerHTML = "Failed to load notices.";
                }
            });
        }

        document.getElementById('toggle-general-btn').addEventListener('click', function() {
            const box = document.getElementById('general-content-box');
            const btn = document.getElementById('general-toggle-icon');
            const badge = document.getElementById('notice-bell-badge');
            const countElement = document.getElementById('notice-count');
            const count = countElement ? parseInt(countElement.innerText) : 0;
            
            const isMin = box.classList.toggle('minimized');
            btn.textContent = isMin ? '[+] Show' : '[-] Hide';
            
            GM_setValue('gow_notices_minimized', isMin);
            GM_setValue('gow_notices_minimized_time', Date.now());

            if (badge) {
                badge.style.display = (isMin && count > 0) ? 'inline-block' : 'none';
            }
        });
    }

    function buildOrderHtml(orderData, regionName, invId, defId, zoneIds, winningCountries) {
        let prioCardClass = "";
        let prioBadgeHtml = "";
        if (orderData.priorityLevel === 1) { 
            prioCardClass = "gow-prio-1"; 
            prioBadgeHtml = "<span class='gow-badge gow-badge-1'>PRIO 1</span>"; 
        } else if (orderData.priorityLevel === 2) { 
            prioCardClass = "gow-prio-2"; 
            prioBadgeHtml = "<span class='gow-badge gow-badge-2'>PRIO 2</span>"; 
        } else if (orderData.priorityLevel === 3) { 
            prioCardClass = "gow-prio-3"; 
            prioBadgeHtml = "<span class='gow-badge gow-badge-3'>PRIO 3</span>"; 
        }

        let divsHtml = '';
        [1, 2, 3, 4, 11].forEach(div => {
            const isPriority = orderData.priorityDivs && orderData.priorityDivs.includes(div);
            const prioClass = isPriority ? 'priority' : '';
            const divLabel = div === 11 ? 'Air' : `D${div}`;
            
            let statusClass = '';
            if (winningCountries && winningCountries[div] !== undefined && winningCountries[div] !== 0) {
                if (winningCountries[div] === orderData.countryId) {
                    statusClass = 'gow-div-win';
                } else {
                    statusClass = 'gow-div-lose';
                }
            }
            
            const realZoneId = (zoneIds && zoneIds[div]) ? zoneIds[div] : '';
            const targetUrl = realZoneId 
                ? `/en/military/battlefield/${orderData.battleId}/${realZoneId}` 
                : `/en/military/battlefield/${orderData.battleId}`;

            divsHtml += `<a href="${targetUrl}" class="gow-div ${prioClass} ${statusClass}">${divLabel}</a>`;
        });

        const killcashHtml = orderData.killcash ? `<span class="gow-killcash">🔥 💰 KILLCASH 💰 🔥</span>` : '';
        
        let tinyFlagsHtml = '';
        if (invId && defId) {
            tinyFlagsHtml = `
                <span class="gow-tiny-flags" title="Matchup">
                    <img src="${getFlagUrl(invId)}"> vs <img src="${getFlagUrl(defId)}">
                </span>`;
        }

        let instructionsHtml = '';
        if (orderData.instructions && orderData.instructions.trim() !== '') {
            const currentHash = btoa(unescape(encodeURIComponent(orderData.instructions))).substring(0, 15);
            const instKey = `dismissed_inst_${orderData.battleId}`;
            const dismissedHash = GM_getValue(instKey, '');
            
            if (currentHash !== dismissedHash) {
                instructionsHtml = `
                    <div class="gow-col-center" id="gow-inst-box-${orderData.battleId}">
                        <span class="gow-close-inst" data-hash="${currentHash}" data-key="${instKey}" data-target="gow-inst-box-${orderData.battleId}">✖</span>
                        <b>Orders:</b> ${orderData.instructions}
                    </div>`;
            }
        }

        return `
            <div class="gow-order-card ${prioCardClass}">
                <div class="gow-main-layout">
                    <div class="gow-col-left">
                        <div class="gow-battle-line">
                            <a href="/en/military/battlefield/${orderData.battleId}" class="gow-battle">
                                ${regionName}
                            </a>
                            ${tinyFlagsHtml}
                            ${prioBadgeHtml}
                        </div>
                        <div class="gow-fight-for">
                            Fight for: <img src="${getFlagUrl(orderData.countryId)}" class="gow-flag-main">
                        </div>
                    </div>
                    ${instructionsHtml}
                    <div class="gow-col-right">
                        ${killcashHtml}
                        <div class="gow-divs">${divsHtml}</div>
                    </div>
                </div>
            </div>
        `;
    }

    function renderAllOrders(enrichedOrders) {
        if (!isLoggedIn()) return;
        const widget = getOrCreateWidget();

        enrichedOrders.sort((a, b) => {
            let prioA = a.priorityLevel > 0 ? a.priorityLevel : 99;
            let prioB = b.priorityLevel > 0 ? b.priorityLevel : 99;
            return prioA - prioB;
        });

        let allOrdersHtml = enrichedOrders.map(o => 
            buildOrderHtml(o, o.regionName, o.invId, o.defId, o.zoneIds, o.winningCountries)
        ).join('');

        if (enrichedOrders.length === 0) {
            allOrdersHtml = `<div style="padding: 16px; text-align: center; color: #aaa; font-style: italic; font-size: 12px;">No active orders from the Government at this moment.</div>`;
        }

        const onHome = isHomepage();
        const now = Date.now();
        let isMinimized = false;

        if (onHome) {
            const homeMinTime = GM_getValue('gow_minimized_home_time', 0);
            if (now - homeMinTime < 30 * 60 * 1000) { 
                isMinimized = GM_getValue('gow_minimized_home', false);
            } else {
                isMinimized = false;
                GM_setValue('gow_minimized_home', false); 
            }
        } else {
            isMinimized = GM_getValue('gow_minimized', false);
        }

        const containerClass = isMinimized ? 'gow-container minimized' : 'gow-container';
        const toggleText = isMinimized ? '[+] Show' : '[-] Hide';

        widget.innerHTML = `
            <div class="gow-header clickable" id="gow-header-toggle">
                <div style="display:flex; align-items:center;"><span>eUK Gov Orders</span></div>
                <span class="gow-toggle-btn">${toggleText}</span>
            </div>
            <div class="${containerClass}" id="gow-content-box">
                ${allOrdersHtml}
            </div>
        `;

        setupGeneralOrders();

        const toggleHeader = document.getElementById('gow-header-toggle');
        if (toggleHeader) {
            toggleHeader.addEventListener('click', () => {
                const box = document.getElementById('gow-content-box');
                const btn = widget.querySelector('.gow-toggle-btn');
                const currentlyMin = box.classList.toggle('minimized');
                
                if (onHome) {
                    GM_setValue('gow_minimized_home', currentlyMin);
                    GM_setValue('gow_minimized_home_time', Date.now());
                } else {
                    GM_setValue('gow_minimized', currentlyMin);
                }
                
                if (btn) btn.textContent = currentlyMin ? '[+] Show' : '[-] Hide';
            });
        }
    }
    
function notifySheetBattlesEnded(battleIds) {
        if (!battleIds || battleIds.length === 0) return;
        
        // Pasamos los datos de seguridad para que el Sheet no bloquee la petición
        const citizenId = extractCitizenId();
        const userCountry = extractCitizenCountry();
        const userName = extractCitizenName(); 
        
        const requestUrl = GOV_ORDERS_URL + "?action=close_battles&ids=" + battleIds.join(',') + "&citizenId=" + citizenId + "&country=" + encodeURIComponent(userCountry) + "&name=" + encodeURIComponent(userName);
        
        GM_xmlhttpRequest({
            method: "GET",
            url: requestUrl
        });
    }

    function processBattleData(ordersArray, data) {
        let ghostBattleIds = [];
        let enrichedOrders = [];

        ordersArray.forEach(orderData => {
            // Si la batalla existe en eRepublik (está activa)
            if (data.battles && data.battles[orderData.battleId]) {
                const b = data.battles[orderData.battleId];
                let regionName = b.region.name;
                let invId = b.inv.id;
                let defId = b.def.id;
                let zoneIds = null;
                let winningCountries = {};
                
                if (b.div) {
                    let sortedDivs = Object.keys(b.div).sort((a, b) => parseInt(a) - parseInt(b));
                    zoneIds = { 1: sortedDivs[0], 2: sortedDivs[1], 3: sortedDivs[2], 4: sortedDivs[3], 11: sortedDivs[sortedDivs.length - 1] };
                    [1, 2, 3, 4, 11].forEach(d => {
                        if (zoneIds[d] && b.div[zoneIds[d]] && b.div[zoneIds[d]].wall) {
                            winningCountries[d] = parseInt(b.div[zoneIds[d]].wall.for);
                        }
                    });
                }
                // Añadir solo si está activa
                enrichedOrders.push({ ...orderData, regionName, invId, defId, zoneIds, winningCountries });
            } else {
                // Si la batalla ya NO existe (ha terminado)
                ghostBattleIds.push(orderData.battleId);
            }
        });

        // Guardar estado actual
        GM_setValue('gow_cached_enriched', JSON.stringify(enrichedOrders));
        renderAllOrders(enrichedOrders);

        // Avisar a Google Sheets de que hay batallas cerradas para que no vuelvan a aparecer
        if (ghostBattleIds.length > 0) {
            notifySheetBattlesEnded(ghostBattleIds);
        }
    }

    function checkBattleStatuses(ordersArray) {
        if (!isLoggedIn()) return;
        const now = Date.now();
        
        if (cachedERepData && (now - lastERepFetchTime < EREP_CACHE_TIME_MS)) {
            processBattleData(ordersArray, cachedERepData);
            return;
        }
        
        GM_xmlhttpRequest({
            method: "GET",
            url: "https://www.erepublik.com/en/military/campaignsJson/list",
            onload: function(res) {
                try {
                    cachedERepData = JSON.parse(res.responseText);
                    lastERepFetchTime = Date.now();
                    processBattleData(ordersArray, cachedERepData);
                } catch(e) {}
            }
        });
    }

    function syncOrders() {
        if (!isLoggedIn()) return;
        const citizenId = extractCitizenId();
        const userCountry = extractCitizenCountry();
        const userName = extractCitizenName(); 
        const requestUrl = GOV_ORDERS_URL + "?citizenId=" + citizenId + "&country=" + encodeURIComponent(userCountry) + "&name=" + encodeURIComponent(userName) + "&t=" + Date.now();

        GM_xmlhttpRequest({
            method: "GET",
            url: requestUrl,
            onload: function(response) {
                try {
                    const parsed = JSON.parse(response.responseText);
                    if (Array.isArray(parsed)) {
                        checkBattleStatuses(parsed);
                    }
                } catch (e) {}
            }
        });
    }

    function init() {
        if (!isLoggedIn()) {
            const existingWidget = document.getElementById('gov-orders-inline');
            if (existingWidget) existingWidget.remove();
            return;
        }

        const widget = getOrCreateWidget();
        const cachedData = GM_getValue('gow_cached_enriched', null);

        if (cachedData) {
            try { renderAllOrders(JSON.parse(cachedData)); } catch(e) {}
        } else {
            widget.innerHTML = `<div class="gow-header">eUK Gov Orders</div><div class="gow-loading">⏳ Loading official orders...</div>`;
        }

        setupGeneralOrders();
        syncOrders();
        
        setInterval(syncOrders, UPDATE_INTERVAL_MS);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
