import React, { useState } from 'react';
import {
  Input,
  Button,
  Card,
  Spin,
  Space,
  Row,
  Col,
  Typography,
  message,
  List,
  Avatar,
  Tag,
} from 'antd';
import { SearchOutlined, ExportOutlined, PlayCircleOutlined, EyeOutlined, LikeOutlined, MessageOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { useYtsearch } from '@/services/api';
import { VideoData } from '@/types';
import ExportModal from './ExportModal';

const { Text, Paragraph } = Typography;

const YouTubeSearch: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [exportModalVisible, setExportModalVisible] = useState(false);

  // 使用封装好的搜索 Hook
  const {
    data: searchResults,
    loading,
    run: runSearch,
  } = useYtsearch();

  const handleSearch = () => {
    if (!searchQuery.trim()) {
      message.warning('请输入搜索关键词');
      return;
    }
    runSearch(searchQuery);
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

  const formatDate = (dateString: string) => {
    if (!dateString) return '未知时间';
    return new Date(dateString).toLocaleDateString('zh-CN');
  };

  // 打开导出Modal
  const handleOpenExportModal = () => {
    if (searchResults?.data?.length === 0) {
      message.warning('没有数据可以导出');
      return;
    }
    setExportModalVisible(true);
  };

  const openVideo = (url: string) => {
    if (url) {
      window.open(url, '_blank');
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
            <Text>🔍 正在搜索YouTube视频，请稍候...</Text>
          </div>
        </Card>
      )}

      {/* 搜索结果 */}
      {searchResults && !loading && (
        <Card
          extra={
            <Button
              type="primary"
              icon={<ExportOutlined />}
              onClick={handleOpenExportModal}
              disabled={!searchResults?.data?.length} 
            >
              导出Excel
            </Button>
          }
        >
          {searchResults?.data?.length > 0 ? (
            <List
              itemLayout="vertical"
              dataSource={searchResults?.data || []}
              pagination={{
                showTotal: (total, range) =>
                  `第 ${range[0]}-${range[1]} 条，共 ${total} 条`,
                pageSizeOptions: ['5', '10', '20', '50'],
                defaultPageSize: 10
              }}
              renderItem={(video) => (
                <List.Item
                  key={video.videoId}
                  actions={[
                    <Button
                      type="link"
                      icon={<PlayCircleOutlined />}
                      onClick={() => openVideo(video.url)}
                    >
                      观看视频
                    </Button>
                  ]}
                  extra={
                    <img
                      width={200}
                      alt={video.title}
                      src={video.thumbnail}
                      style={{ borderRadius: 8 }}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://via.placeholder.com/200x150?text=No+Image';
                      }}
                    />
                  }
                >
                  <List.Item.Meta
                    avatar={<Avatar icon={<PlayCircleOutlined />} />}
                    title={
                      <Space direction="vertical" size="small" style={{ width: '100%' }}>
                        <Text strong style={{ fontSize: '16px' }}>{video.title}</Text>
                        <a type="secondary" href={video.author.url} target="_blank">{video.author.name}</a>
                      </Space>
                    }
                    description={
                      <Space direction="vertical" size="small" style={{ width: '100%' }}>
                        <Space wrap>
                          <Tag icon={<EyeOutlined />} color="blue">
                            {formatNumber(video.views)} 观看
                          </Tag>
                          <Tag icon={<ClockCircleOutlined />} color="red">{video.ago}</Tag>
                        </Space>
                        <Paragraph
                          ellipsis={{ rows: 2, expandable: true, symbol: '更多' }}
                          style={{ marginBottom: 0, marginTop: 8 }}
                        >
                          {video.description || '暂无描述'}
                        </Paragraph>
                      </Space>
                    }
                  />
                </List.Item>
              )}
            />
          ) : (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <Text type="secondary" style={{ fontSize: '16px' }}>
                😅 没有找到相关视频，请尝试其他关键词
              </Text>
            </div>
          )}
        </Card>
      )}

      {/* 导出Modal */}
      <ExportModal
        visible={exportModalVisible}
        onCancel={() => setExportModalVisible(false)}
        query={searchQuery}
      />
    </div>
  );
};

export default YouTubeSearch;
