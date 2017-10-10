const path = require('path');

const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const ExtractTextPlugin = require("extract-text-webpack-plugin");
const CopyWebpackPlugin = require('copy-webpack-plugin');

const production = process.env.NODE_ENV === 'production'
const configurationPath = production ? './env/production.json' : './env/development.json'

console.log("NODE_ENV: ", process.env.NODE_ENV)
console.log("Path configuration: ", configurationPath)

const vendor = [
  'history',
  'bitcore-lib',
  'moment',
  'uuid',
  'classnames',
  'protobufjs',
  'react',
  'react-autocomplete',
  'react-datepicker',
  'react-dom',
  'react-router',
  'react-overlays',
  'react-qr',
  'react-redux',
  'react-tabs',
  'redux',
  'redux-saga',
  'socket.io-client',
];

const extractor = new ExtractTextPlugin("styles.css")

module.exports = {
  entry: {
    'app': production
    ? [
      './src/bootstrap.ts',
      './src/index.tsx'
    ]
    : [
      'webpack-hot-middleware/client',
      './src/bootstrap.ts',
      './src/index.tsx'
    ],
    'vendor': vendor
  },
  output: {
    filename: '[name].[hash].js',
    path: path.join(__dirname, 'dist'),
    publicPath: "/"
  },

  // Enable sourcemaps for debugging webpack's output.
  devtool: production ? '' : 'eval',

  resolve: {
    root: [
      path.resolve('./src/'),
      path.resolve('./node_modules/'),
    ],
    extensions: ['', '.webpack.js', '.web.js', '.ts', '.tsx', '.js', '.json'],
    fallback: path.join(__dirname, "node_modules"),
    alias: {
      Configuration: path.resolve(configurationPath)
    }
  },

  resolveLoader: {
    // modulesDirectories: ['node_modules'],
    fallback: path.join(__dirname, 'node_modules')
  },

  module: {
    loaders: [
      // All files with a '.ts' or '.tsx' extension will be handled by 'awesome-typescript-loader'.
      { test: /\.tsx?$/, loaders: production
        ? ['babel', 'awesome-typescript-loader']
        : ['react-hot', 'babel', 'awesome-typescript-loader'] },
      {
        test: /\.s?css$/, loader: production
        ? extractor.extract(
          'style-loader',
          ['css-loader?-autoprefixer', 'postcss-loader', 'sass-loader']
        )
        : 'style!css?sourceMap&importLoaders=1!postcss!sass?sourceMap'
      },
      { test: /\.json$/, loader: 'json-loader' },
      { test: /\.svg$/, loader: 'file-loader' },
      { test: /\.ico$/, loader: 'file-loader?name=[name].[ext]' }
    ],

    preLoaders: [
      // All output '.js' files will have any sourcemaps re-processed by 'source-map-loader'.
      { test: /\.js$/, loader: 'source-map-loader' }
    ]
  },

  postcss: () => {
    return [
      require('autoprefixer')
    ];
  },

  plugins: production
  ? [
    new webpack.optimize.CommonsChunkPlugin({ name: "vendor", filename: "vendor.js" }),
    new webpack.optimize.CommonsChunkPlugin({ name: 'meta', chunks: ['vendor'], filename: "meta.js" }),
    new HtmlWebpackPlugin({ title: 'Poet App', template: 'src/index.html' }),
    extractor,
    new webpack.optimize.DedupePlugin(),
    new webpack.NoErrorsPlugin(),
    new webpack.DefinePlugin({
      'process.env': {
        'NODE_ENV': JSON.stringify('production')
      }
    }),
    new CopyWebpackPlugin([
      {
        from: "./_redirects",
        to: "./_redirects",
        toType: "file"
      },
    ])
  ]
  : [
    new webpack.optimize.CommonsChunkPlugin({ name: "vendor", filename: "vendor.js" }),
    new webpack.optimize.CommonsChunkPlugin({ name: 'meta', chunks: ['vendor'], filename: "meta.js" }),
    new HtmlWebpackPlugin({ title: 'Poet App', template: 'src/index.html' }),
    extractor,
    new webpack.HotModuleReplacementPlugin(),
    new webpack.NoErrorsPlugin()
  ]
};
