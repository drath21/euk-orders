// ==UserScript==
// @name         eUK Gov Orders (Mobile Version)
// @version      1.4.5
// @description  Gov orders widget - Live Tracking, Weekly Tuesday Claim, Bulletproof Country Fetch & ID logging
// @author       ZaraL
// @match        https://www.erepublik.com/*
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @grant        GM_setValue
// @grant        GM_getValue
// @connect      script.googleusercontent.com
// @connect      script.google.com
// @connect      www.erepublik.com
// @downloadURL  https://github.com/drath21/euk-orders/raw/refs/heads/main/eUK_Gov_Orders.user.js
// @updateURL    https://github.com/drath21/euk-orders/raw/refs/heads/main/eUK_Gov_Orders.user.js
// ==/UserScript==

(function() {
    'use strict';

    const GOV_ORDERS_URL = "https://script.google.com/macros/s/AKfycbyCCcZALnzVeFDHvzi0KUsMpELkSOGW--gT3BEcHKrCEo5wSHfTJmAfNo8nqyFMBFE/exec";
    const UPDATE_INTERVAL_MS = 5 * 60 * 1000;

    GM_addStyle(`
        #gov-orders-inline { background: #242b27; color: #fff; font-family: Arial, sans-serif; border-radius: 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.4); overflow: hidden; font-size: 11px; margin: 4px 0; width: 100%; box-sizing: border-box; }
        .gow-header { background: #294b6a; padding: 6px 8px; font-weight: bold; display: flex; justify-content: space-between; align-items: center; font-size: 12px; text-transform: uppercase; border-bottom: 1px solid #1a3249; }
        .gow-header.clickable { cursor: pointer; }
        .gow-header.clickable:hover { background: #325b80; }
        .gow-toggle-btn { font-size: 10px; background: rgba(0,0,0,0.3); padding: 2px 6px; border-radius: 3px; color: #ccc; }
        .gow-container { max-height: none; overflow-y: visible; }
        .gow-container.minimized { display: none; }
        
        .gow-claim-btn { background: #fb7e3d; color: white; border: none; padding: 3px 8px; border-radius: 3px; font-weight: bold; cursor: pointer; font-size: 10px; box-shadow: 0 0 4px #fb7e3d; text-transform: uppercase; margin-left: 10px; transition: 0.2s; }
        .gow-claim-btn:hover { background: #ff955c; }
        .gow-claim-btn:disabled { background: #555; color: #999; cursor: not-allowed; box-shadow: none; border: 1px solid #444; }

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
        .gow-ghost { filter: grayscale(100%); opacity: 0.5; }
        
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
        @keyframes superFlash { 
            0% { transform: scale(1); background: #ff0055; box-shadow: 0 0 3px #ff0055; } 
            100% { transform: scale(1.06); background: #ffcc00; color: #000; box-shadow: 0 0 10px #ffcc00; } 
        }
    `);

    function isLoggedIn() {
        if (document.getElementById('login_form') || document.querySelector('input[name="commit_login"]')) {
            return false;
        }
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
            if (window.SERVER_DATA && window.SERVER_DATA.citizenId) {
                return window.SERVER_DATA.citizenId;
            }
            const profileLink = document.querySelector('a.user_avatar') || document.querySelector('a[href*="/citizen/profile/"]');
            if (profileLink && profileLink.href) {
                const match = profileLink.href.match(/\/profile\/(\d+)/);
                if (match) return match[1];
            }
        } catch(e) {}
        return "0";
    }

    // MÉTODO INFALIBLE: Le pide al propio eRepublik tu JSON privado usando tu sesión
    function getCitizenCountry(citizenId, callback) {
        // 1. Variable nativa (rápido)
        if (window.SERVER_DATA && window.SERVER_DATA.citizenshipCountryId) {
            return callback(window.SERVER_DATA.citizenshipCountryId);
        }

        // 2. Si falla, hace una petición al JSON del perfil (Infalible)
        fetch('/en/main/citizen-profile-json/' + citizenId)
            .then(res => res.json())
            .then(data => {
                if (data && data.citizenship && data.citizenship.countryId) {
                    callback(data.citizenship.countryId);
                } else {
                    callback(""); // Fallo de seguridad interno del juego
                }
            })
            .catch(() => callback(""));
    }

    function getLastTuesdayNineAM() {
        const now = new Date();
        const spainTimeString = now.toLocaleString("en-US", { timeZone: "Europe/Madrid" });
        const spainDate = new Date(spainTimeString);
        
        let target = new Date(spainDate);
        target.setHours(9, 0, 0, 0);

        const currentDay = spainDate.getDay();
        let daysToSubtract = (currentDay >= 2) ? (currentDay - 2) : (currentDay + 5);
        
        if (currentDay === 2 && spainDate.getHours() < 9) {
            daysToSubtract = 7;
        }

        target.setDate(target.getDate() - daysToSubtract);
        return target.getTime();
    }

    function getOrCreateWidget() {
        let widget = document.getElementById('gov-orders-inline');
        if (!widget) {
            widget = document.createElement('div');
            widget.id = 'gov-orders-inline';
            
            let insertionPoint = null;
            if (window.location.href.includes('/military/battlefield')) {
                insertionPoint = document.getElementById('pvp') || document.querySelector('.paged_header');
                if (insertionPoint && insertionPoint.parentNode) {
                    insertionPoint.parentNode.insertBefore(widget, insertionPoint);
                    return widget;
                }
            }
            
            insertionPoint = document.getElementById('weekly_challenge') || document.querySelector('.weekly_challenge');
            if (!insertionPoint) {
                insertionPoint = document.querySelector('.column.content') || document.getElementById('content');
                if (insertionPoint) {
                    insertionPoint.insertBefore(widget, insertionPoint.firstChild);
                    return widget;
                }
            }

            if (insertionPoint && insertionPoint.parentNode) {
                insertionPoint.parentNode.insertBefore(widget, insertionPoint.nextSibling);
            } else {
                document.body.appendChild(widget);
            }
        }
        return widget;
    }

    function buildOrderHtml(orderData, isGhost, regionName, invId, defId, zoneIds, winningCountries) {
        const ghostClass = isGhost ? 'gow-ghost' : '';
        const statusText = isGhost ? '<span style="color:#e2403d; font-size:10px; margin-left: 3px;">(ENDED)</span>' : '';
        
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
            if (!isGhost && winningCountries && winningCountries[div] !== undefined && winningCountries[div] !== 0) {
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
            <div class="gow-order-card ${ghostClass} ${prioCardClass}">
                <div class="gow-main-layout">
                    <div class="gow-col-left">
                        <div class="gow-battle-line">
                            <a href="/en/military/battlefield/${orderData.battleId}" class="gow-battle">
                                ${regionName} ${statusText}
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
        const citizenId = extractCitizenId();

        enrichedOrders.sort((a, b) => {
            let prioA = a.priorityLevel > 0 ? a.priorityLevel : 99;
            let prioB = b.priorityLevel > 0 ? b.priorityLevel : 99;
            return prioA - prioB;
        });

        let allOrdersHtml = enrichedOrders.map(o => 
            buildOrderHtml(o, o.isGhost, o.regionName, o.invId, o.defId, o.zoneIds, o.winningCountries)
        ).join('');

        if (enrichedOrders.length === 0) {
            allOrdersHtml = `<div style="padding: 16px; text-align: center; color: #aaa; font-style: italic; font-size: 12px;">No active orders from the Government at this moment.</div>`;
        }

        const lastClaimTime = GM_getValue('gow_last_claim_' + citizenId, 0);
        const lastTuesdayReset = getLastTuesdayNineAM();
        const canClaim = lastClaimTime < lastTuesdayReset;
        
        let claimBtnHtml = canClaim
            ? `<button id="gow-btn-claim" class="gow-claim-btn" title="Claim your weekly reward">CLAIM!</button>`
            : `<button id="gow-btn-claim" class="gow-claim-btn" disabled title="Already claimed for this week. Resets Tuesday at 09:00 CET">CLAIMED</button>`;

        const onHome = isHomepage();
        const isMinimized = GM_getValue('gow_minimized', false);
        const shouldHide = !onHome && isMinimized;
        const containerClass = shouldHide ? 'gow-container minimized' : 'gow-container';
        
        let headerHtml = `<div style="display:flex; align-items:center;"><span>eUK Gov Orders</span> ${claimBtnHtml}</div>`;
        if (!onHome) {
            const toggleText = shouldHide ? '[+] Show' : '[-] Hide';
            headerHtml += `<span class="gow-toggle-btn">${toggleText}</span>`;
        }

        widget.innerHTML = `
            <div class="gow-header ${!onHome ? 'clickable' : ''}" id="gow-header-toggle">
                ${headerHtml}
            </div>
            <div class="${containerClass}" id="gow-content-box">
                ${allOrdersHtml}
            </div>
        `;

        if (!onHome) {
            const toggleHeader = document.getElementById('gow-header-toggle');
            if (toggleHeader) {
                toggleHeader.addEventListener('click', (e) => {
                    if(e.target.id === 'gow-btn-claim') return;
                    
                    const box = document.getElementById('gow-content-box');
                    const btn = widget.querySelector('.gow-toggle-btn');
                    const currentlyMin = box.classList.toggle('minimized');
                    
                    GM_setValue('gow_minimized', currentlyMin);
                    if (btn) btn.textContent = currentlyMin ? '[+] Show' : '[-] Hide';
                });
            }
        }

        const claimBtn = document.getElementById('gow-btn-claim');
        if (claimBtn) {
            claimBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (!canClaim) {
                    alert('Already Claimed! Resets every Tuesday at 09:00 Spanish local time.');
                    return;
                }
                
                claimBtn.textContent = "WAIT...";
                claimBtn.disabled = true;

                getCitizenCountry(citizenId, function(userCountry) {
                    const claimUrl = GOV_ORDERS_URL + "?action=claim&citizenId=" + citizenId + "&country=" + userCountry + "&t=" + new Date().getTime();

                    GM_xmlhttpRequest({
                        method: "GET",
                        url: claimUrl,
                        onload: function(res) {
                            try {
                                const response = JSON.parse(res.responseText);
                                if (response.success) {
                                    GM_setValue('gow_last_claim_' + citizenId, new Date().getTime());
                                    claimBtn.textContent = "CLAIMED";
                                    alert('Success! Your claim has been registered in the Government log.');
                                } else {
                                    throw new Error("Invalid response");
                                }
                            } catch(err) {
                                claimBtn.textContent = "CLAIM!";
                                claimBtn.disabled = false;
                                alert('Oops! Could not connect to the Google Sheet. Please try again later.');
                            }
                        }
                    });
                });
            });
        }

        document.querySelectorAll('.gow-close-inst').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const targetId = e.target.getAttribute('data-target');
                const key = e.target.getAttribute('data-key');
                const hash = e.target.getAttribute('data-hash');
                
                GM_setValue(key, hash);
                const box = document.getElementById(targetId);
                if (box) box.style.display = 'none';
            });
        });
    }

    function checkBattleStatuses(ordersArray) {
        if (!isLoggedIn()) return;

        GM_xmlhttpRequest({
            method: "GET",
            url: "https://www.erepublik.com/en/military/campaignsJson/list",
            onload: function(res) {
                try {
                    const data = JSON.parse(res.responseText);
                    const enrichedOrders = ordersArray.map(orderData => {
                        let isGhost = true;
                        let regionName = `Battle #${orderData.battleId}`;
                        let invId = 0, defId = 0, zoneIds = null, winningCountries = {};

                        if (data.battles && data.battles[orderData.battleId]) {
                            isGhost = false;
                            const b = data.battles[orderData.battleId];
                            regionName = b.region.name;
                            invId = b.inv.id;
                            defId = b.def.id;
                            
                            if (b.div) {
                                let sortedDivs = Object.keys(b.div).sort((a, b) => parseInt(a) - parseInt(b));
                                zoneIds = {
                                    1: sortedDivs[0], 2: sortedDivs[1], 3: sortedDivs[2], 4: sortedDivs[3], 11: sortedDivs[sortedDivs.length - 1]
                                };
                                
                                [1, 2, 3, 4, 11].forEach(d => {
                                    if (zoneIds[d] && b.div[zoneIds[d]] && b.div[zoneIds[d]].wall) {
                                        winningCountries[d] = parseInt(b.div[zoneIds[d]].wall.for);
                                    }
                                });
                            }
                        }
                        return { ...orderData, isGhost, regionName, invId, defId, zoneIds, winningCountries };
                    });
                    
                    GM_setValue('gow_cached_enriched', JSON.stringify(enrichedOrders));
                    renderAllOrders(enrichedOrders);
                } catch(e) {
                    console.error('[GovOrders] Error parsing campaigns JSON:', e);
                }
            }
        });
    }

    function syncOrders() {
        if (!isLoggedIn()) return;
        const citizenId = extractCitizenId();

        // 1. Extraer el país de forma infalible ANTES de contactar con Google
        getCitizenCountry(citizenId, function(userCountry) {
            const requestUrl = GOV_ORDERS_URL + "?citizenId=" + citizenId + "&country=" + userCountry + "&t=" + new Date().getTime();

            GM_xmlhttpRequest({
                method: "GET",
                url: requestUrl,
                onload: function(response) {
                    try {
                        const ordersArray = JSON.parse(response.responseText);
                        if (Array.isArray(ordersArray)) {
                            checkBattleStatuses(ordersArray);
                        } else if (response.responseText.includes("Access Denied")) {
                            const widget = document.getElementById('gov-orders-inline');
                            if (widget) widget.innerHTML = `<div class="gow-header">eUK Gov Orders</div><div style="padding:12px; text-align:center; color:#e2403d;">⛔ Access Denied: Unauthorized Country or ID</div>`;
                        }
                    } catch (e) {
                        console.error('[GovOrders] Failed to parse JSON orders:', e);
                    }
                }
            });
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
            try {
                renderAllOrders(JSON.parse(cachedData));
            } catch(e) {}
        } else {
            widget.innerHTML = `
                <div class="gow-header">eUK Gov Orders</div>
                <div class="gow-loading">⏳ Loading official orders...</div>
            `;
        }

        syncOrders();
        setInterval(syncOrders, UPDATE_INTERVAL_MS);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
