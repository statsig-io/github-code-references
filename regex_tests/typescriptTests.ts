import statsig from 'statsig-node';
import Utils from '../src/utils/Utils'

async function useDummyGates() {
    // Put a gate here so we can search for it later

    const dummyUser = {
        userID: '12345',
        email: '12345@gmail.com',
    };

    const dummyGate = await statsig.checkGate(dummyUser, 'dummy_gate');
    const sillyGate = false;
    const typescriptDC = await statsig.getConfig(dummyUser, 'typescript_dynamic_config');
}