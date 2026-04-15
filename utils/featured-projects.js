export const featuredProjects = [
  {
    id: 'magic-pocket-bills',
    eyebrow: 'Selected work',
    year: '2026',
    category: 'Local-first finance',
    role: '独立完成产品研究、界面设计与前端实现。',
    title: 'Magic Pocket Bills',
    description:
      '一个面向个人财务整理的 local-first Web 应用，把记账、票据归档与导出整理到同一套体验里。',
    summary:
      '面向长期整理账单与票据的个人用户，强调本地优先、隐私感与轻量可持续的日常使用。',
    url: 'https://magic-pocket-bills.netlify.app/',
    repoUrl: 'https://github.com/freelaeder/Magic-Pocket-Bills',
    metrics: [
      {
        label: 'Architecture',
        value: 'Local-first',
      },
      {
        label: 'Status',
        value: 'MVP Ready',
      },
      {
        label: 'Focus',
        value: 'Privacy-first',
      },
    ],
    featureTags: ['票据归档', '报表提醒', '导出备份'],
    stack: ['React 18', 'TypeScript', 'Vite', 'Tailwind CSS 4', 'LocalStorage'],
    note: '一个围绕真实使用路径完成的前端 MVP，重点验证记账、票据整理与导出闭环。',
  },
];
