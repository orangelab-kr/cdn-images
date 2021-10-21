/* eslint-disable @typescript-eslint/no-var-requires */
const path = require('path');
const nodeExternals = require('webpack-node-externals');
const slsw = require('serverless-webpack');
const { EnvironmentPlugin } = require('webpack');

module.exports = {
  mode: 'none',
  target: 'node',
  entry: slsw.lib.entries,
  externals: [nodeExternals()],
  resolve: {
    extensions: ['.ts', '.js'],
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        loader: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  plugins: [
    new EnvironmentPlugin({
      NCP_APIGW_API_KEY_ID: process.env.NCP_APIGW_API_KEY_ID,
      NCP_APIGW_API_KEY: process.env.NCP_APIGW_API_KEY,
    }),
  ],
  output: {
    libraryTarget: 'commonjs',
    filename: '[name].js',
    path: path.resolve(__dirname, '.webpack'),
  },
  optimization: {
    concatenateModules: false,
  },
};
