import {defineSdkPlugin} from '../../core/plugin-sdk.js';
import {deactivateSecurity} from '../../services/store.service.js';

export default defineSdkPlugin({
    help: ['subscription security inactive', 'suscripcion seguridad inactiva'],
    tags: ['store'],
    feature: 'store',
    command: /^(subscription|subscriptions|suscripcion|suscripción|suscripciones)$/i,
    register: true,
    async execute(_m, {args, sdk}) {
        const values = args.map(value => value.toLowerCase());
        const validProduct = ['security', 'seguridad'].includes(values[0] ?? '');
        const validAction = ['inactive', 'inactivo', 'inactiva', 'cancel', 'cancelar', 'off'].includes(values[1] ?? '');
        if (!validProduct || !validAction) return sdk.reply.message('store.guide', {prefix: sdk.usedPrefix});
        const changed = await deactivateSecurity(sdk.sender);
        return sdk.reply.message(changed ? 'store.securityInactive' : 'store.securityAlreadyInactive');
    },
});
