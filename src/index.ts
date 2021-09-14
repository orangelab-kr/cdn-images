import { S3 } from 'aws-sdk';
import qs from 'qs';
import Sharp from 'sharp';
import { Joi, setHeader, Wrapper } from '.';
import { CloudfrontEventCfRequestOrigin } from './tools';

export * from './tools';

const maxHeight = 2048;
const maxWidth = 2048;

const s3 = new S3();
const SupportFormat = <const>['jpeg', 'png', 'webp', 'avif', 'tiff'];
const SupportPosition = <const>[
  'cover',
  'contain',
  'fill',
  'inside',
  'outside',
];

type Format = typeof SupportFormat[number];
type Position = typeof SupportPosition[number];

interface ImageOptions {
  width?: number;
  height?: number;
  quality: number;
  format: Format;
  position: Position;
}

export const handler = Wrapper(async (event, context, callback) => {
  const { request, response } = event.Records[0].cf;
  setHeader(response, 'X-Coreservice-Images-Processed-At', `${Date.now()}`);
  const { uri, querystring, origin } = request;
  const bucket = getBucketName(origin);
  const [options, object] = await Promise.all([
    getOptions(querystring),
    getObject({ uri, bucket }),
  ]);

  const image = await getConvertedImage({ options, object });
  if (image.byteLength >= 1 * 1024 * 1024) {
    setHeader(response, 'X-Coreservice-Images-Converted', 'false');
    return callback(null, response);
  }

  response.status = 200;
  response.body = image.toString('base64');
  response.bodyEncoding = 'base64';
  setHeader(response, 'Content-Type', `image/${options.format}`);
  setHeader(response, 'X-Coreservice-Images-Converted', 'true');
  return callback(null, response);
});

function getBucketName(origin: CloudfrontEventCfRequestOrigin) {
  return origin.s3.domainName.replace(
    /.s3(\.[a-z]{2}-[a-z]*-[0-9]{1})?\.amazonaws\.com$/,
    ''
  );
}

async function getOptions(querystring: string): Promise<ImageOptions> {
  const {
    w: width,
    h: height,
    q: quality,
    p: position,
    f: format,
  } = await Joi.object({
    w: Joi.number().min(10).max(maxWidth).optional(),
    h: Joi.number().min(10).max(maxHeight).optional(),
    q: Joi.number().min(1).max(100).default(80).optional(),
    p: Joi.string()
      .valid(...SupportPosition)
      .default('inside')
      .optional(),
    f: Joi.string()
      .valid(...SupportFormat)
      .default('webp')
      .optional(),
  }).validateAsync(qs.parse(querystring));
  return { width, height, quality, format, position };
}

async function getObject(props: {
  bucket: string;
  uri: string;
}): Promise<Buffer> {
  const { bucket, uri } = props;
  const obj = await s3
    .getObject({ Bucket: bucket, Key: uri.substr(1) })
    .promise();
  if (!(obj.Body instanceof Buffer)) throw Error(`${uri} is not found.`);
  return obj.Body;
}

function getSize(first?: number, second?: number, third?: number): number {
  return Math.min(
    first || Number.MAX_SAFE_INTEGER,
    second || Number.MAX_SAFE_INTEGER,
    third || Number.MAX_SAFE_INTEGER
  );
}

async function getConvertedImage(props: {
  object: Buffer;
  options: ImageOptions;
}): Promise<Buffer> {
  const { object, options } = props;
  const { quality, position } = options;
  const sharp = Sharp(object);
  const metadata = await sharp.metadata();
  const width = getSize(options.width, metadata.width, maxWidth);
  const height = getSize(options.height, metadata.height, maxHeight);
  return sharp
    .resize({ height, width, fit: position })
    .toFormat(options.format, { quality })
    .toBuffer();
}
