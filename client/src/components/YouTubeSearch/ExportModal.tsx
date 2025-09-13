import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  Form,
  Select,
  Button,
  Table,
  Space,
  Typography,
  Tag,
  message,
  Divider,
  Progress,
  Spin,
  Alert,
} from 'antd';
import { ExportOutlined, EyeOutlined, StopOutlined, MailOutlined } from '@ant-design/icons';
import { exportToExcel } from '@/utils/excel';
import { ChannelWithEmails, UserDetailResponse, UserDetailTaskResponse } from '@/types';
import { useStartUserDetails, usePollUserDetails, useStopUserDetails } from '@/services/api';
import { formatNumber } from '@/utils';

const { Text, Title } = Typography;

interface ExportModalProps {
  visible: boolean;
  onCancel: () => void;
  query: string;
}

interface ExportFormData {
  includeEmail: string;
  exportCount: number;
}

const ExportModal: React.FC<ExportModalProps> = ({
  visible,
  onCancel,
  query,
}) => {
  const [form] = Form.useForm<ExportFormData>();
  const [exporting, setExporting] = useState(false);
  const [taskData, setTaskData] = useState<UserDetailResponse | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  
  const { runAsync: startUserDetail, loading: startingTask } = useStartUserDetails();
  const { runAsync: pollUserDetail, loading: pollingTask } = usePollUserDetails();
  const { runAsync: stopUserDetail, loading: stoppingTask } = useStopUserDetails();


  // 清理轮询定时器
  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, []);

  // 当Modal关闭时，停止轮询和清理状态
  useEffect(() => {
    if (!visible) {
      setIsPolling(false);
      setTaskData(null);
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    }
  }, [visible]);

  // 开始轮询
  const startPolling = (taskId: string) => {
    setIsPolling(true);
    
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
    }
    
    pollingRef.current = setInterval(async () => {
      try {
        const result = await pollUserDetail(taskId);
        console.log(result)
        if (result) {
          setTaskData(result);
        }
        
        if (result && (result.status === 'completed' || result.status === 'error' || result.status === 'stopped')) {
          setIsPolling(false);
          if (pollingRef.current) {
            clearInterval(pollingRef.current);
          }
        }
      } catch (error) {
        console.error('轮询失败:', error);
        setIsPolling(false);
        if (pollingRef.current) {
          clearInterval(pollingRef.current);
        }
      }
    }, 2000); // 每2秒轮询一次
  };

  // 停止任务
  const handleStopTask = async () => {
    if (!taskData?.taskId) return;
    
    try {
      await stopUserDetail(taskData.taskId);
      setIsPolling(false);
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
      // 获取最新的任务状态
      const result = await pollUserDetail(taskData.taskId);
      if (result) {
        setTaskData(result);
      }
    } catch (error) {
      console.error('停止任务失败:', error);
    }
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
      title: '频道名称',
      dataIndex: 'title',
      key: 'title',
      width: 200,
      ellipsis: true,
      render: (text: string) => (
        <Text strong style={{ fontSize: '14px' }}>{text}</Text>
      ),
    },
    {
      title: '国家',
      dataIndex: 'country',
      key: 'country',
      width: 100,
      render: (country: string) => country || '无',
    },
    {
      title: '自定义URL',
      dataIndex: 'customUrl',
      key: 'customUrl',
      width: 150,
      ellipsis: true,
      render: (url: string) => url ? (
        <Text code>{url}</Text>
      ) : (
        <Text type="secondary">无</Text>
      ),
    },
    {
      title: '订阅数',
      dataIndex: 'subscribers',
      key: 'subscribers',
      width: 100,
      align: 'right' as const,
      render: (count: string) => (
        <Text strong>👥 {formatNumber(count)}</Text>
      ),
    },
    {
      title: '统计数据',
      key: 'stats',
      width: 200,
      render: (record: ChannelWithEmails) => (
        <Space wrap size="small">
          <Tag icon={<EyeOutlined />} color="blue" style={{ margin: '2px' }}>
            {formatNumber(record.views)} 观看
          </Tag>
          <Tag color="green" style={{ margin: '2px' }}>
            {formatNumber(record.videos)} 视频
          </Tag>
        </Space>
      ),
    },
    {
      title: '联系邮箱',
      dataIndex: 'emails',
      key: 'emails',
      width: 250,
      render: (emails: string[]) => (
        <Space direction="vertical" size="small">
          {emails && emails.length > 0 ? (
            emails.map((email, idx) => (
              <Tag key={idx} icon={<MailOutlined />} color="success" style={{ margin: '2px 4px 2px 0' }}>
                {email}
              </Tag>
            ))
          ) : (
            <Text type="secondary">无邮箱信息</Text>
          )}
        </Space>
      ),
    },
    {
      title: '频道描述',
      dataIndex: 'description',
      key: 'description',
      width: 300,
      ellipsis: true,
      render: (description: string) => (
        <Text style={{ fontSize: '12px' }}>
          {description || '无描述信息'}
        </Text>
      ),
    },
  ];

  // 执行导出
  const handleExport = async () => {
    if (!taskData || !taskData.results.length) {
      message.warning('没有数据可以导出');
      return;
    }
    
    setExporting(true);
    try {
      // 将ChannelWithEmails数据转换为适合Excel导出的格式
      const exportData = taskData.results.map((channel) => ({
        title: channel.title,
        email: channel.emails, // 保持数组格式
        subscriberCount: channel.subscribers,
        viewCount: channel.views,
        videoCount: channel.videos,
        customUrl: channel.customUrl || '',
        keywords: channel.keywords || '',
        description: channel.description,
        country: channel.country || '',
      }));

      console.log('Export data:', exportData); // 调试用
      const fileName = exportToExcel(exportData as any);
      message.success(`成功导出 ${taskData.results.length} 条记录到 ${fileName}`);
    } catch (error) {
      console.error('Export error:', error);
      message.error('导出失败：' + (error as Error).message);
    } finally {
      setExporting(false);
    }
  };

  // 提交表单，开始任务
  const onFinish = async (values: ExportFormData) => {
    try {
      const result = await startUserDetail(query, values.includeEmail, values.exportCount);
      if (result) {
        setTaskData(result);
        
        if (result.taskId) {
          startPolling(result.taskId);
        }
      }
    } catch (error) {
      message.error('启动任务失败');
    }
  };

  // 获取任务状态显示
  const getStatusDisplay = () => {
    if (!taskData) return null;
    
    const statusConfig = {
      started: { color: 'processing', text: '任务启动中...' },
      running: { color: 'processing', text: '正在获取数据...' },
      completed: { color: 'success', text: '任务完成' },
      stopped: { color: 'warning', text: '任务已停止' },
      error: { color: 'error', text: '任务失败' },
    };
    
    const config = statusConfig[taskData.status] || { color: 'default', text: '未知状态' };
    
    return (
      <Alert
        message={
          <Space>
            <Text>{config.text}</Text>
            {taskData.error && <Text type="danger">错误: {taskData.error}</Text>}
          </Space>
        }
        type={config.color === 'error' ? 'error' : 'info'}
        showIcon
        style={{ marginBottom: 16 }}
      />
    );
  };

  return (
    <Modal
      title={
        <Title level={4} style={{ margin: 0 }}>
          🎯 高级数据获取与导出
        </Title>
      }
      open={visible}
      onCancel={onCancel}
      width={1200}
      style={{ top: 20 }}
      footer={
        <Space>
          <Button onClick={onCancel}>关闭</Button>
          {taskData && (taskData.status === 'running' || taskData.status === 'started') && (
            <Button 
              danger 
              icon={<StopOutlined />}
              onClick={handleStopTask}
              loading={stoppingTask}
            >
              停止任务
            </Button>
          )}
          <Button
            type="primary"
            icon={<ExportOutlined />}
            onClick={handleExport}
            loading={exporting}
            disabled={!taskData || !taskData.results.length}
          >
            导出Excel ({taskData?.results.length || 0} 条)
          </Button>
        </Space>
      }
    >
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* 搜索表单 */}
        <Form
          form={form}
          layout="inline"
          onFinish={onFinish}
          initialValues={{
            includeEmail: '1',
            exportCount: 50,
          }}
        >
          <Form.Item label="搜索关键词">
            <Text strong>{query}</Text>
          </Form.Item>
          
          <Form.Item label="筛选条件" name="includeEmail">
            <Select style={{ width: 150 }}>
              <Select.Option value="1">仅包含邮箱的频道</Select.Option>
              <Select.Option value="2">包含所有频道</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item label="获取数量" name="exportCount">
            <Select style={{ width: 120 }}>
              <Select.Option value={1}>1 条</Select.Option>
              <Select.Option value={10}>10 条</Select.Option>
              <Select.Option value={50}>50 条</Select.Option>
              <Select.Option value={100}>100 条</Select.Option>
              <Select.Option value={500}>500 条</Select.Option>
              <Select.Option value={1000}>1000 条</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item>
            <Button 
              type="primary" 
              htmlType="submit"
              loading={startingTask}
              disabled={isPolling}
            >
              {isPolling ? '获取中...' : '🚀 开始获取'}
            </Button>
          </Form.Item>
        </Form>

        <Divider style={{ margin: '16px 0' }} />

        {/* 任务状态显示 */}
        {getStatusDisplay()}

        {/* 进度条 */}
        {taskData && (taskData.status === 'running' || taskData.status === 'started' || taskData.status === 'completed' || taskData.status === 'error') && (
          <div>
            <div style={{ marginBottom: 8 }}>
              <Space>
                <Text>进度:</Text>
                <Text strong>{taskData.progress}%</Text>
                <Text type="secondary">
                  ({taskData.currentCount}/{taskData.currentCount + (taskData.progress < 100 ? 1 : 0)} 已获取)
                </Text>
              </Space>
            </div>
            <Progress 
              percent={taskData.progress} 
              status={
                taskData.status === 'error' ? 'exception' : 
                taskData.status === 'completed' ? 'success' : 'active'
              }
              strokeColor={{
                '0%': '#108ee9',
                '100%': '#87d068',
              }}
            />
          </div>
        )}

        {/* 统计信息 */}
        {taskData && (
          <div>
            <Space size="large">
              <Text>
                <Text strong>已找到频道：</Text>
                <Text type="success">{taskData.totalFound} 个</Text>
              </Text>
              <Text>
                <Text strong>当前获取：</Text>
                <span style={{ color: '#1677ff' }}>{taskData.currentCount} 个</span>
              </Text>
              {taskData.status === 'completed' && (
                <Text>
                  <Text strong>完成状态：</Text>
                  <Text type="success">✅ 任务完成</Text>
                </Text>
              )}
            </Space>
          </div>
        )}

        {/* 数据表格 */}
        <div>
          <Text strong style={{ marginBottom: 8, display: 'block' }}>
            频道数据列表：
          </Text>
          
          {(isPolling || pollingTask) && !taskData?.results.length ? (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <Spin size="large" />
              <div style={{ marginTop: 16 }}>
                <Text>正在获取频道数据，请稍候...</Text>
              </div>
            </div>
          ) : (
            <Table
              columns={columns}
              dataSource={taskData?.results || []}
              size="small"
              scroll={{ x: 'max-content', y: 400 }}
              pagination={{
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total, range) => 
                  `第 ${range[0]}-${range[1]} 条，共 ${total} 条`,
                pageSizeOptions: ['10', '20', '50'],
                defaultPageSize: 10,
              }}
              rowKey="channelId"
              loading={pollingTask}
            />
          )}
        </div>
      </Space>
    </Modal>
  );
};

export default ExportModal;
