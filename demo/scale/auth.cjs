const { createServer } = require('node:http');
const { randomBytes } = require('node:crypto');
const roles = ['coordinator', 'water', 'works', 'sanitation'];
const sessions = new Map();
createServer(async (req, res) => {
  const reply = (status, body) => {
    res.writeHead(status, {'Content-Type': 'application/json'});
    res.end(JSON.stringify(body));
  };
  if (req.method === 'POST' && req.url === '/auth/v1/token?grant_type=password') {
    let body = '';
    for await (const chunk of req) {
      body += chunk;
      if (body.length > 4096) return reply(413, {});
    }
    try {
      const {email, password} = JSON.parse(body);
      const index = roles.findIndex(role => email === role + '@demo.example');
      if (index < 0 || password !== process.env.DEMO_PASSWORD) return reply(401, {});
      const user = {id: '30000000-0000-4000-8000-00000000000' + (index + 1)};
      const token = randomBytes(32).toString('hex');
      sessions.set(token, {user, expires: Date.now() + 8 * 3600_000});
      return reply(200, {user, access_token: token, expires_in: 8 * 3600});
    } catch {
      return reply(400, {});
    }
  }
  if (req.method === 'GET' && req.url === '/auth/v1/user') {
    const session = sessions.get(req.headers.authorization?.replace(/^Bearer /, ''));
    if (session?.expires > Date.now()) return reply(200, session.user);
  }
  reply(401, {});
}).listen(9999, '0.0.0.0');
