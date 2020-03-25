const withPlugins = require("next-compose-plugins");
const withImages = require("next-images");
const withSass = require("@zeit/next-sass");
const webpack = require("webpack");
const path = require("path");

module.exports = withPlugins([[withSass], [withImages]], {
  webpack(config, options) {
    config.resolve.modules.push(path.resolve("./"));
    return config;
  },
  exportTrailingSlash: true,
  exportPathMap: function() {
    return {
      '/landing': { page: '/landing' },
      '/profile': { page: '/profile' },
      '/components': { page: '/components' },
      '/login': { page: '/login' }
    };
  }
});
