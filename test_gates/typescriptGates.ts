import statsig from 'statsig-node';
import Utils from '../src/Utils'

async function useDummyGates() {
    // Put a gate here so we can search for it later
    await statsig.initialize(
        "secret-08Bqk5wabXasJhcw5fVVIQ1JUfwBI8IXnAPMqbvaBkS"
    )

    const dummyUser = {
        userID: '12345',
        email: '12345@gmail.com',
    }

    const dummyGate = await statsig.checkGate(dummyUser, 'show_dashboard_markers');
    const sillyGate = await statsig.checkGate(dummyUser, 'is_data_dog_test_email')
}