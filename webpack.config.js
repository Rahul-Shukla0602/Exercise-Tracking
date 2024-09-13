const path = require('path');
const webpack = require('webpack');

module.exports = {
  mode: 'development', // or 'production'
  entry: './src/index.tsx',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.js'
  },
  module: {
    rules: [
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader', 'postcss-loader'],
      },
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.(js|jsx)$/,
        use: 'babel-loader',
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js', '.jsx'],
    fallback: {
      "fs": false, // Explicitly ignore 'fs' module
      "tls": false,
      "net": false,
      "zlib": false,
      "http": false,
      "https": false,
      "stream": false,
      "crypto": false
    }
  },
  plugins: [
    new webpack.ProvidePlugin({
      cv: '@techstark/opencv-js'
    }),
    new webpack.IgnorePlugin({
      resourceRegExp: /^fs$/,
      contextRegExp: /node_modules/
    })
  ],
};
