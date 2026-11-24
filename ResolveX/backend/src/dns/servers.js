// Central catalogue of DNS providers. Add new entries here to extend the tool.
const DEFAULT_SERVERS = [
  {
    id: 'cloudflare',
    name: 'Cloudflare DNS',
    shortName: 'Cloudflare',
    ip: '1.1.1.1',
    description: 'Fast public DNS resolver with privacy focus.',
  },
  {
    id: 'google',
    name: 'Google Public DNS',
    shortName: 'Google',
    ip: '8.8.8.8',
    description: 'Widely used public resolver with global anycast.',
  },
  {
    id: 'quad9',
    name: 'Quad9',
    shortName: 'Quad9',
    ip: '9.9.9.9',
    description: 'Security-focused resolver blocking malicious domains.',
  },
  {
    id: 'adguard',
    name: 'AdGuard DNS',
    shortName: 'AdGuard',
    ip: '94.140.14.14',
    description: 'Privacy-friendly resolver with ad/tracker filtering options.',
  },
];

module.exports = { DEFAULT_SERVERS };
