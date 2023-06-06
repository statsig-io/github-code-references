import statsig from 'statsig-node';

const dummyUser = {
    userID: '12345',
    email: '12345@gmail.com',
};

const test = await statsig.checkGate(dummyUser, 'silly_gate');
const configTest = await statsig.getConfig(dummyUser, 'nodejs_dynamic_config');