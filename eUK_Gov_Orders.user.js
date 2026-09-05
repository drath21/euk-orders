// Función para calcular la fecha/hora del último Martes a las 09:00 (Hora Española)
    function getLastTuesdayNineAM() {
        const now = new Date();
        // Convertir hora actual a la zona horaria de España (Europe/Madrid)
        const spainTimeString = now.toLocaleString("en-US", { timeZone: "Europe/Madrid" });
        const spainDate = new Date(spainTimeString);
        
        let target = new Date(spainDate);
        target.setHours(9, 0, 0, 0); // Fijar a las 09:00:00.000

        const currentDay = spainDate.getDay(); // 0: Dom, 1: Lun, 2: Mar, 3: Mié...
        
        // Calcular cuántos días restar para llegar al martes anterior
        let daysToSubtract = (currentDay >= 2) ? (currentDay - 2) : (currentDay + 5);
        
        // Si hoy es martes pero aún no son las 09:00, el ciclo empezó el martes pasado
        if (currentDay === 2 && spainDate.getHours() < 9) {
            daysToSubtract = 7;
        }

        target.setDate(target.getDate() - daysToSubtract);
        return target.getTime();
    }

    function renderAllOrders(enrichedOrders) {
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

        // LÓGICA DE CLAIM! REINICIADA CADA MARTES A LAS 09:00
        const lastClaimTime = GM_getValue('gow_last_claim_' + citizenId, 0);
        const lastTuesdayReset = getLastTuesdayNineAM();
        
        // Se puede reclamar si la última vez que reclamó fue ANTES del último martes a las 09:00
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

        // EVENTO DEL BOTÓN CLAIM
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

                const claimUrl = GOV_ORDERS_URL + "?action=claim&citizenId=" + citizenId + "&t=" + new Date().getTime();

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
