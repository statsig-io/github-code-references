import axios, { AxiosError, AxiosResponse } from "axios";
import axiosRetry from 'axios-retry';

axiosRetry(axios, {
    retries: 3,
});

