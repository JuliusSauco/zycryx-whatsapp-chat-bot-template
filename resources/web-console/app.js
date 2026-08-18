(() => {
    'use strict';

    const state = {
        token: sessionStorage.getItem('cfs-console-token') || '',
        lastLogId: 0,
        timer: null,
        failures: 0,
        connected: false,
    };

    const elements = Object.fromEntries([
        'authPanel', 'authForm', 'tokenInput', 'authError', 'dashboard', 'logoutButton',
        'connectionBadge', 'mainStatus', 'mainStatusHint', 'lifecycleStatus', 'messageQueue',
        'messageQueueHint', 'uptime', 'databaseStatus', 'redisStatus', 'cacheStatus', 'subbotCount',
        'linkingHelp', 'linkPhase', 'linkForm', 'linkMethodFields', 'phoneField', 'botPhone',
        'linkError', 'startLinkButton', 'qrBox', 'qrImage', 'pairingCodeBox', 'pairingCode',
        'copyCodeButton', 'linkedAccount', 'linkedNumber',
        'consoleOutput', 'streamStatus', 'clearButton', 'operationStatus',
    ].map(id => [id, document.getElementById(id)]));
    const operationButtons = [...document.querySelectorAll('[data-operation]')];

    function authHeaders() {
        return {Authorization: `Bearer ${state.token}`};
    }

    async function api(path, options = {}) {
        const headers = {...authHeaders(), ...(options.body ? {'Content-Type': 'application/json'} : {})};
        const response = await fetch(path, {...options, headers, cache: 'no-store'});
        if (response.status === 401) throw new Error('unauthorized');
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.message || `HTTP ${response.status}`);
        return payload;
    }

    function setBadge(type, label) {
        elements.connectionBadge.className = `status-pill status-${type}`;
        elements.connectionBadge.innerHTML = '<span class="status-dot"></span>' + label;
    }

    function formatUptime(totalSeconds) {
        const seconds = Math.max(0, Math.floor(totalSeconds || 0));
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        if (days) return `${days}d ${hours}h`;
        if (hours) return `${hours}h ${minutes}m`;
        return `${minutes}m`;
    }

    function renderStatus(payload) {
        const metrics = payload.metrics;
        const connected = metrics.sessions.mainConnected;
        const manuallyStopped = payload.operations?.mainStopped === true;
        state.connected = connected;
        elements.mainStatus.textContent = connected ? 'Conectado' : manuallyStopped ? 'Detenido' : 'Sin vincular';
        elements.mainStatusHint.textContent = connected
            ? 'WhatsApp operativo'
            : manuallyStopped ? 'Sesión conservada; puedes iniciarlo de nuevo' : 'Configura tu sesión en Vinculación';
        elements.lifecycleStatus.textContent = metrics.lifecycle.phase;
        elements.messageQueue.textContent = String(metrics.messages.pending);
        elements.messageQueueHint.textContent = `${metrics.messages.pending} / ${metrics.messages.capacity} pendientes`;
        elements.uptime.textContent = formatUptime(payload.uptimeSeconds);
        elements.databaseStatus.textContent = payload.database === 'ok' ? 'Operativa' : 'No disponible';
        elements.redisStatus.textContent = metrics.redis?.ready
            ? 'Conectado'
            : metrics.redis?.configured ? 'Desconectado' : 'No configurado';
        elements.cacheStatus.textContent = metrics.cacheInvalidation.connected ? 'Conectada' : 'Desconectada';
        elements.subbotCount.textContent = String(metrics.sessions.subbotsConnected);
        renderLinking(payload.linking, connected, manuallyStopped);
        renderOperations(payload.operations);
        setBadge(
            connected ? 'online' : 'warning',
            connected ? 'WhatsApp conectado' : manuallyStopped ? 'Bot detenido · sesión conservada' : 'Esperando vinculación',
        );
    }

    function renderOperations(operations) {
        const running = operations?.phase === 'running';
        for (const button of operationButtons) button.disabled = running;
        if (!operations || operations.phase === 'idle') return;
        const type = operations.phase === 'error' ? 'danger' : operations.phase === 'success' ? 'success' : 'warning';
        let message = operations.message;
        if (operations.reset) {
            message += ` Eliminados: ${operations.reset.users} integrantes, ${operations.reset.groupSettings} configuraciones, ${operations.reset.chats} chats y ${operations.reset.chatMemories} memorias.`;
        }
        showOperationStatus(message, type);
    }

    function renderLinking(linking, connected, manuallyStopped = false) {
        const phaseLabels = {idle: 'Sin sesión', preparing: 'Preparando', awaiting: 'Esperando', connected: 'Conectado', error: 'Error'};
        elements.linkPhase.textContent = phaseLabels[linking.phase] || linking.phase;
        elements.linkingHelp.textContent = linking.message;
        elements.qrBox.classList.toggle('d-none', !linking.qrDataUrl || connected);
        if (linking.qrDataUrl && elements.qrImage.src !== linking.qrDataUrl) elements.qrImage.src = linking.qrDataUrl;
        elements.pairingCodeBox.classList.toggle('d-none', !linking.pairingCode || connected);
        elements.pairingCode.textContent = linking.pairingCode || '—';
        elements.linkedAccount.classList.toggle('d-none', !connected);
        elements.linkedNumber.textContent = linking.linkedNumber ? `+${linking.linkedNumber}` : 'Cuenta de WhatsApp conectada';

        const method = selectedLinkMethod();
        const busy = linking.phase === 'preparing' || manuallyStopped;
        elements.linkMethodFields.disabled = busy;
        elements.botPhone.disabled = busy;
        elements.startLinkButton.disabled = busy;
        elements.startLinkButton.textContent = manuallyStopped
            ? 'Sesión conservada · inicia el bot'
            : busy ? 'Preparando…'
            : connected
                ? `Cambiar sesión con ${method === 'qr' ? 'QR' : 'código'}`
                : `${linking.phase === 'awaiting' ? 'Generar nuevo' : 'Generar'} ${method === 'qr' ? 'QR' : 'código'}`;
    }

    function appendLogs(entries) {
        if (!entries.length) return;
        const nearBottom = elements.consoleOutput.scrollHeight - elements.consoleOutput.scrollTop - elements.consoleOutput.clientHeight < 100;
        const fragment = document.createDocumentFragment();
        for (const entry of entries) {
            const row = document.createElement('div');
            row.className = `log-entry log-${entry.level}`;

            const time = document.createElement('span');
            time.className = 'log-time';
            time.textContent = new Date(entry.timestamp).toLocaleTimeString([], {hour12: false});

            const level = document.createElement('span');
            level.className = 'log-level';
            level.textContent = entry.level.toUpperCase();

            const message = document.createElement('span');
            message.className = 'log-message';
            message.textContent = entry.message;

            row.append(time, level, message);
            fragment.appendChild(row);
            state.lastLogId = Math.max(state.lastLogId, entry.id);
        }
        elements.consoleOutput.appendChild(fragment);
        while (elements.consoleOutput.children.length > 500) elements.consoleOutput.firstElementChild.remove();
        if (nearBottom) elements.consoleOutput.scrollTop = elements.consoleOutput.scrollHeight;
    }

    async function refresh() {
        try {
            const [status, logs] = await Promise.all([
                api('/api/console/status'),
                api(`/api/console/logs?after=${state.lastLogId}`),
            ]);
            renderStatus(status);
            appendLogs(logs.entries);
            state.failures = 0;
            elements.streamStatus.textContent = 'En vivo · actualizado ahora';
        } catch (error) {
            state.failures += 1;
            if (error.message === 'unauthorized') return logout('El token no es válido o cambió.');
            elements.streamStatus.textContent = `Reconectando… (${state.failures})`;
            setBadge('error', 'Consola sin conexión');
        }
    }

    function showDashboard() {
        elements.authPanel.classList.add('d-none');
        elements.dashboard.classList.remove('d-none');
        elements.logoutButton.classList.remove('d-none');
        state.lastLogId = 0;
        void refresh();
        clearInterval(state.timer);
        state.timer = setInterval(refresh, 2000);
    }

    function logout(message = '') {
        clearInterval(state.timer);
        state.timer = null;
        state.token = '';
        state.lastLogId = 0;
        sessionStorage.removeItem('cfs-console-token');
        elements.dashboard.classList.add('d-none');
        elements.logoutButton.classList.add('d-none');
        elements.authPanel.classList.remove('d-none');
        elements.authError.textContent = message;
        elements.authError.classList.toggle('d-none', !message);
        elements.tokenInput.value = '';
        setBadge('neutral', 'Autenticación requerida');
    }

    elements.authForm.addEventListener('submit', async event => {
        event.preventDefault();
        state.token = elements.tokenInput.value.trim();
        elements.authError.classList.add('d-none');
        try {
            await api('/api/console/status');
            sessionStorage.setItem('cfs-console-token', state.token);
            showDashboard();
        } catch (error) {
            state.token = '';
            elements.authError.textContent = error.message === 'unauthorized'
                ? 'Token incorrecto.'
                : 'No fue posible conectar con la consola.';
            elements.authError.classList.remove('d-none');
        }
    });

    elements.logoutButton.addEventListener('click', () => logout());
    elements.clearButton.addEventListener('click', () => {
        elements.consoleOutput.replaceChildren();
    });
    for (const button of operationButtons) {
        button.addEventListener('click', async () => {
            const action = button.dataset.operation;
            const confirmation = button.dataset.confirmation;
            const destructive = action === 'clear-data' || action === 'delete-session';
            const warning = destructive
                ? 'Esta acción es irreversible.'
                : 'La conexión de WhatsApp se interrumpirá brevemente.';
            const entered = window.prompt(`${warning}\n\nEscribe exactamente ${confirmation} para continuar.`);
            if (entered === null) return;
            if (entered !== confirmation) {
                return showOperationStatus(`Confirmación incorrecta. Debes escribir ${confirmation}.`, 'danger');
            }
            for (const item of operationButtons) item.disabled = true;
            showOperationStatus('Ejecutando operación…', 'warning');
            try {
                const payload = await api(`/api/console/operations/${action}`, {
                    method: 'POST',
                    body: JSON.stringify({confirmation}),
                });
                const reset = payload.result.reset;
                const details = reset
                    ? ` Eliminados: ${reset.users} integrantes, ${reset.groupSettings} configuraciones, ${reset.chats} chats y ${reset.chatMemories} memorias.`
                    : '';
                showOperationStatus(payload.result.message + details, 'success');
                await refresh();
            } catch (error) {
                if (error.message === 'unauthorized') return logout('El token no es válido o cambió.');
                showOperationStatus(error.message || 'No fue posible completar la operación.', 'danger');
            } finally {
                for (const item of operationButtons) item.disabled = false;
            }
        });
    }
    elements.linkForm.addEventListener('change', event => {
        if (event.target.name !== 'linkMethod') return;
        updateMethodForm();
    });
    elements.linkForm.addEventListener('submit', async event => {
        event.preventDefault();
        const method = selectedLinkMethod();
        const phone = elements.botPhone.value.replace(/\D/g, '');
        elements.linkError.classList.add('d-none');
        if (method === 'code' && !/^\d{8,15}$/.test(phone)) {
            return showLinkError('Escribe un número internacional válido de 8 a 15 dígitos.');
        }
        const replaceSession = state.connected;
        if (replaceSession && !window.confirm('Esto cerrará la sesión de WhatsApp actual y la reemplazará. ¿Deseas continuar?')) return;
        elements.startLinkButton.disabled = true;
        elements.startLinkButton.textContent = 'Preparando…';
        try {
            const payload = await api('/api/console/link/start', {
                method: 'POST',
                body: JSON.stringify({method, phone: method === 'code' ? phone : null, replaceSession}),
            });
            renderLinking(payload.linking, false);
            await refresh();
        } catch (error) {
            if (error.message === 'unauthorized') return logout('El token no es válido o cambió.');
            showLinkError(error.message || 'No fue posible iniciar la vinculación.');
            elements.startLinkButton.disabled = false;
        }
    });
    elements.copyCodeButton.addEventListener('click', async () => {
        const code = elements.pairingCode.textContent.trim();
        if (!code || code === '—') return;
        try {
            await navigator.clipboard.writeText(code);
            elements.copyCodeButton.textContent = 'Copiado';
        } catch {
            elements.copyCodeButton.textContent = 'Selecciona el código';
        }
        setTimeout(() => { elements.copyCodeButton.textContent = 'Copiar'; }, 1500);
    });
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden && state.token) void refresh();
    });

    function selectedLinkMethod() {
        return elements.linkForm.querySelector('input[name="linkMethod"]:checked')?.value || 'qr';
    }

    function updateMethodForm() {
        const code = selectedLinkMethod() === 'code';
        elements.phoneField.classList.toggle('d-none', !code);
        elements.botPhone.required = code;
        elements.startLinkButton.textContent = `${state.connected ? 'Cambiar sesión con' : 'Generar'} ${code ? 'código' : 'QR'}`;
    }

    function showLinkError(message) {
        elements.linkError.textContent = message;
        elements.linkError.classList.remove('d-none');
    }

    function showOperationStatus(message, type) {
        elements.operationStatus.className = `operation-status operation-status-${type} mb-3`;
        elements.operationStatus.textContent = message;
    }

    updateMethodForm();
    if (state.token) showDashboard();
})();
