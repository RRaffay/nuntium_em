// utils/colorUtils.ts

export const getColor = (index: number) => {
  const colors = [
    '#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#387908',
    '#8a2be2', '#a52a2a', '#deb887', '#5f9ea0', '#ff69b4',
    '#cd5c5c', '#1e90ff', '#3cb371', '#ff1493', '#00ced1',
  ];
  return colors[index % colors.length];
};
