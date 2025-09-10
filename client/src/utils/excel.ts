// client/src/utils/excel.ts
import * as XLSX from 'xlsx';
import { ChannelData } from '@/types';

export const exportToExcel = (data: ChannelData[], filename?: string) => {
  if (!data.length) {
    throw new Error('没有数据可以导出');
  }
  
  // 准备导出数据
  const exportData = data.map((row, index) => ({
    '序号': index + 1,
    '频道名称': row.title || '未知',
    '联系邮箱': (row.email || []).join(', '),
    '订阅数': row.subscriberCount || '0',
    '总观看数': row.viewCount || '0',
    '视频数': row.videoCount || '0',
    '自定义URL': row.customUrl || '',
    '关键词': row.keywords || '',
    '描述': row.description || '' 
  }));
  
  // 创建工作簿
  const ws = XLSX.utils.json_to_sheet(exportData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '频道信息');
  
  // 设置列宽
  const colWidths = [
    { wch: 6 },   // 序号
    { wch: 30 },  // 频道名称
    { wch: 40 },  // 联系邮箱
    { wch: 12 },  // 订阅数
    { wch: 15 },  // 总观看数
    { wch: 10 },  // 视频数
    { wch: 25 },  // 自定义URL
    { wch: 20 },  // 关键词
    { wch: 80 }   // 描述
  ];
  ws['!cols'] = colWidths;
  
  // 下载文件
  const fileName = filename || `YouTube频道信息_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(wb, fileName);
  
  return fileName;
};
