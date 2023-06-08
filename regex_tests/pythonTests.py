from statsig.statsig_user import StatsigUser

statsig.check_gate(StatsigUser("user-id"), 'silly_gate');
config = statsig.get_config(StatsigUser("user-id"), "dynamic_config");