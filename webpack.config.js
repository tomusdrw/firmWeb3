"use strict";

const webpack = require('webpack');
const CopyWepbackPlugin = require('copy-webpack-plugin');
const path = require('path');

const ENV = process.env.NODE_ENV || 'development';
const isProd = ENV === 'production';

module.exports = {
  debug: !isProd,
  cache: !isProd,
  devtool: isProd ? '#source-map' : '#cheap-module-eval-source-map',
  context: path.join(__dirname, './lib'),
  entry: {
    'index': './index.js'
  },
  output: {
    library: 'firm.web3',
    libraryTarget: 'umd',
    umdNamedDefine: true,
    path: path.join(__dirname, './build'),
    filename: '[name].js'
  },
  module: {
    loaders: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        loader: 'babel',
      },
      {
        test: /\.html$/,
        loader: 'file?name=[name].[ext]'
      },
      {
        test: /\.json/,
        loader: 'json'
      }
    ]
  },
  resolve: {
    extensions: ['', '.js']
  },
  plugins: (function () {
    var plugins = [
      new CopyWepbackPlugin([{ from: './index.html '}]),
      new webpack.DefinePlugin({
        'process.env': {
          NODE_ENV: JSON.stringify(ENV)
        }
      }),
    ];

    if (isProd) {
      plugins.push(new webpack.optimize.DedupePlugin());
      plugins.push(new webpack.optimize.OccurrenceOrderPlugin());
    }

    return plugins;
  }()),
  devServer: {
    contentBase: './build',
    hot: !isProd,
    proxy: {
      '/rpc*': {
        target: 'http://localhost:8080'
      }
    }
  }
};
