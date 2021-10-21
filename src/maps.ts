import axios from 'axios';
import { setHeader, Wrapper } from '.';

const ncpApigwApiKeyId = String(process.env.NCP_APIGW_API_KEY_ID);
const ncpApigwApiKey = String(process.env.NCP_APIGW_API_KEY);
const endpoint = 'https://naveropenapi.apigw.ntruss.com/map-static/v2/raster';

export const handler = Wrapper(async (event, context, callback) => {
  const { request, response } = event.Records[0].cf;
  const { querystring } = request;

  setHeader(response, 'X-Coreservice-Images-Processed-At', `${Date.now()}`);
  const { headers, data, status }: any = await axios({
    url: `${endpoint}?${querystring}`,
    responseType: 'arraybuffer',
    headers: {
      'X-NCP-APIGW-API-KEY-ID': ncpApigwApiKeyId,
      'X-NCP-APIGW-API-KEY': ncpApigwApiKey,
    },
  });

  response.status = status;
  response.body = Buffer.from(data, 'binary').toString('base64');
  response.bodyEncoding = 'base64';
  setHeader(response, 'Content-Type', headers['content-type']);
  setHeader(response, 'X-Coreservice-Images-Converted', 'true');
  return callback(null, response);
});
