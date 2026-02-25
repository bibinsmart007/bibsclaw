module.exports = {
  docs: [
    'intro',
    { type: 'category', label: 'Getting Started', items: ['installation', 'configuration', 'first-chat'] },
    { type: 'category', label: 'Features', items: ['multi-model', 'voice', 'coding-agent', 'scheduler', 'telegram'] },
    { type: 'category', label: 'API Reference', items: ['api/chat', 'api/tasks', 'api/voice'] },
    { type: 'category', label: 'Deployment', items: ['deploy/railway', 'deploy/docker', 'deploy/self-hosted'] },
  ],
};
