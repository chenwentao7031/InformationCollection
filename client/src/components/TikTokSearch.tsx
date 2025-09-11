import React, { useState } from 'react';
import {
  Input,
  Select,
  Button,
  Card,
  Spin,
  Space,
  Row,
  Col,
  Typography,
  message,
  Result,
} from 'antd';
import { SearchOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

// TikTok 图标组件
const TikTokIcon: React.FC<{ style?: React.CSSProperties }> = ({ style }) => (
  <svg
    viewBox="0 0 24 24"
    width="1em"
    height="1em"
    fill="currentColor"
    style={style}
  >
    <path d="M19.321 5.562a5.122 5.122 0 0 1-.443-.258A6.169 6.169 0 0 1 16.5 1.75h-2.844v11.906a3.655 3.655 0 1 1-2.531-3.5V7.344a6.5 6.5 0 1 0 4.61 6.219V8.344a8.956 8.956 0 0 0 5.25 1.781V7.281a5.956 5.956 0 0 1-1.664-.719z"/>
  </svg>
);

const TikTokSearch: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      message.warning('请输入搜索关键词');
      return;
    }

    setLoading(true);
    try {
      // 这里将来可以调用TikTok相关的API
      await new Promise(resolve => setTimeout(resolve, 1000)); // 模拟API调用
      message.info('TikTok搜索功能即将上线，敬请期待！');
    } catch (error) {
      message.error('搜索失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* 搜索区域 */}
      <Card style={{ marginBottom: 24 }}>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <Row gutter={16} align="bottom">
            <Col xs={24} sm={14} md={12}>
              <div>
                <Text strong style={{ marginBottom: 8, display: 'block' }}>TikTok用户搜索</Text>
                <Input
                  allowClear
                  size="large"
                  placeholder="请输入TikTok用户名或关键词..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onPressEnter={handleSearch}
                  prefix={<SearchOutlined />}
                />
              </div>
            </Col>

            <Col xs={24} sm={6} md={6}>
              <div>
                <Text strong style={{ marginBottom: 8, display: 'block' }}>搜索类型</Text>
                <Select
                  size="large"
                  defaultValue="user"
                  style={{ width: '100%' }}
                  disabled
                >
                  <Select.Option value="user">用户信息</Select.Option>
                  <Select.Option value="videos">视频内容</Select.Option>
                  <Select.Option value="hashtags">话题标签</Select.Option>
                  <Select.Option value="sounds">音乐音效</Select.Option>
                </Select>
              </div>
            </Col>

            <Col xs={24} sm={4} md={6}>
              <Button
                type="primary"
                size="large"
                onClick={handleSearch}
                loading={loading}
                block
                style={{ height: '40px' }}
              >
                {loading ? '搜索中...' : '🔍 搜索'}
              </Button>
            </Col>
          </Row>
        </Space>
      </Card>

      {/* 加载状态 */}
      {loading && (
        <Card style={{ textAlign: 'center', marginBottom: 24 }}>
          <Spin size="large" />
          <div style={{ marginTop: 16 }}>
            <Text>🔍 正在搜索TikTok内容，请稍候...</Text>
          </div>
        </Card>
      )}

      {/* 功能开发中提示 */}
      <Card>
        <Result
          icon={<TikTokIcon style={{ color: '#000', fontSize: '64px' }} />}
          title="TikTok搜索功能"
          subTitle="此功能正在开发中，即将为您提供TikTok用户信息查询和数据导出功能"
          extra={
            <Space direction="vertical" size="middle">
              <Text type="secondary">
                即将支持的功能：
              </Text>
              <ul style={{ textAlign: 'left', display: 'inline-block' }}>
                <li>TikTok用户信息查询</li>
                <li>粉丝数据统计</li>
                <li>视频互动分析</li>
                <li>热门内容追踪</li>
                <li>联系信息提取</li>
                <li>数据Excel导出</li>
              </ul>
            </Space>
          }
        />
      </Card>
    </div>
  );
};

export default TikTokSearch;
