module.exports = {
  title: 'BibsClaw Docs',
  tagline: 'Personal AI Assistant Documentation',
  url: 'https://docs.bibsclaw.com',
  baseUrl: '/',
  organizationName: 'bibinsmart007',
  projectName: 'bibsclaw',
  themeConfig: {
    navbar: {
      title: 'BibsClaw',
      items: [
        { type: 'doc', docId: 'intro', position: 'left', label: 'Docs' },
        { to: '/api', label: 'API', position: 'left' },
        { href: 'https://github.com/bibinsmart007/bibsclaw', label: 'GitHub', position: 'right' },
      ],
    },
    footer: {
      style: 'dark',
      copyright: 'Copyright 2026 BibsClaw. Built by Bibin.',
    },
  },
  presets: [['classic', { docs: { sidebarPath: './sidebars.js' }, theme: { customCss: './src/css/custom.css' } }]],
};
