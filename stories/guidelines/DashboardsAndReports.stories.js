// The shape of a rule and the gates that walk this page: docs/guidelines.md
import { guidelinePage } from './_layout.js';
import { TITLE, BLURB, RULES, SPEC_CSS } from './_dashboards-and-reports.js';

export default {
  title: 'Guidelines/Dashboards and reports',
  parameters: { layout: 'fullscreen' },
};

export const DashboardsAndReports = {
  name: 'Dashboards and reports',
  render: () => guidelinePage({ title: TITLE, blurb: BLURB, rules: RULES, css: SPEC_CSS }),
};
