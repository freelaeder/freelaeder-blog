export const featuredProjects = [
  {
    id: 'kids-points-app',
    eyebrow: 'Selected work',
    year: '2026',
    category: 'Family task gamification',
    role: '独立完成产品设计、双端体验梳理与前端实现。',
    title: '家庭版孩子积分系统',
    description:
      '一个面向家庭任务激励场景的双端 Web 应用，围绕孩子执行任务、家长审核发放积分与愿望兑换建立完整闭环。',
    summary:
      '将孩子端任务执行、家长端任务管理、宠物互动、愿望胶囊与本地数据持久化整合为一套可直接体验的家庭积分系统。',
    url: 'https://freelaeder-kids-points.netlify.app/',
    repoUrl: 'https://github.com/freelaeder/kids-points-app',
    metrics: [
      {
        label: 'Architecture',
        value: 'Dual-portal',
      },
      {
        label: 'Status',
        value: 'Live',
      },
      {
        label: 'Focus',
        value: 'Gamified',
      },
    ],
    featureTags: ['任务审核', '宠物互动', '愿望胶囊'],
    stack: ['React 18', 'TypeScript', 'Vite', 'Dexie', 'Tailwind CSS'],
    note: '采用 local-first 方案完成家庭任务积分主链路，重点强化亲子互动反馈与移动端可用性。',
  },
  {
    id: 'diezhu-space',
    eyebrow: 'Selected work',
    year: '2026',
    category: 'Interior design portfolio',
    role: '独立完成信息架构、品牌表达与前端实现。',
    title: '蝶筑空间',
    description:
      '一个面向高端家装设计展示的个人作品网站，围绕品牌塑造、案例呈现与客户转化来组织整体体验。',
    summary:
      '将首页品牌表达、作品集筛选、项目详情、关于介绍与联系预约整合到一套优雅克制的多页面作品站里。',
    url: 'https://freelaeder-hdprofile.netlify.app/',
    repoUrl: 'https://github.com/freelaeder/Hdprofile',
    metrics: [
      {
        label: 'Architecture',
        value: 'Multi-page',
      },
      {
        label: 'Status',
        value: 'Live',
      },
      {
        label: 'Focus',
        value: 'Client-ready',
      },
    ],
    featureTags: ['作品筛选', '项目详情', '在线预约'],
    stack: ['React 18', 'TypeScript', 'React Router 7', 'Tailwind CSS 4', 'Motion'],
    note: '以设计师品牌展示为核心，强调高级感视觉、案例叙事和响应式浏览体验。',
  },
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
