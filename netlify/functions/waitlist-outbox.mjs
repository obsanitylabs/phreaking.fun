// OBS-203 — GET /api/waitlist/outbox : token-gated staging view of pending confirmation
// links. Only for the staging window while no email provider is wired; requires the ADMIN
// token. Never exposed publicly in production (function disabled by env WAITLIST_STAGING=1).
import { storeList } from '../shared/store.mjs';
import { bearerToken, timingSafeEqualStr, json } from '../shared/util.mjs';

import { respond, header, clientIp } from '../shared/util.mjs';

const handler = async (req, context) => {
  if (process.env.WAITLIST_STAGING !== '1') return json(null, 404, { error: 'not_found' });
  const token = bearerToken(req);
  const expect = process.env.WAITLIST_ADMIN_TOKEN;
  if (!expect || !token || !timingSafeEqualStr(token, expect)) return json(null, 401, { error: 'unauthorized' });
  return json(null, 200, { outbox: Object.values(await storeList(context, 'outbox:')) });
};

export const config = { path: '/api/waitlist/outbox' };

export default respond(handler);
