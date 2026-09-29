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
  const pollTimerRef = useRef(null);
  const isComponentMountedRef = useRef(true);

  // Active REST polling for Vercel / serverless deployments
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

  const startHttpPolling = () => {
    setConnectionStatus('CONNECTED');
    fetchWatchlistSnapshot();
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    pollTimerRef.current = setInterval(() => {
      if (isComponentMountedRef.current) {
        fetchWatchlistSnapshot();
      }
    }, 3000);
  };

  const connectWebSocket = () => {
    if (!isComponentMountedRef.current) return;

    const customWsUrl = import.meta.env.VITE_WS_URL;
    const isVercel = window.location.hostname.includes('vercel.app');
    const isHttps = window.location.protocol === 'https:';

    // On Vercel / HTTPS without custom WS server, use HTTP polling (Vercel serverless functions do not support persistent WebSockets)
    if ((isVercel || isHttps) && !customWsUrl) {
      startHttpPolling();
      return;
    }

    if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const protocol = isHttps ? 'wss:' : 'ws:';
    const host = window.location.hostname || 'localhost';
    const wsUrl = customWsUrl || `${protocol}//${host}:5000`;

    setConnectionStatus('RECONNECTING');
    let ws;
    try {
      ws = new WebSocket(wsUrl);
      wsRef.current = ws;
    } catch (err) {
      startHttpPolling();
      return;
    }

    ws.onopen = () => {
      if (!isComponentMountedRef.current) {
        ws.close();
        return;
      }
      setConnectionStatus('CONNECTED');
      setLastUpdate(Date.now());
      // Stop REST polling if WS is active
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
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
        // ignore
      }
    };

    ws.onclose = () => {
      if (isComponentMountedRef.current) {
        startHttpPolling();
      }
    };

    ws.onerror = () => {
      try {
        if (ws.readyState === WebSocket.OPEN) {
          ws.close();
        }
      } catch (e) {
        // ignore
      }
      startHttpPolling();
    };
  };

  useEffect(() => {
    isComponentMountedRef.current = true;
    connectWebSocket();

    return () => {
      isComponentMountedRef.current = false;
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);

      if (wsRef.current) {
        const socket = wsRef.current;
        wsRef.current = null;
        if (socket.readyState === WebSocket.OPEN) {
          socket.close();
        } else if (socket.readyState === WebSocket.CONNECTING) {
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
