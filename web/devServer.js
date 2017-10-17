const webpack = require('webpack')
const webpackDevServer = require('webpack-dev-server')
const config = require("./webpack.config.js")

const PORT = 3000
const PORT_API = 8080

config.entry.app.unshift(`webpack-dev-server/client?http://localhost:${PORT}/`, "webpack/hot/dev-server");

const compiler = webpack(config);
const server = new webpackDevServer(compiler, {
  hot: true,
  noInfo: true,
  proxy: {
    '/api': {
      target: `http://localhost:${PORT_API}`,
      secure: false
    }
  },
  historyApiFallback: {
    index: 'index.html'
  }
});

server.listen(PORT, '0.0.0.0', function (err) {
  if (err) {
    console.log(err);
    return;
  }

  console.log(`Listening at http://localhost:${PORT}`);
});
