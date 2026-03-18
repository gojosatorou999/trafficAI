import { useState, useEffect, useRef } from 'react';

export default function useAlerts() {
  const [alerts, setAlerts] = useState([]);
  const [wsConnected, setWsConnected] = useState(false);
  const ws = useRef(null);

  useEffect(() => {
    // Connect to WebSocket
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = import.meta.env.VITE_API_URL 
      ? import.meta.env.VITE_API_URL.replace(/^http(s?):\/\//, '')
      : 'localhost:8000';
    
    const wsUrl = `${protocol}//${host}/ws/alerts`;
    
    const connect = () => {
      ws.current = new WebSocket(wsUrl);
      
      ws.current.onopen = () => {
        setWsConnected(true);
        console.log('WebSocket connected');
      };
      
      ws.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setAlerts(prev => [...prev, data].slice(-50)); // Keep last 50
        } catch (e) {
          console.error('Failed to parse WS message', e);
        }
      };
      
      ws.current.onclose = () => {
        setWsConnected(false);
        // Reconnect after 3 seconds
        setTimeout(connect, 3000);
      };
    };

    connect();

    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, []);

  return { alerts, wsConnected };
}
