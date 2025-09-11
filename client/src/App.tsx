import React from 'react';
import {
  Tabs,
  Typography,
} from 'antd';
import { YoutubeOutlined, InstagramOutlined } from '@ant-design/icons';
import YouTubeSearch from '@/components/YouTubeSearch';
import InstagramSearch from '@/components/InstagramSearch';
import TikTokSearch from '@/components/TikTokSearch';
import './index.css';

const { Title, Paragraph } = Typography;

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

const App: React.FC = () => {
  // Tab配置
  const tabItems = [
    {
      key: 'youtube',
      label: (
        <span>
          <YoutubeOutlined />
          YouTube
        </span>
      ),
      children: <YouTubeSearch />,
    },
    {
      key: 'instagram',
      label: (
        <span>
          <InstagramOutlined />
          Instagram
        </span>
      ),
      children: <InstagramSearch />,
    },
    {
      key: 'tiktok',
      label: (
        <span>
          <TikTokIcon style={{ marginRight: 8 }} />
          TikTok
        </span>
      ),
      children: <TikTokSearch />,
    },
  ];
  
  return (
    <div className="container">
      <div className="header">
        <Title level={1} style={{ color: 'white', textAlign: 'center', marginBottom: 8 }}>
          🎯 社交媒体信息收集工具
        </Title>
        <Paragraph style={{ color: 'white', textAlign: 'center', opacity: 0.9, fontSize: '18px' }}>
          支持 YouTube、Instagram、TikTok 平台的用户信息查询与数据导出
        </Paragraph>
      </div>
      
      <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
        <Tabs
          defaultActiveKey="youtube"
          size="large"
          items={tabItems}
          style={{ minHeight: '500px' }}
        />
      </div>
    </div>
  );
};

export default App;
