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
import { SearchOutlined, InstagramOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

const InstagramSearch: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      message.warning('请输入搜索关键词');
      return;
    }

    setLoading(true);
    try {
      // 这里将来可以调用Instagram相关的API
      await new Promise(resolve => setTimeout(resolve, 1000)); // 模拟API调用
      message.info('Instagram搜索功能即将上线，敬请期待！');
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
                <Text strong style={{ marginBottom: 8, display: 'block' }}>Instagram用户搜索</Text>
                <Input
                  allowClear
                  size="large"
                  placeholder="请输入Instagram用户名或关键词..."
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
                  <Select.Option value="posts">帖子内容</Select.Option>
                  <Select.Option value="hashtags">话题标签</Select.Option>
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
            <Text>🔍 正在搜索Instagram内容，请稍候...</Text>
          </div>
        </Card>
      )}

      {/* 功能开发中提示 */}
      <Card>
        <Result
          icon={<InstagramOutlined style={{ color: '#E4405F', fontSize: '64px' }} />}
          title="Instagram搜索功能"
          subTitle="此功能正在开发中，即将为您提供Instagram用户信息查询和数据导出功能"
          extra={
            <Space direction="vertical" size="middle">
              <Text type="secondary">
                即将支持的功能：
              </Text>
              <ul style={{ textAlign: 'left', display: 'inline-block' }}>
                <li>Instagram用户信息查询</li>
                <li>粉丝数据统计</li>
                <li>帖子互动分析</li>
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

export default InstagramSearch;
