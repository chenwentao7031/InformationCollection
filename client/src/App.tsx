import React, { useState } from 'react';
import {
  Input,
  Select,
  Button,
  Card,
  Spin,
  Tag,
  Space,
  Row,
  Col,
  Typography,
  Badge,
  message,
  Table,
} from 'antd';
import { SearchOutlined, ExportOutlined } from '@ant-design/icons';
import { searchChannels } from '@/services/api';
import { exportToExcel } from '@/utils/excel';
import { SearchResponse, ChannelData } from '@/types';
import './index.css';

const { Title, Paragraph, Text } = Typography;

const App: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState('1');
  const [searchRange, setSearchRange] = useState('50');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [tableData, setTableData] = useState<ChannelData[]>([]);
  
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      message.warning('请输入搜索关键词');
      return;
    }
    
    setLoading(true);
    try {
      const response = await searchChannels(searchQuery, searchType, searchRange);
      setResults(response);
      
      // 处理数据以适配表格
      const processedData = response.results?.map((channel, index) => ({
        key: index,
        title: channel.title || '未知',
        email: channel.email || [],
        subscriberCount: channel.subscriberCount || '0',
        viewCount: channel.viewCount || '0',
        videoCount: channel.videoCount || '0',
        customUrl: channel.customUrl || '',
        description: channel.description || '',
        keywords: channel.keywords || ''
      })) || [];
      
      setTableData(processedData);
      message.success(`搜索完成，找到 ${response.results?.length || 0} 个频道`);
    } catch (error) {
      console.error('搜索失败:', error);
      message.error('搜索失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };
  
  const formatNumber = (num: string | number) => {
    if (!num) return '0';
    const number = parseInt(num.toString());
    if (number >= 1000000) {
      return (number / 1000000).toFixed(1) + 'M';
    }
    if (number >= 1000) {
      return (number / 1000).toFixed(1) + 'K';
    }
    return number.toString();
  };
  
  // Excel导出功能
  const handleExportToExcel = () => {
    try {
      const fileName = exportToExcel(tableData);
      message.success(`成功导出 ${tableData.length} 条记录到 ${fileName}`);
    } catch (error) {
      message.error('导出失败：' + (error as Error).message);
    }
  };
  
  // 定义表格列
  const columns = [
    {
      title: '序号',
      key: 'index',
      width: 60,
      render: (_: any, __: any, index: number) => index + 1,
      align: 'center' as const
    },
    {
      title: '频道名称',
      dataIndex: 'title',
      key: 'title',
      width: 250,
      ellipsis: true,
      render: (text: string) => (
        <Text strong style={{ fontSize: '16px' }}>{text}</Text>
      )
    },
    {
      title: '联系邮箱',
      dataIndex: 'email',
      key: 'email',
      width: 300,
      render: (emails: string[]) => (
        <Space direction="vertical" size="small">
          {emails.length > 0 ? (
            emails.map((email, idx) => (
              <Tag key={idx} color="success" style={{ margin: '2px 4px 2px 0' }}>
                📧 {email}
              </Tag>
            ))
          ) : (
            <Text type="secondary">无邮箱信息</Text>
          )}
        </Space>
      )
    },
    {
      title: '订阅数',
      dataIndex: 'subscriberCount',
      key: 'subscriberCount',
      width: 100,
      align: 'right' as const,
      sorter: (a: ChannelData, b: ChannelData) => parseInt(a.subscriberCount) - parseInt(b.subscriberCount),
      render: (count: string) => (
        <Text strong>👥 {formatNumber(count)}</Text>
      )
    },
    {
      title: '总观看数',
      dataIndex: 'viewCount',
      key: 'viewCount',
      width: 120,
      align: 'right' as const,
      sorter: (a: ChannelData, b: ChannelData) => parseInt(a.viewCount) - parseInt(b.viewCount),
      render: (count: string) => (
        <Text strong>👀 {formatNumber(count)}</Text>
      )
    },
    {
      title: '视频数',
      dataIndex: 'videoCount',
      key: 'videoCount',
      width: 80,
      align: 'right' as const,
      sorter: (a: ChannelData, b: ChannelData) => parseInt(a.videoCount) - parseInt(b.videoCount),
      render: (count: string) => (
        <Text strong>🎬 {formatNumber(count)}</Text>
      )
    },
    {
      title: '自定义URL',
      dataIndex: 'customUrl',
      key: 'customUrl',
      width: 180,
      ellipsis: true,
      render: (url: string) => url ? (
        <Text code>{url}</Text>
      ) : (
        <Text type="secondary">无</Text>
      )
    },
    {
      title: '频道描述',
      dataIndex: 'description',
      key: 'description',
      render: (description: string) => (
        <div style={{ width: 200 }}>
          <Paragraph
            ellipsis={{ rows: 2, expandable: true, symbol: '更多' }}
            style={{ marginBottom: 0, fontSize: '12px'}}
          >
            {description || '无描述信息'}
          </Paragraph>
        </div>
      )
    }
  ];
  
  return (
    <div className="container">
      <div className="header">
        <Title level={1} style={{ color: 'white', textAlign: 'center', marginBottom: 8 }}>
          🎥 YouTube 频道搜索工具
        </Title>
        <Paragraph style={{ color: 'white', textAlign: 'center', opacity: 0.9, fontSize: '18px' }}>
          搜索 YouTube 频道并获取联系邮箱信息
        </Paragraph>
      </div>
      
      <Card className="search-card" style={{ marginBottom: 24 }}>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <Row gutter={16} align="bottom">
            <Col xs={24} sm={12} md={8}>
              <div>
                <Text strong style={{ marginBottom: 8, display: 'block' }}>搜索关键词</Text>
                <Input
                  allowClear
                  size="large"
                  placeholder="请输入搜索关键词，如：美食博主、科技评测..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onPressEnter={handleSearch}
                  prefix={<SearchOutlined />}
                />
              </div>
            </Col>
            
            <Col xs={24} sm={8} md={6}>
              <div>
                <Text strong style={{ marginBottom: 8, display: 'block' }}>搜索类型</Text>
                <Select
                  size="large"
                  value={searchType}
                  onChange={setSearchType}
                  style={{ width: '100%' }}
                >
                  <Select.Option value="1">仅有邮箱的频道</Select.Option>
                  <Select.Option value="2">所有频道详情</Select.Option>
                </Select>
              </div>
            </Col>

            <Col xs={24} sm={8} md={6}>
              <div>
                <Text strong style={{ marginBottom: 8, display: 'block' }}>搜索范围</Text>
                <Select
                  size="large"
                  value={searchRange}
                  onChange={setSearchRange}
                  style={{ width: '100%' }}
                >
                  <Select.Option value="50">50条</Select.Option>
                  <Select.Option value="100">100条</Select.Option>
                  <Select.Option value="200">200条</Select.Option>
                  <Select.Option value="500">500条</Select.Option>
                </Select>
              </div>
            </Col>
            
            <Col xs={24} sm={4} md={4}>
              <Button
                type="primary"
                size="large"
                onClick={handleSearch}
                loading={loading}
                block
                className="gradient-btn"
                style={{ height: '40px' }}
              >
                {loading ? '搜索中...' : '🔍 搜索'}
              </Button>
            </Col>
          </Row>
        </Space>
      </Card>
      
      {loading && (
        <Card style={{ textAlign: 'center', marginBottom: 24 }}>
          <Spin size="large" />
          <div style={{ marginTop: 16 }}>
            <Text>🔍 正在搜索中，请稍候...</Text>
          </div>
        </Card>
      )}
      
      {results && !loading && (
        <Card 
          title={
            <Space>
              <Text strong style={{ fontSize: '18px' }}>
                搜索结果: {tableData.length} 个频道
              </Text>
              {results.count > 0 && (
                <Badge 
                  count={`${results.count} 个有邮箱`} 
                  style={{ 
                    backgroundColor: '#52c41a',
                    fontSize: '12px'
                  }} 
                />
              )}
            </Space>
          }
          extra={
            <Button
              type="primary"
              icon={<ExportOutlined />}
              onClick={handleExportToExcel}
              disabled={!tableData.length}
              className="gradient-btn"
            >
              导出Excel
            </Button>
          }
        >
          {tableData.length > 0 ? (
            <Table
              columns={columns}
              dataSource={tableData}
              scroll={{ x: 'max-content', y: 600 }}
              pagination={{
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total, range) => 
                  `第 ${range[0]}-${range[1]} 条，共 ${total} 条`,
                pageSizeOptions: ['10', '20', '50', '100'],
                defaultPageSize: 10
              }}
              size="middle"
              bordered
              style={{ marginTop: 16 }}
            />
          ) : (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <Text type="secondary" style={{ fontSize: '16px' }}>
                😅 没有找到相关频道，请尝试其他关键词
              </Text>
            </div>
          )}
        </Card>
      )}
    </div>
  );
};

export default App;
