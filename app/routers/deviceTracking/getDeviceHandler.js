const { dbMiddleware } = require('~/database');
const { acceptValidator } = require('~/requestValidators');
const authenticator = require('~/authenticator');

module.exports = (router) => {
  router.get(
    '/devices/:id',
    acceptValidator('application/json'),
    dbMiddleware(),
    authenticator(true),
    async (ctx) => {
      const [item] = await ctx.state.db.query(
        'SELECT id, name, token, createdAt, maxCount, maxAge, userId FROM trackingDevice WHERE id = ? ORDER BY name',
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
