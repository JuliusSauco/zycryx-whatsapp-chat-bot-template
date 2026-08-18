import {createWalletAdjustmentPlugin} from './economy-wallet-adjustment.helpers.js';

export default createWalletAdjustmentPlugin({
    help: 'addlimit',
    commands: ['añadirdiamantes', 'dardiamantes', 'adddiamond', 'adddiamonds', 'addlimit'],
    resource: 'limite',
    direction: 1,
    operation: 'add_limit',
    successKey: 'economy.adminAdd.diamondsAdded',
});
