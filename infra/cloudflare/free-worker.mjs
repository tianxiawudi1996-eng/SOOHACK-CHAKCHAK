import {httpServerHandler} from 'cloudflare:node';
import {createCloudflareFreeApiHandler} from './api-runtime.mjs';
import {createWorker} from './worker.mjs';

const apiHandler = createCloudflareFreeApiHandler({
  httpServerHandlerImpl: httpServerHandler
});

export default createWorker({apiHandler});
