// Demo data preview mode starts with — realistic, never empty, never a network call.
// See modules/CONTRACT.md #2.
export function seedPreview() {
  return {
    datasets: [
      {
        name: 'Monthly Store Sales',
        csv: 'month,revenue,orders,returns\nJan,12400,310,12\nFeb,11150,287,9\nMar,14800,362,15\nApr,13900,340,11\nMay,16200,401,18\nJun,17550,428,14',
      },
      {
        name: 'Website Traffic by Channel',
        csv: 'channel,visits,signups\nOrganic,8200,164\nSocial,5400,81\nEmail,2100,105\nReferral,1800,54\nPaid,3600,72',
      },
    ],
  };
}
