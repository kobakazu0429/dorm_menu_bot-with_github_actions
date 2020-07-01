"use strict";

const path = require("path");
const nodeExternals = require("webpack-node-externals");
const { CleanWebpackPlugin } = require('clean-webpack-plugin');

module.exports = {
  mode: "production",

  entry: {
    server: "./src/server.ts",
    cli: "./src/cli.ts"
  },

  target: "node",

  externals: [
    nodeExternals()
  ],

  output: {
    filename: "[name].js",
    path: path.join(__dirname, "build")
  },

  plugins: [
    new CleanWebpackPlugin()
  ],

  devtool: "source-map",

  resolve: {
    extensions: [".ts", ".js"],
    modules: ["node_modules"]
  },

  module: {
    rules: [
      {
        test: /\.ts$/,
        use: "ts-loader",
        exclude: /node_modules/
      }
    ]
  }
};
