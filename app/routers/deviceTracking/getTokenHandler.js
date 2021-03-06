const { dbMiddleware } = require('~/database');
const { acceptValidator } = require('~/requestValidators');
const authenticator = require('~/authenticator');

module.exports = (router) => {
  router.get(
    '/access-tokens/:id',
    acceptValidator('application/json'),
    dbMiddleware(),
    authenticator(true),
    async (ctx) => {
      const [item] = await ctx.state.db.query(
        `SELECT id, token, createdAt, timeFrom, timeTo, note, listingLabel
          FROM trackingAccessToken JOIN trackingDevice ON (trackingAccessToken.deviceId = trackingDevice.id)
          WHERE id = ? ORDER BY id`,
        [ctx.params.id],
      );

      if (!item) {
        ctx.status = 404;
      } else if (!ctx.state.user.isAdmin && ctx.state.user.id !== item.userId) {
        ctx.status = 403;
      } else {
        ctx.body = item;
      }
    },
  );
};
