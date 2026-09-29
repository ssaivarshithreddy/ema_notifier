import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import axios from 'axios';

const RealtimeContext = createContext(null);

export function RealtimeProvider({ children }) {
  const [connectionStatus, setConnectionStatus] = useState('DISCONNECTED');
  const [instrumentsMap, setInstrumentsMap] = useState({});
  const [recentAlerts, setRecentAlerts] = useState([]);
  const [lastUpdate, setLastUpdate] = useState(Date.now());
  const wsRef = useRef(null);
  const reconnectTimerRef = useRef(null);
  const isComponentMountedRef = useRef(true);

  // Fallback REST polling if WebSocket is disconnected
  const fetchWatchlistSnapshot = async () => {
    try {
      const resp = await axios.get('/api/watchlist');
      if (resp.data && resp.data.success && Array.isArray(resp.data.data)) {
        const map = {};
        resp.data.data.forEach(inst => {
          map[inst.symbol] = inst;
        });
        setInstrumentsMap(prev => ({ ...prev, ...map }));
        setLastUpdate(Date.now());
      }
    } catch (e) {
      // ignore
    }
  };

  const connectWebSocket = () => {
    if (!isComponentMountedRef.current) return;
    if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname || 'localhost';
    const wsUrl = import.meta.env.VITE_WS_URL || `${protocol}//${host}:5000`;

    setConnectionStatus('RECONNECTING');
    let ws;
    try {
      ws = new WebSocket(wsUrl);
      wsRef.current = ws;
    } catch (err) {
      scheduleReconnect();
      return;
    }

    ws.onopen = () => {
      if (!isComponentMountedRef.current) {
        ws.close();
        return;
      }
      setConnectionStatus('CONNECTED');
      setLastUpdate(Date.now());
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setLastUpdate(Date.now());

        if (data.type === 'CONNECTION_STATUS') {
          if (Array.isArray(data.instruments)) {
            const map = {};
            data.instruments.forEach(inst => {
              map[inst.symbol] = inst;
            });
            setInstrumentsMap(map);
          }
        } else if (data.type === 'PRICE_UPDATE') {
          setInstrumentsMap(prev => ({
            ...prev,
            [data.symbol]: {
              ...(prev[data.symbol] || {}),
              symbol: data.symbol,
              price: data.price,
              ema200: data.ema200,
              distance: data.distance,
              direction: data.direction,
              status: data.status,
              lastUpdate: data.timestamp
            }
          }));
        } else if (data.type === 'ALERT_CREATED') {
          if (data.alert) {
            setRecentAlerts(prev => [data.alert, ...prev].slice(0, 50));
          }
        }
      } catch (err) {
        // ignore parse error
      }
    };

    ws.onclose = () => {
      if (isComponentMountedRef.current) {
        setConnectionStatus('DISCONNECTED');
        fetchWatchlistSnapshot(); // Fallback update
        scheduleReconnect();
      }
    };

    ws.onerror = () => {
      // Gracefully handle connection error without crashing
      try {
        if (ws.readyState === WebSocket.OPEN) {
          ws.close();
        }
      } catch (e) {
        // ignore
      }
    };
  };

  const scheduleReconnect = () => {
    if (!isComponentMountedRef.current) return;
    if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
    reconnectTimerRef.current = setTimeout(() => {
      connectWebSocket();
    }, 3000);
  };

  useEffect(() => {
    isComponentMountedRef.current = true;
    connectWebSocket();

    // Initial snapshot fetch
    fetchWatchlistSnapshot();

    return () => {
      isComponentMountedRef.current = false;
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);

      if (wsRef.current) {
        const socket = wsRef.current;
        wsRef.current = null;
        if (socket.readyState === WebSocket.OPEN) {
          socket.close();
        } else if (socket.readyState === WebSocket.CONNECTING) {
          // Close gracefully after open to avoid StrictMode warning
          socket.onopen = () => {
            try { socket.close(); } catch (e) {}
          };
        }
      }
    };
  }, []);

  return (
    <RealtimeContext.Provider value={{
      connectionStatus,
      instrumentsMap,
      recentAlerts,
      lastUpdate
    }}>
      {children}
    </RealtimeContext.Provider>
  );
}

export function useRealtime() {
  return useContext(RealtimeContext);
}
