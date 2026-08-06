import {createWalletAdjustmentPlugin} from './economy-wallet-adjustment.helpers.js';

export default createWalletAdjustmentPlugin({
    help: 'removelimit',
    commands: ['removelimit', 'quitardiamantes', 'sacardiamantes'],
    resource: 'limite',
    direction: -1,
    operation: 'remove_limit',
    successKey: 'economy.adminAdd.diamondsRemoved',
});
