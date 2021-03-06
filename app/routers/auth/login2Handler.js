const rp = require('request-promise-native');
const qs = require('querystring');
const config = require('config');
const { parseString } = require('xml2js');
const { promisify } = require('util');
const { dbMiddleware } = require('~/database');
const requestTokenRegistry = require('./requestTokenRegistry');
const login = require('./loginProcessor');

const parseStringAsync = promisify(parseString);

const consumerKey = config.get('oauth.consumerKey');
const consumerSecret = config.get('oauth.consumerSecret');

module.exports = function attachLogin2Handler(router) {
  router.post(
    '/login2',
    // TODO validation
    dbMiddleware(),
    async (ctx) => {
      const body = await rp.post({
        url: 'https://www.openstreetmap.org/oauth/access_token',
        oauth: {
          consumer_key: consumerKey,
          consumer_secret: consumerSecret,
          token: ctx.request.body.token,
          token_secret: requestTokenRegistry.get(ctx.request.body.token),
          verifier: ctx.request.body.verifier,
        },
      });

      const permData = qs.parse(body);

      const userDetails = await rp.get({
        url: 'https://api.openstreetmap.org/api/0.6/user/details',
        oauth: {
          consumer_key: consumerKey,
          consumer_secret: consumerSecret,
          token: permData.oauth_token,
          token_secret: permData.oauth_token_secret,
        },
      });

      const result = await parseStringAsync(userDetails);

      const { $: { display_name: osmName, id: osmId }, home } = result.osm.user[0];
      const { lat, lon } = home && home.length && home[0].$ || {};

      const { db } = ctx.state;

      await login(
        db, ctx, 'osmId', osmId, 'osmAuthToken, osmAuthTokenSecret',
        [permData.oauth_token, permData.oauth_token_secret], osmName, null, lat, lon,
      );
    },
  );
};
