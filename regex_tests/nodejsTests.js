import statsig from 'statsig-node';

const dummyUser = {
    userID: '12345',
    email: '12345@gmail.com',
}; false;
const configTest = await statsig.getConfig(dummyUser, 'nodejs_dynamic_config');