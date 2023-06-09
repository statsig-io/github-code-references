import statsig from 'statsig-node';
import Utils from '../src/Utils'

async function useDummyGates() {
    // Put a gate here so we can search for it later

    const dummyUser = {
        userID: '12345',
        email: '12345@gmail.com',
    };

    const dummyGate = await statsig.checkGate(dummyUser, 'dummy_gate');
    const sillyGate = await statsig.checkGate(dummyUser, 'silly_gate');
    const hmm = await statsig.checkGate(dummyUser, 'dummy_gate');
    const uhh = await statsig.checkGate(dummyUser, 'silly_gate');

    const typescriptDC = await statsig.getConfig(dummyUser, 'typescript_dynamic_config');
}