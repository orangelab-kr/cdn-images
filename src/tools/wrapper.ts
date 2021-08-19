import { Context } from 'aws-lambda';
import { ValidationError } from 'joi';
import {
  CloudfrontEvent,
  CloudfrontEventCfResponse,
  setBody,
} from './cloudfront';

export type Callback = (
  event: CloudfrontEvent,
  context: Context,
  callback: (
    error?: Error | string | null,
    result?: CloudfrontEventCfResponse
  ) => void
) => void;

export const Wrapper: (cb: Callback) => Callback =
  (cb: Callback) => async (event, context, callback) => {
    try {
      return await cb(event, context, callback);
    } catch (err) {
      const { response } = event.Records[0].cf;
      const { message, details } = err;

      response.status = 500;
      setBody(response, { message });
      if (err instanceof ValidationError) {
        response.status = 400;
        setBody(response, { message, details });
      }

      callback(null, response);
    }
  };
