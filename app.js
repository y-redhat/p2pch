class NetworkFlowVisualizer {
    constructor() {
        this.requests = [];
        this.nodes = new Map();
        this.edges = new Map();
        this.isMonitoring = false;
        this.originalFetch = null;
        this.originalXHR = null;
        this.performanceObserver = null;
        
        // サービス識別用データベース
        this.serviceDatabase = {
            // CDN
            'cloudfront.net': { name: 'AWS CloudFront', type: 'cdn', icon: '🌐' },
            'akamai.net': { name: 'Akamai CDN', type: 'cdn', icon: '🌐' },
            'fastly.net': { name: 'Fastly', type: 'cdn', icon: '🌐' },
            
            // 分析・トラッキング
            'google-analytics.com': { name: 'Google Analytics', type: 'analytics', icon: '📊' },
            'googletagmanager.com': { name: 'Google Tag Manager', type: 'analytics', icon: '🏷️' },
            'doubleclick.net': { name: 'Google Ads', type: 'advertising', icon: '💰' },
            
            // フォント
            'fonts.googleapis.com': { name: 'Google Fonts', type: 'font', icon: '🔤' },
            'fonts.gstatic.com': { name: 'Google Fonts CDN', type: 'font', icon: '🔤' },
            
            // 動画・メディア
            'youtube.com': { name: 'YouTube', type: 'media', icon: '🎬' },
            'youtu.be': { name: 'YouTube', type: 'media', icon: '🎬' },
            'vimeo.com': { name: 'Vimeo', type: 'media', icon: '🎥' },
            
            // ソーシャル
            'twitter.com': { name: 'Twitter', type: 'social', icon: '🐦' },
            'facebook.com': { name: 'Facebook', type: 'social', icon: '👥' },
            'instagram.com': { name: 'Instagram', type: 'social', icon: '📷' },
            
            // データベース関連（APIエンドポイント）
            'firebaseio.com': { name: 'Firebase Database', type: 'database', icon: '🗄️' },
            'supabase.co': { name: 'Supabase', type: 'database', icon: '🗄️' },
            'mongodb': { name: 'MongoDB', type: 'database', icon: '🗄️' },
            
            // APIサービス
            'api.': { name: 'API Endpoint', type: 'api', icon: '🔌' },
            'graphql': { name: 'GraphQL API', type: 'api', icon: '🔌' },
            
            // クラウドサービス
            'aws.amazon.com': { name: 'AWS', type: 'cloud', icon: '☁️' },
            'azure.com': { name: 'Microsoft Azure', type: 'cloud', icon: '☁️' },
            
            // セキュリティ・認証
            'auth0.com': { name: 'Auth0', type: 'auth', icon: '🔐' },
            'okta.com': { name: 'Okta', type: 'auth', icon: '🔐' },
            
            // デフォルト
            'default': { name: 'Web Server', type: 'server', icon: '🖥️' }
        };
        
        // データベースポート識別
        this.databasePorts = {
            '3306': 'MySQL',
            '5432': 'PostgreSQL',
            '1433': 'Microsoft SQL Server',
            '1521': 'Oracle',
            '27017': 'MongoDB',
            '6379': 'Redis'
        };
        
        this.init();
    }
    
    init() {
        // ネットワーク可視化の初期化
        this.container = document.getElementById('network');
        this.networkData = {
            nodes: new vis.DataSet([]),
            edges: new vis.DataSet([])
        };
        
        this.networkOptions = {
            nodes: {
                shape: 'dot',
                size: 20,
                font: {
                    size: 14,
                    color: '#333'
                },
                borderWidth: 2
            },
            edges: {
                width: 2,
                smooth: true,
                arrows: {
                    to: { enabled: true, scaleFactor: 0.5 }
                }
            },
            physics: {
                enabled: true,
                stabilization: true,
                barnesHut: {
                    gravitationalConstant: -2000,
                    centralGravity: 0.3
                }
            },
            interaction: {
                hover: true,
                tooltipDelay: 200
            }
        };
        
        this.network = new vis.Network(this.container, this.networkData, this.networkOptions);
        
        // 初期表示ノード（ユーザーのPC）
        this.addNode('user-pc', 'あなたのPC', 'client', '#4CAF50');
        
        this.updateStats();
    }
    
    async startMonitoring() {
        if (this.isMonitoring) return;
        
        this.isMonitoring = true;
        document.getElementById('status').textContent = '監視中...';
        document.getElementById('status').style.background = '#fbd38d';
        document.getElementById('status').style.color = '#744210';
        
        // Performance APIによるリソース監視
        this.setupPerformanceObserver();
        
        // Fetch API をインターセプト
        this.interceptFetch();
        
        // XMLHttpRequest をインターセプト
        this.interceptXHR();
        
        // 既存のリソースを分析
        this.analyzeExistingResources();
        
        console.log('ネットワーク監視を開始しました');
    }
    
    stopMonitoring() {
        this.isMonitoring = false;
        document.getElementById('status').textContent = '停止中';
        document.getElementById('status').style.background = '#fed7d7';
        document.getElementById('status').style.color = '#742a2a';
        
        if (this.performanceObserver) {
            this.performanceObserver.disconnect();
        }
        
        console.log('ネットワーク監視を停止しました');
    }
    
    setupPerformanceObserver() {
        if (!window.PerformanceObserver) return;
        
        this.performanceObserver = new PerformanceObserver((list) => {
            list.getEntries().forEach(entry => {
                this.processResourceEntry(entry);
            });
        });
        
        this.performanceObserver.observe({ entryTypes: ['resource'] });
    }
    
    interceptFetch() {
        this.originalFetch = window.fetch;
        
        window.fetch = async (...args) => {
            const startTime = performance.now();
            const url = args[0];
            const options = args[1] || {};
            
            try {
                const response = await this.originalFetch.apply(this, args);
                const endTime = performance.now();
                
                this.logRequest({
                    url: url.toString(),
                    method: options.method || 'GET',
                    type: 'fetch',
                    duration: endTime - startTime,
                    status: response.status,
                    timestamp: new Date().toISOString()
                });
                
                return response;
            } catch (error) {
                this.logRequest({
                    url: url.toString(),
                    method: options.method || 'GET',
                    type: 'fetch',
                    duration: performance.now() - startTime,
                    status: 0,
                    error: error.message,
                    timestamp: new Date().toISOString()
                });
                throw error;
            }
        };
    }
    
    interceptXHR() {
        this.originalXHR = window.XMLHttpRequest;
        
        window.XMLHttpRequest = function() {
            const xhr = new this.originalXHR();
            const startTime = performance.now();
            
            let method, url;
            
            const originalOpen = xhr.open;
            const originalSend = xhr.send;
            
            xhr.open = function(...args) {
                method = args[0];
                url = args[1];
                return originalOpen.apply(this, args);
            };
            
            xhr.send = function(body) {
                xhr.addEventListener('load', function() {
                    const duration = performance.now() - startTime;
                    this.logRequest({
                        url: url,
                        method: method,
                        type: 'xhr',
                        duration: duration,
                        status: this.status,
                        timestamp: new Date().toISOString()
                    });
                }.bind(xhr));
                
                xhr.addEventListener('error', function() {
                    this.logRequest({
                        url: url,
                        method: method,
                        type: 'xhr',
                        duration: performance.now() - startTime,
                        status: 0,
                        error: 'Request failed',
                        timestamp: new Date().toISOString()
                    });
                }.bind(xhr));
                
                return originalSend.call(this, body);
            };
            
            return xhr;
        }.bind(this);
    }
    
    analyzeExistingResources() {
        // 既に読み込まれたリソースを分析
        const resources = performance.getEntriesByType('resource');
        resources.forEach(entry => {
            this.processResourceEntry(entry);
        });
    }
    
    processResourceEntry(entry) {
        if (!this.isMonitoring) return;
        
        try {
            const url = new URL(entry.name);
            const hostname = url.hostname;
            const serviceInfo = this.identifyService(hostname, url);
            
            this.logRequest({
                url: entry.name,
                method: 'GET',
                type: entry.initiatorType,
                duration: entry.duration,
                size: entry.transferSize,
                hostname: hostname,
                service: serviceInfo,
                timestamp: new Date().toISOString()
            });
        } catch (e) {
            // URL解析できない場合は無視
        }
    }
    
    identifyService(hostname, url) {
        // ホスト名ベースの識別
        for (const [key, service] of Object.entries(this.serviceDatabase)) {
            if (hostname.includes(key)) {
                return { ...service, detectedBy: 'domain' };
            }
        }
        
        // ポート番号ベースの識別（データベース）
        if (url.port && this.databasePorts[url.port]) {
            return {
                name: this.databasePorts[url.port],
                type: 'database',
                icon: '🗄️',
                detectedBy: 'port'
            };
        }
        
        // パスベースの識別
        const path = url.pathname.toLowerCase();
        if (path.includes('/api/') || path.includes('/graphql')) {
            return {
                name: 'API Server',
                type: 'api',
                icon: '🔌',
                detectedBy: 'path'
            };
        }
        
        // デフォルト
        return { ...this.serviceDatabase.default, detectedBy: 'default' };
    }
    
    logRequest(request) {
        if (!this.isMonitoring) return;
        
        this.requests.push(request);
        
        try {
            const url = new URL(request.url);
            const hostname = url.hostname;
            
            // ノードを追加
            const serviceInfo = request.service || this.identifyService(hostname, url);
            const nodeId = `server-${hostname}`;
            
            let nodeColor = '#2196F3'; // デフォルト: 青
            
            switch(serviceInfo.type) {
                case 'database':
                    nodeColor = '#FF9800'; // オレンジ
                    break;
                case 'cdn':
                    nodeColor = '#9C27B0'; // 紫
                    break;
                case 'analytics':
                    nodeColor = '#F44336'; // 赤
                    break;
                case 'auth':
                    nodeColor = '#4CAF50'; // 緑
                    break;
                case 'api':
                    nodeColor = '#00BCD4'; // 水色
                    break;
            }
            
            this.addNode(nodeId, `${serviceInfo.icon} ${serviceInfo.name}`, serviceInfo.type, nodeColor, hostname);
            
            // エッジを追加
            const edgeId = `edge-${Date.now()}-${Math.random()}`;
            this.addEdge('user-pc', nodeId, request.method, request.duration);
            
            // 統計情報を更新
            this.updateStats();
            this.updateConnectionTable();
            this.updateDomainList();
            
        } catch (e) {
            console.error('Request logging error:', e);
        }
    }
    
    addNode(id, label, type, color, hostname = '') {
        if (!this.nodes.has(id)) {
            this.nodes.set(id, {
                id: id,
                label: label,
                title: hostname || label,
                group: type,
                color: {
                    background: color,
                    border: '#2c3e50',
                    highlight: {
                        background: color,
                        border: '#2c3e50'
                    }
                },
                shape: 'dot',
                size: 25
            });
            
            this.networkData.nodes.add(this.nodes.get(id));
        }
    }
    
    addEdge(from, to, label, duration) {
        const edgeId = `${from}-${to}`;
        const count = this.edges.has(edgeId) ? this.edges.get(edgeId).count + 1 : 1;
        
        this.edges.set(edgeId, {
            id: edgeId,
            from: from,
            to: to,
            label: `${label} (${count})`,
            title: `応答時間: ${duration.toFixed(2)}ms`,
            width: Math.min(3 + count, 8),
            color: {
                color: '#666',
                highlight: '#2196F3'
            },
            count: count,
            lastDuration: duration,
            totalDuration: (this.edges.get(edgeId)?.totalDuration || 0) + duration
        });
        
        this.networkData.edges.clear();
        this.networkData.edges.add(Array.from(this.edges.values()));
    }
    
    updateStats() {
        // ユニークなサーバー数をカウント
        const uniqueServers = new Set();
        this.nodes.forEach((node, id) => {
            if (id !== 'user-pc') uniqueServers.add(id);
        });
        
        // サービスタイプをカウント
        const serviceTypes = new Set();
        this.nodes.forEach(node => {
            if (node.group) serviceTypes.add(node.group);
        });
        
        // データ転送量の計算（概算）
        const totalSize = this.requests.reduce((sum, req) => sum + (req.size || 0), 0);
        
        // DOMを更新
        document.getElementById('serverCount').textContent = uniqueServers.size;
        document.getElementById('requestCount').textContent = this.requests.length;
        document.getElementById('serviceCount').textContent = serviceTypes.size;
        document.getElementById('dataVolume').textContent = `${(totalSize / 1024).toFixed(1)} KB`;
    }
    
    updateConnectionTable() {
        const tbody = document.getElementById('connectionBody');
        tbody.innerHTML = '';
        
        // ホスト名ごとに集計
        const hostStats = new Map();
        
        this.requests.forEach(req => {
            try {
                const url = new URL(req.url);
                const hostname = url.hostname;
                
                if (!hostStats.has(hostname)) {
                    const serviceInfo = this.identifyService(hostname, url);
                    hostStats.set(hostname, {
                        hostname: hostname,
                        service: serviceInfo,
                        count: 0,
                        totalDuration: 0,
                        totalSize: 0,
                        types: new Set()
                    });
                }
                
                const stat = hostStats.get(hostname);
                stat.count++;
                stat.totalDuration += req.duration || 0;
                stat.totalSize += req.size || 0;
                stat.types.add(req.type || 'unknown');
            } catch (e) {
                // 無視
            }
        });
        
        // テーブルに行を追加
        Array.from(hostStats.values())
            .sort((a, b) => b.count - a.count)
            .forEach(stat => {
                const row = document.createElement('tr');
                
                row.innerHTML = `
                    <td>
                        <span style="font-size: 1.2em;">${stat.service.icon}</span>
                        ${stat.service.name}
                    </td>
                    <td>${stat.hostname}</td>
                    <td>${stat.count}</td>
                    <td>${(stat.totalDuration / stat.count).toFixed(2)}ms</td>
                    <td>${(stat.totalSize / 1024).toFixed(1)} KB</td>
                    <td>${Array.from(stat.types).join(', ')}</td>
                `;
                
                tbody.appendChild(row);
            });
    }
    
    updateDomainList() {
        const domainList = document.getElementById('domainList');
        const domains = new Set();
        
        this.requests.forEach(req => {
            try {
                const url = new URL(req.url);
                domains.add(url.hostname);
            } catch (e) {
                // 無視
            }
        });
        
        domainList.innerHTML = Array.from(domains)
            .map(domain => `<span class="domain-badge">${domain}</span>`)
            .join('');
    }
    
    exportData() {
        const data = {
            timestamp: new Date().toISOString(),
            requests: this.requests,
            nodes: Array.from(this.nodes.values()),
            edges: Array.from(this.edges.values())
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `network-flow-${new Date().toISOString().slice(0, 19)}.json`;
        a.click();
        
        URL.revokeObjectURL(url);
    }
    
    clearData() {
        if (confirm('すべてのデータをクリアしますか？')) {
            this.requests = [];
            this.nodes.clear();
            this.edges.clear();
            this.networkData.nodes.clear();
            this.networkData.edges.clear();
            
            // ユーザーPCノードのみ再追加
            this.addNode('user-pc', 'あなたのPC', 'client', '#4CAF50');
            
            this.updateStats();
            this.updateConnectionTable();
            this.updateDomainList();
            
            console.log('データをクリアしました');
        }
    }
}

// グローバルインスタンスの作成
let visualizer;

// ページ読み込み時に初期化
window.addEventListener('DOMContentLoaded', () => {
    visualizer = new NetworkFlowVisualizer();
    
    // 5秒後に自動監視を開始（オプション）
    setTimeout(() => {
        visualizer.startMonitoring();
    }, 1000);
});

// グローバル関数
function startMonitoring() {
    if (visualizer) visualizer.startMonitoring();
}

function stopMonitoring() {
    if (visualizer) visualizer.stopMonitoring();
}

function exportData() {
    if (visualizer) visualizer.exportData();
}

function clearData() {
    if (visualizer) visualizer.clearData();
}
