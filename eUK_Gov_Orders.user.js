// ==UserScript==
// @name         eUK Gov Orders (Mobile Version)
// @version      1.3.0
// @description  Gov orders widget - Live Division Tracking, Instant loading & DOM Citizen ID logging
// @author       ZaraL
// @match        https://www.erepublik.com/*
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @grant        GM_setValue
// @grant        GM_getValue
// @connect      script.googleusercontent.com
// @connect      script.google.com
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
        
        /* Ajustes de botones para acomodar los bordes dinámicos */
        .gow-div { background: #444; padding: 1px 5px; border: 2px solid transparent; border-radius: 4px; color: #bbb; font-weight: bold; text-decoration: none; font-size: 11px; box-sizing: border-box; }
        .gow-div:hover { background: #666; color: #fff; }
        .gow-div.priority { background: #fb7e3d; color: #fff; }
        
        /* Colores de victoria y derrota por división */
        .gow-div-win { border-color: #5cbf0a; color: #fff; box-shadow: 0 0 3px #5cbf0a; }
        .gow-div-lose { border-color: #e2403d; color: #fff; box-shadow: 0 0 3px #e2403d; }
        
        .gow-killcash { background: #ff0055; color: white; padding: 2px 5px; border-radius: 3px; font-weight: bold; font-size: 9px; text-transform: uppercase; border: 1px solid #ffcc00; animation: superFlash 0.8s infinite alternate; box-shadow: 0 0 6px #ff0055; white-space: nowrap; }
        @keyframes superFlash { 
            0% { transform: scale(1); background: #ff0055; box-shadow: 0 0 3px #ff0055; } 
            100% { transform: scale(1.06); background: #ffcc00; color: #000; box-shadow: 0 0 10px #ffcc00; } 
        }
    `);

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
            
            // Lógica de colores (Tracker)
            let statusClass = '';
            if (!isGhost && winningCountries && winningCountries[div] !== undefined && winningCountries[div] !== 0) {
                if (winningCountries[div] === orderData.countryId) {
                    statusClass = 'gow-div-win'; // Verde
                } else {
                    statusClass = 'gow-div-lose'; // Rojo
                }
            }
            
            const realZoneId = (zoneIds && zoneIds[div]) ? zoneIds[div] : '';
            const targetUrl = realZoneId 
                ? `/en/military/battlefield/${orderData.battleId}/${realZoneId}` 
                : `/en/military/battlefield/${orderData.battleId}`;

            divsHtml += `<a href="${targetUrl}" class="gow-div ${prioClass} ${statusClass}">${divLabel}</a>`;
        });

        const killcash
