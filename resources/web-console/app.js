(() => {
    'use strict';

    const state = {
        token: sessionStorage.getItem('cfs-console-token') || '',
        lastLogId: 0,
        timer: null,
        failures: 0,
    };

    const elements = Object.fromEntries([
        'authPanel', 'authForm', 'tokenInput', 'authError', 'dashboard', 'logoutButton',
        'connectionBadge', 'mainStatus', 'mainStatusHint', 'lifecycleStatus', 'messageQueue',
        'messageQueueHint', 'uptime', 'databaseStatus', 'cacheStatus', 'subbotCount',
        'linkingHelp', 'pairingCodeBox', 'pairingCode', 'copyCodeButton',
        'consoleOutput', 'streamStatus', 'clearButton',
    ].map(id => [id, document.getElementById(id)]));

    function authHeaders() {
        return {Authorization: `Bearer ${state.token}`};
    }

    async function api(path) {
        const response = await fetch(path, {headers: authHeaders(), cache: 'no-store'});
        if (response.status === 401) throw new Error('unauthorized');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
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
        elements.mainStatus.textContent = connected ? 'Conectado' : 'Sin vincular';
        elements.mainStatusHint.textContent = connected ? 'WhatsApp operativo' : 'Revisa el código en la consola';
        elements.lifecycleStatus.textContent = metrics.lifecycle.phase;
        elements.messageQueue.textContent = String(metrics.messages.pending);
        elements.messageQueueHint.textContent = `${metrics.messages.pending} / ${metrics.messages.capacity} pendientes`;
        elements.uptime.textContent = formatUptime(payload.uptimeSeconds);
        elements.databaseStatus.textContent = payload.database === 'ok' ? 'Operativa' : 'No disponible';
        elements.cacheStatus.textContent = metrics.cacheInvalidation.connected ? 'Conectada' : 'Desconectada';
        elements.subbotCount.textContent = String(metrics.sessions.subbotsConnected);
        elements.linkingHelp.textContent = connected
            ? 'La sesión principal está vinculada y persistida en PostgreSQL.'
            : 'Usa el código de emparejamiento visible en la consola. Se renueva automáticamente si expira.';
        if (connected) elements.pairingCodeBox.classList.add('d-none');
        setBadge(connected ? 'online' : payload.ready ? 'warning' : 'warning', connected ? 'WhatsApp conectado' : 'Esperando vinculación');
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

            const pairingMatch = entry.message.match(/Código de emparejamiento:\s*([A-Z0-9-]{6,})/i);
            if (pairingMatch) {
                elements.pairingCode.textContent = pairingMatch[1];
                elements.pairingCodeBox.classList.remove('d-none');
            }

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

    if (state.token) showDashboard();
})();
