import path from 'path';
import fs from 'fs';
import { mapL2NetworkToArbitrumNetwork, registerCustomArbitrumNetwork } from '@arbitrum/sdk';

export const registerCustomNetwork = () => {
    const SCRIPT_L2L3_NETWORK = path.join(__dirname, "l2l3network.json");
    const dka_network = JSON.parse(fs.readFileSync(SCRIPT_L2L3_NETWORK).toString());
    const network = mapL2NetworkToArbitrumNetwork({...dka_network.l2Network});
    registerCustomArbitrumNetwork(network)
}