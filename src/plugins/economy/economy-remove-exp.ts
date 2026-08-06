import {createWalletAdjustmentPlugin} from './economy-wallet-adjustment.helpers.js';

export default createWalletAdjustmentPlugin({
    help: 'removexp',
    commands: ['removexp', 'quitarxp', 'sacarexp'],
    resource: 'exp',
    direction: -1,
    operation: 'remove_exp',
    successKey: 'economy.adminAdd.expRemoved',
});
