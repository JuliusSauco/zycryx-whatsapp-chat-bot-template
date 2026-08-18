import {createWalletAdjustmentPlugin} from './economy-wallet-adjustment.helpers.js';

export default createWalletAdjustmentPlugin({
    help: 'addexp',
    commands: ['añadirxp', 'addexp', 'addxp'],
    resource: 'exp',
    direction: 1,
    operation: 'add_exp',
    successKey: 'economy.adminAdd.expAdded',
});
