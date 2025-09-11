import React, { useState, useMemo } from 'react';
import {
  Modal,
  Form,
  Radio,
  Select,
  Button,
  Table,
  Space,
  Typography,
  Tag,
  message,
  Divider,
} from 'antd';
import { ExportOutlined, EyeOutlined, LikeOutlined, MessageOutlined } from '@ant-design/icons';
import { exportToExcel } from '@/utils/excel';
import { VideoData } from '@/types';

const { Text } = Typography;

interface ExportModalProps {
  visible: boolean;
  onCancel: () => void;
  videoList: VideoData[];
}

interface ExportFormData {
  includeEmail: boolean;
  exportCount: number;
}

const ExportModal: React.FC<ExportModalProps> = ({
  visible,
  onCancel,
  videoList,
}) => {
  const [form] = Form.useForm<ExportFormData>();
  const [includeEmail, setIncludeEmail] = useState<boolean>(true);
  const [exportCount, setExportCount] = useState<number>(10);
  const [exporting, setExporting] = useState(false);

  // 根据选择条件过滤数据
  const filteredData = useMemo(() => {
    let data = [...videoList];
    
    // 如果选择只包含有邮箱的数据，这里需要根据实际数据结构过滤
    // 由于当前VideoData没有email字段，这里先保持所有数据
    if (includeEmail) {
      // TODO: 如果有邮箱字段，在这里进行过滤
      // data = data.filter(item => item.email && item.email.length > 0);
    }
    
    // 按选择的数量限制
    return data.slice(0, exportCount);
  }, [videoList, includeEmail, exportCount]);

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

  // 表格列定义
  const columns = [
    {
      title: '序号',
      key: 'index',
      width: 60,
      render: (_: any, __: any, index: number) => index + 1,
      align: 'center' as const,
    },
    {
      title: '视频标题',
      dataIndex: 'title',
      key: 'title',
      width: 250,
      ellipsis: true,
      render: (text: string) => (
        <Text strong style={{ fontSize: '14px' }}>{text}</Text>
      ),
    },
    {
      title: '频道名称',
      dataIndex: 'channelTitle',
      key: 'channelTitle',
      width: 150,
      ellipsis: true,
      render: (text: string) => (
        <Text type="secondary">{text}</Text>
      ),
    },
    {
      title: '发布时间',
      dataIndex: 'publishedAt',
      key: 'publishedAt',
      width: 120,
      render: (date: string) => formatDate(date),
      align: 'center' as const,
    },
    {
      title: '统计数据',
      key: 'stats',
      width: 200,
      render: (record: VideoData) => (
        <Space wrap size="small">
          <Tag icon={<EyeOutlined />} color="blue" style={{ margin: '2px' }}>
            {formatNumber(record.viewCount)}
          </Tag>
          <Tag icon={<LikeOutlined />} color="red" style={{ margin: '2px' }}>
            {formatNumber(record.likeCount)}
          </Tag>
          <Tag icon={<MessageOutlined />} color="green" style={{ margin: '2px' }}>
            {formatNumber(record.commentCount)}
          </Tag>
        </Space>
      ),
    },
    // 预留邮箱列，如果有邮箱数据的话
    ...(includeEmail ? [{
      title: '联系邮箱',
      key: 'email',
      width: 200,
      render: () => (
        <Text type="secondary">暂无邮箱信息</Text>
      ),
    }] : []),
  ];

  // 执行导出
  const handleExport = async () => {
    setExporting(true);
    try {
      const exportData = filteredData.map((video, index) => ({
        序号: index + 1,
        视频标题: video.title,
        频道名称: video.channelTitle,
        频道ID: video.channelId,
        发布时间: formatDate(video.publishedAt),
        观看数: video.viewCount,
        点赞数: video.likeCount,
        评论数: video.commentCount,
        视频链接: video.videoUrl,
        描述: video.description,
        ...(includeEmail ? { 联系邮箱: '暂无' } : {}),
      }));

      const fileName = exportToExcel(exportData as any);
      message.success(`成功导出 ${filteredData.length} 条记录到 ${fileName}`);
      onCancel(); // 导出成功后关闭弹窗
    } catch (error) {
      message.error('导出失败：' + (error as Error).message);
    } finally {
      setExporting(false);
    }
  };

  const handleFormChange = (changedValues: any) => {
    if ('includeEmail' in changedValues) {
      setIncludeEmail(changedValues.includeEmail);
    }
    if ('exportCount' in changedValues) {
      setExportCount(changedValues.exportCount);
    }
  };

  return (
    <Modal
      title="导出设置"
      open={visible}
      onCancel={onCancel}
      width={1000}
      style={{ top: 20 }}
      footer={
        <Space>
          <Button onClick={onCancel}>取消</Button>
          <Button
            type="primary"
            icon={<ExportOutlined />}
            onClick={handleExport}
            loading={exporting}
            disabled={filteredData.length === 0}
          >
            导出 Excel ({filteredData.length} 条)
          </Button>
        </Space>
      }
    >
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* 导出选项 */}
        <Form
          form={form}
          layout="inline"
          onValuesChange={handleFormChange}
          initialValues={{
            includeEmail: true,
            exportCount: 10,
          }}
        >
          <Form.Item label="筛选条件" name="includeEmail">
            <Select
              style={{ width: 120 }}
            >
              <Select.Option value={true}>包含邮箱</Select.Option>
              <Select.Option value={false}>不包含邮箱</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item label="导出数量" name="exportCount">
            <Select style={{ width: 120 }}>
              <Select.Option value={10}>10 条</Select.Option>
              <Select.Option value={100}>100 条</Select.Option>
              <Select.Option value={1000}>1000 条</Select.Option>
              <Select.Option value={5000}>5000 条</Select.Option>
            </Select>
          </Form.Item>
        </Form>

        <Divider style={{ margin: '16px 0' }} />

        {/* 统计信息 */}
        <Space>
          <Text>
            <Text strong>总数据量：</Text>{videoList.length} 条
          </Text>
          <Text>
            <Text strong>将导出：</Text>
            <Text type={filteredData.length > 0 ? 'success' : 'warning'}>
              {filteredData.length} 条
            </Text>
          </Text>
          {includeEmail && (
            <Text type="secondary">
              （当前暂无邮箱数据，后续会补充此功能）
            </Text>
          )}
        </Space>

        {/* 预览表格 */}
        <div>
          <Text strong style={{ marginBottom: 8, display: 'block' }}>
            导出数据预览：
          </Text>
          <Table
            columns={columns}
            dataSource={filteredData}
            size="small"
            scroll={{ x: 'max-content', y: 400 }}
            pagination={{
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) => 
                `第 ${range[0]}-${range[1]} 条，共 ${total} 条`,
              pageSizeOptions: ['5', '10', '20'],
              defaultPageSize: 10,
              hideOnSinglePage: true,
            }}
            rowKey="key"
          />
        </div>
      </Space>
    </Modal>
  );
};

export default ExportModal;
