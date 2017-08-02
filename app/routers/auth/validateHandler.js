const { dbMiddleware } = require('~/database');
const rp = require('request-promise-native');
const config = require('config');
const { parseString } = require('xml2js');
const { promisify } = require('util');

const parseStringAsync = promisify(parseString);

const consumerKey = config.get('oauth.consumerKey');
const consumerSecret = config.get('oauth.consumerSecret');

module.exports = function attachLogoutHandler(router) {
  router.post(
    '/validate',
    dbMiddleware,
    async (ctx) => {
      const ah = ctx.get('Authorization');

      const m = /^bearer (.+)$/i.exec(ah || '');
      if (!m) {
        ctx.status = 401;
        ctx.set('WWW-Authenticate', 'Bearer realm="freemap"; error="missing token"');
        return;
      }

      const authToken = m[1];
      const auths = await ctx.state.db.query('SELECT osmAuthToken, osmAuthTokenSecret FROM auth WHERE authToken = ?', [authToken]);

      if (auths.length) {
        const userDetails = await rp.get({
          url: 'http://api.openstreetmap.org/api/0.6/user/details',
          oauth: {
            consumer_key: consumerKey,
            consumer_secret: consumerSecret,
            token: auths[0].osmAuthToken,
            token_secret: auths[0].osmAuthTokenSecret,
          },
        });

        const result = await parseStringAsync(userDetails);

        const { $: { display_name: name /* , id: osmId */ }, home: [{ $: { lat, lon } }] } = result.osm.user[0];

        // TODO update name, lat, lon (and ensure osmId is the same)

        ctx.body = { authToken, name, lat, lon };
      } else {
        ctx.status = 401;
        ctx.set('WWW-Authenticate', 'Bearer realm="freemap"; error="invalid token"');
      }
    },
  );
};
